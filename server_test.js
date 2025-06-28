// server_test.js
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(cors());

// --- CONTROLLER SEMENTARA ---
const contentController = {
    getAllContentIds: (req, res) => {
        // Mengembalikan data dummy yang sudah ditentukan
        const dummyIds = ["id-1", "id-2", "id-3", "id-4", "id-5"];
        console.log('Serving dummy IDs from /ids endpoint.');
        res.status(200).json(dummyIds);
    },
    getAllUserIds: (req, res) => {
        const dummyIds = ["user-a", "user-b", "user-c"];
        console.log('Serving dummy user IDs from /users/ids endpoint.');
        res.status(200).json(dummyIds);
    },
    getContentMetadata: (req, res) => {
        const { id } = req.params;
        console.log('Serving dummy metadata for ID:', id);
        res.status(200).json({ id, title: `Dummy Content for ${id}` });
    },
    // Fungsi lain tidak perlu karena kita hanya uji dua rute
    getUserWatchHistoryWithContentTitle: (req, res) => {
        const { userId } = req.params;
        res.status(200).json([{ username: `user_${userId}`, title: `Dummy Title` }]);
    }
};

// --- RUTE SEMENTARA ---
const router = express.Router();

// RUTE SPESIFIK HARUS DI ATAS RUTE PARAMETER
router.get('/ids', contentController.getAllContentIds);
router.get('/users/ids', contentController.getAllUserIds);

// RUTE DENGAN PARAMETER
router.get('/:id', contentController.getContentMetadata);
router.get('/users/:userId/watch-history', contentController.getUserWatchHistoryWithContentTitle);


// --- HUBUNGKAN RUTE KE APLIKASI ---
app.use('/api/v1/content', router);

app.get('/', (req, res) => {
    res.status(200).send('Test server is running!');
});

// --- JALANKAN SERVER ---
app.listen(PORT, () => {
    console.log(`Test server running on port ${PORT}`);
});