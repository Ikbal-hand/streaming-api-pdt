// server.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const connectMongo = require('./config/mongo');
const redisClient = require('./config/redis');
const pgDb = require('./config/database');
const contentRoutes = require('./routes/contentRoutes');
const loggerMiddleware = require('./middlewares/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json()); // Parser untuk body request JSON
app.use(express.urlencoded({ extended: true }));
app.use(cors()); // Middleware CORS untuk mengizinkan permintaan lintas domain
app.use(loggerMiddleware); // Middleware untuk logging request

// Fungsi koneksi database dengan retry logic
const MAX_RETRIES = 10;
const RETRY_DELAY = 3000; // 3 seconds

async function connectToDatabases() {
  let isConnected = false;
  let retries = 0;

  while (retries < MAX_RETRIES && !isConnected) {
    try {
      console.log(`Attempting to connect to databases... Attempt ${retries + 1} of ${MAX_RETRIES}`);
      
      // Cek koneksi PostgreSQL (Citus)
      await pgDb.query('SELECT 1');
      console.log('PostgreSQL (Citus) connected successfully!');
      
      // Koneksi ke MongoDB
      await connectMongo();
      console.log('MongoDB connected successfully!');
      
      // Cek koneksi Redis
      await redisClient.ping();
      console.log('Redis connected successfully!');

      isConnected = true;
      console.log('All databases are connected!');
      return; // Keluar dari fungsi jika berhasil
    } catch (err) {
      retries++;
      console.error(`Connection attempt failed. Retrying in ${RETRY_DELAY / 1000} seconds...`);
      
      if (retries === MAX_RETRIES) {
        console.error('Failed to connect to databases after multiple retries. Exiting.', err);
        process.exit(1);
      }
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }
}

// Panggil fungsi koneksi saat aplikasi dimulai
connectToDatabases();

// Rute API
app.use('/api/v1/content', contentRoutes); // Menggunakan router yang diimpor dari file routes

// Rute untuk dokumentasi Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Rute dasar untuk cek server
app.get('/', (req, res) => {
  res.status(200).send('Streaming Metadata Service API is running! Go to /api-docs for documentation.');
});

// Menjalankan server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`API Docs available at http://localhost:${PORT}/api-docs`);
});