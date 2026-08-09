const User = require('../models/User');
const Activity = require('../models/Activity');
const Connection = require('../models/Connection');

const getFamilyDashboard = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    // Check if consent is true
    if (!user.familyConsent) {
      return res.status(403).json({ message: 'Activity sharing is disabled by the user' });
    }

    // Get mock summary data for the family dashboard
    const activities = await Activity.find({ participants: req.user._id }).sort({ date: 1 }).limit(3);
    const connections = await Connection.find({ users: req.user._id, status: 'connected' }).populate('users', 'name');
    
    res.json({
      seniorName: user.name,
      recentActivities: activities,
      connectionsCount: connections.length,
      connectionsDetails: connections
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const toggleFamilyConsent = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    user.familyConsent = !user.familyConsent;
    await user.save();
    
    res.json({ familyConsent: user.familyConsent });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getFamilyDashboard, toggleFamilyConsent };
