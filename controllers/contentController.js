// controllers/contentController.js
const db = require('../config/database'); // PostgreSQL Citus
const redis = require('../config/redis'); // Redis
const Review = require('../models/review'); // MongoDB Model

/**
 * Mengambil metadata konten dari PostgreSQL atau cache Redis.
 */
async function getContentMetadata(req, res) {
  const { id } = req.params;
  try {
    // 1. Cek cache Redis terlebih dahulu
    const cachedData = await redis.get(`content:metadata:${id}`);
    if (cachedData) {
      console.log('DEBUG: Cache hit for content metadata!');
      return res.status(200).json(JSON.parse(cachedData));
    }

    // 2. Jika tidak ada di cache, ambil dari PostgreSQL
    console.log(`DEBUG: Fetching metadata for Content ID: ${id} from DB.`);
    const result = await db.query('SELECT * FROM content_metadata WHERE content_id = $1', [id]);
    const metadata = result.rows[0];

    if (!metadata) {
      return res.status(404).json({ message: 'Content not found' });
    }

    // 3. Simpan data di Redis dengan waktu kadaluarsa (1 jam)
    await redis.setex(`content:metadata:${id}`, 3600, JSON.stringify(metadata));
    console.log('DEBUG: Data stored in Redis cache.');

    res.status(200).json(metadata);
  } catch (error) {
    console.error('Error fetching content metadata:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}

/**
 * Menambahkan ulasan baru ke MongoDB.
 */
async function addReview(req, res) {
  try {
    const { user_id, rating, comment } = req.body;
    const content_id = req.params.id;

    if (!user_id || !rating) {
      return res.status(400).json({ message: 'User ID and rating are required.' });
    }

    const newReview = new Review({ content_id, user_id, rating, comment });
    await newReview.save();
    res.status(201).json({ message: 'Review added successfully' });
  } catch (error) {
    console.error('Error adding review:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * Meningkatkan hitungan penayangan di Redis secara real-time.
 */
async function incrementContentViews(contentId) {
  try {
    const views = await redis.incr(`content:views:${contentId}`);
    console.log(`Content ${contentId} now has ${views} views.`);
  } catch (error) {
    console.error('Error incrementing views:', error);
  }
}

/**
 * Mendapatkan riwayat tontonan pengguna dari database terdistribusi (via FDW).
 */
async function getUserWatchHistoryWithContentTitle(req, res) {
  const { userId } = req.params;
  try {
    const query = `
      SELECT
          u.username,
          cm.title,
          wh.watched_at,
          wh.duration_watched_seconds
      FROM
          user_watch_history AS wh
      JOIN
          users AS u ON wh.user_id = u.user_id
      JOIN
          content_metadata AS cm ON wh.content_id = cm.content_id
      WHERE
          u.user_id = $1
      ORDER BY
          wh.watched_at DESC
      LIMIT 10;
    `;
    const result = await db.query(query, [userId]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching user watch history:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}

/**
 * Mendapatkan semua Content ID dari PostgreSQL.
 */
async function getAllContentIds(req, res) {
    console.log('DEBUG: Attempting to fetch all content IDs from DB...');
    try {
        const result = await db.query('SELECT content_id FROM content_metadata');
        console.log('DEBUG: Query successful. Rows fetched:', result.rows.length);
        res.status(200).json(result.rows.map(row => row.content_id));
        console.log('DEBUG: Response sent successfully.');
    } catch (error) {
        console.error('Error fetching all content IDs:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}

/**
 * Mendapatkan semua User ID dari PostgreSQL (via FDW).
 */
async function getAllUserIds(req, res) {
    console.log('DEBUG: Attempting to fetch all user IDs from DB via FDW...');
    try {
        const result = await db.query('SELECT user_id FROM users');
        console.log('DEBUG: Query successful. Rows fetched:', result.rows.length);
        res.status(200).json(result.rows.map(row => row.user_id));
        console.log('DEBUG: Response sent successfully.');
    } catch (error) {
        console.error('Error fetching all user IDs:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}

/**
 * Mendapatkan daftar pemeran untuk konten tertentu dari PostgreSQL.
 */
async function getCastForContent(req, res) {
    const { id } = req.params;
    try {
        const query = `
            SELECT cc.character_name, cc.person_id, c.name AS person_name, c.role
            FROM content_cast_crew AS cc
            JOIN cast_crew AS c ON cc.person_id = c.person_id
            WHERE cc.content_id = $1;
        `;
        const result = await db.query(query, [id]);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching cast for content:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}

/**
 * Mendapatkan semua ulasan untuk konten tertentu dari MongoDB.
 */
async function getReviewsForContent(req, res) {
    const { id } = req.params;
    try {
        const reviews = await Review.find({ content_id: id }).exec();
        res.status(200).json(reviews);
    } catch (error) {
        console.error('Error fetching reviews for content:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}

/**
 * Mendapatkan data tren harian dari Redis (menggunakan Sorted Set).
 */
async function getTrendingContent(req, res) {
    try {
        const trendingIds = await redis.zrevrange('trending:daily', 0, 9, 'WITHSCORES');
        
        const trendingList = [];
        for (let i = 0; i < trendingIds.length; i += 2) {
            const contentId = trendingIds[i];
            const views = parseInt(trendingIds[i + 1], 10);
            trendingList.push({ content_id: contentId, views: views });
        }

        res.status(250).json(trendingList);
    } catch (error) {
        console.error('Error fetching trending data from Redis:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}

/**
 * Mendapatkan detail lengkap konten dari semua database (PG, Mongo, Redis).
 */
async function getContentDetails(req, res) {
    const { id } = req.params;
    try {
        // Ambil data dari 3 sumber secara paralel
        const [metadataResult, reviews, views] = await Promise.all([
            db.query('SELECT * FROM content_metadata WHERE content_id = $1', [id]),
            Review.find({ content_id: id }).exec(),
            redis.get(`content:views:${id}`)
        ]);

        if (metadataResult.rows.length === 0) {
            return res.status(404).json({ message: 'Content not found' });
        }

        const details = {
            metadata: metadataResult.rows[0],
            reviews: reviews,
            real_time_views: views ? parseInt(views, 10) : 0
        };

        res.status(200).json(details);
    } catch (error) {
        console.error('Error fetching detailed content info:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}

module.exports = {
    getContentMetadata,
    addReview,
    incrementContentViews,
    getUserWatchHistoryWithContentTitle,
    getAllContentIds,
    getAllUserIds,
    getCastForContent,
    getReviewsForContent,
    getTrendingContent,
    getContentDetails,
};