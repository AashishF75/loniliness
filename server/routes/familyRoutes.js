const express = require('express');
const router = express.Router();
const { getFamilyDashboard, toggleFamilyConsent } = require('../controllers/familyController');
const { protect } = require('../middleware/authMiddleware');

router.route('/dashboard').get(protect, getFamilyDashboard);
router.route('/consent').put(protect, toggleFamilyConsent);

module.exports = router;
