const express = require('express');
const router = express.Router();
const { getVideoById, updateVideoProgress } = require('../controllers/videoController');
const { authenticate } = require('../middleware/auth');

router.get('/:id', authenticate, getVideoById);
router.post('/:id/progress', authenticate, updateVideoProgress);

module.exports = router;
