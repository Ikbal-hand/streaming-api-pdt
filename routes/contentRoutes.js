// routes/contentRoutes.js
const express = require('express');
const router = express.Router();
const contentController = require('../controllers/contentController');

router.get('/ids', contentController.getAllContentIds);
router.get('/users/ids', contentController.getAllUserIds);
router.get('/trending/daily', contentController.getTrendingContent);
router.get('/:id', contentController.getContentMetadata);
router.get('/:id/reviews', contentController.getReviewsForContent);
router.get('/:id/details', contentController.getContentDetails);
router.post('/:id/views/increment', (req, res) => {
  contentController.incrementContentViews(req.params.id);
  res.status(200).send('View count incremented');
});
router.post('/:id/reviews', contentController.addReview);
router.get('/users/:userId/watch-history', contentController.getUserWatchHistoryWithContentTitle);


module.exports = router;