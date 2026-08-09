const User = require('../models/User');

const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      user.name = req.body.name || user.name;
      if (req.body.city && req.body.area) {
        user.location = `${req.body.area}, ${req.body.city}`;
      } else if (req.body.location) {
        user.location = req.body.location;
      }
      user.interests = req.body.interests || user.interests;
      user.preferredTime = req.body.preferredTime || (req.body.preferredTimes ? req.body.preferredTimes[0] : user.preferredTime);
      user.familyConsent = req.body.familyConsent !== undefined ? req.body.familyConsent : user.familyConsent;
      
      const updatedUser = await user.save();
      res.json(updatedUser);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getNearbyUsers = async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id } }).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getUserProfile, updateUserProfile, getNearbyUsers };
