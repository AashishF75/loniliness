const express = require('express');
const router = express.Router();
const { getActivities, joinActivity } = require('../controllers/activityController');
const { protect } = require('../middleware/authMiddleware');

router.route('/').get(protect, getActivities);
router.route('/:id/join').post(protect, joinActivity);

module.exports = router;
