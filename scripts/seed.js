// scripts/seed.js
require('dotenv').config();
const { Pool } = require('pg');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const { faker } = require('@faker-js/faker/locale/id_ID'); // Mengimpor Faker dengan lokalisasi Indonesia
const Redis = require('ioredis');
const Review = require('../models/review');

// --- Helper untuk Menginisialisasi Koneksi ---
async function initializeConnections() {
    let pgMainPool, pgAnalyticsPool, redisClient, mongooseConnection;
    try {
        // PG Main
        pgMainPool = new Pool({ host: process.env.PG_HOST, user: process.env.PG_USER, password: process.env.PG_PASSWORD, database: process.env.PG_DB, port: process.env.PG_PORT });
        await pgMainPool.query('SELECT 1');
        
        // PG Analytics
        pgAnalyticsPool = new Pool({ host: process.env.PG_ANALYTICS_HOST, user: process.env.PG_ANALYTICS_USER, password: process.env.PG_ANALYTICS_PASSWORD, database: process.env.PG_ANALYTICS_DB, port: 5433 }); // Perhatikan port 5433
        await pgAnalyticsPool.query('SELECT 1');

        // MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        mongooseConnection = mongoose.connection;

        // Redis
        redisClient = new Redis({ host: process.env.REDIS_HOST, port: process.env.REDIS_PORT });
        await redisClient.ping();

        return { pgMainPool, pgAnalyticsPool, redisClient, mongooseConnection };
    } catch (err) {
        console.error('Full error object from connection attempt:', err);
        if (pgMainPool) pgMainPool.end().catch(() => {});
        if (pgAnalyticsPool) pgAnalyticsPool.end().catch(() => {});
        if (mongoose.connection && mongoose.connection.readyState === 1) mongoose.connection.close().catch(() => {});
        if (redisClient) redisClient.disconnect().catch(() => {});
        throw err;
    }
}

// --- Helper untuk Koneksi dengan Retry Logic ---
async function initializeConnectionsWithRetry(maxRetries = 10, retryDelay = 5000) {
    let connections;
    for (let i = 0; i < maxRetries; i++) {
        try {
            console.log(`Connecting to databases... Attempt ${i + 1} of ${maxRetries}`);
            connections = await initializeConnections();
            console.log('All database connections are ready!');
            return connections;
        } catch (err) {
            console.error(`Connection attempt failed. Retrying in ${retryDelay / 1000} seconds...`);
            if (i === maxRetries - 1) throw err;
            await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
    }
    throw new Error('Failed to establish connections after multiple retries.');
}

// --- Fungsi Seeding Utama ---
async function seedDatabases(numData = 50) {
  let connections;
  try {
    console.log(`Starting database seeding with ${numData} data points using Faker.js (ID Locale)...`);
    connections = await initializeConnectionsWithRetry();
    
    const { pgMainPool, pgAnalyticsPool, redisClient } = connections;

    // --- 4. Hapus data lama untuk memulai dari awal ---
    console.log('Clearing old data from databases...');
    await pgMainPool.query('TRUNCATE content_metadata, trending_daily, content_cast_crew, content_genres, cast_crew, genres CASCADE;');
    await pgAnalyticsPool.query('TRUNCATE users, user_watch_history CASCADE;');
    await Review.deleteMany({});
    await redisClient.flushdb();
    console.log('Old data cleared.');

    // --- 5. Hasilkan data dasar (Konten & Pengguna) ---
    const generatedContent = [];
    const generatedUsers = [];
    console.log(`Generating and inserting ${numData} records...`);
    for (let i = 1; i <= numData; i++) {
      const contentId = uuidv4();
      const userId = uuidv4();
      
      const indoName = faker.person.fullName();
      const indoUserName = faker.internet.userName({ firstName: indoName.split(' ')[0], lastName: indoName.split(' ')[1] });

      generatedContent.push({ id: contentId, title: faker.commerce.productName() });
      generatedUsers.push({ id: userId, username: indoUserName });

      // Insert Content Data ke PostgreSQL Citus (Tabel Sharded)
      await pgMainPool.query(
        'INSERT INTO content_metadata (content_id, title, original_title, release_date, content_type, summary, rating) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [
          contentId,
          faker.commerce.productName(),
          faker.commerce.productName(),
          faker.date.past({ years: 10 }),
          faker.helpers.arrayElement(['movie', 'series', 'documentary']),
          faker.lorem.paragraph(2),
          faker.number.int({ min: 6, max: 10 })
        ]
      );
      
      // Insert User Data ke PostgreSQL Analytics (Tabel FDW)
      await pgAnalyticsPool.query(
        'INSERT INTO users (user_id, username, email) VALUES ($1, $2, $3)',
        [userId, indoUserName, faker.internet.email({ firstName: indoName.split(' ')[0], lastName: indoName.split(' ')[1] })]
      );
    }
    console.log('Base data inserted into PostgreSQL.');

    // --- 6. Hasilkan data relasional (Reviews & Watch History) ---
    const reviewData = [];
    const watchHistoryData = [];
    console.log('Generating related data...');
    for (let i = 0; i < numData * 3; i++) {
      const randomContent = generatedContent[faker.number.int({ min: 0, max: numData - 1 })];
      const randomUser = generatedUsers[faker.number.int({ min: 0, max: numData - 1 })];

      // Review Data untuk MongoDB (Terhubung ke Content & User)
      reviewData.push({
        content_id: randomContent.id,
        user_id: randomUser.id,
        rating: faker.number.int({ min: 1, max: 10 }),
        comment: faker.lorem.sentence(),
      });

      // Watch History Data untuk PostgreSQL Analytics (Terhubung ke User & Content)
      watchHistoryData.push({
        user_id: randomUser.id,
        content_id: randomContent.id,
        duration_watched_seconds: faker.number.int({ min: 60, max: 7200 }),
        last_position_seconds: faker.number.int({ min: 60, max: 7200 }),
      });
    }

    // --- 7. Masukkan data relasional ke database masing-masing ---
    console.log(`Inserting ${reviewData.length} reviews into MongoDB...`);
    await Review.insertMany(reviewData);

    console.log(`Inserting ${watchHistoryData.length} watch history records into PostgreSQL Analytics...`);
    for (const record of watchHistoryData) {
      await pgAnalyticsPool.query(
        'INSERT INTO user_watch_history (user_id, content_id, duration_watched_seconds, last_position_seconds) VALUES ($1, $2, $3, $4)',
        [record.user_id, record.content_id, record.duration_watched_seconds, record.last_position_seconds]
      );
    }

    console.log('Setting Redis cache and trending data...');
    await Promise.all(generatedContent.map(c => redisClient.setex(`content:metadata:${c.id}`, 3600, JSON.stringify(c))));
    
    for (const content of generatedContent) {
      await redisClient.zincrby('trending:daily', faker.number.int({ min: 10, max: 1000 }), content.id);
    }

    console.log('Seeding complete!');
    console.log(`- Inserted ${generatedContent.length} content records.`);
    console.log(`- Inserted ${generatedUsers.length} user records.`);
    console.log(`- Inserted ${reviewData.length} reviews.`);
    console.log(`- Inserted ${watchHistoryData.length} watch history records.`);
    console.log('\nSample Content ID: ' + generatedContent[0].id);
    console.log('Sample User ID: ' + generatedUsers[0].id);

  } catch (error) {
    console.error('Error during seeding:', error);
    process.exit(1);
  } finally {
    // --- 8. Tutup semua koneksi ---
    console.log('Closing all database connections.');
    if (connections) {
        if (connections.pgMainPool) await connections.pgMainPool.end().catch(() => {});
        if (connections.pgAnalyticsPool) await connections.pgAnalyticsPool.end().catch(() => {});
        if (connections.mongooseConnection && connections.mongooseConnection.readyState === 1) await connections.mongooseConnection.close().catch(() => {});
        if (connections.redisClient) await connections.redisClient.disconnect().catch(() => {});
    }
    process.exit(0);
  }
}

// Jalankan skrip
seedDatabases(50);
