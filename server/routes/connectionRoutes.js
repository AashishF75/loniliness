const express = require('express');
const router = express.Router();
const { getConnections, sendConnectionRequest, updateConnectionStatus, sendMessage } = require('../controllers/connectionController');
const { protect } = require('../middleware/authMiddleware');

router.route('/').get(protect, getConnections).post(protect, sendConnectionRequest);
router.route('/:id/status').put(protect, updateConnectionStatus);
router.route('/:id/message').post(protect, sendMessage);

module.exports = router;
