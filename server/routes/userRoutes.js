const express = require('express');
const router = express.Router();
const { getUserProfile, updateUserProfile, getNearbyUsers } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.route('/profile').get(protect, getUserProfile).put(protect, updateUserProfile);
router.route('/nearby').get(protect, getNearbyUsers);

module.exports = router;
