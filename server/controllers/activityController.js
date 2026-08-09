const Activity = require('../models/Activity');
const User = require('../models/User');

const getActivities = async (req, res) => {
  try {
    const activities = await Activity.find({});
    res.json(activities);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const joinActivity = async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id);
    if (!activity) return res.status(404).json({ message: 'Activity not found' });

    if (!activity.participants.includes(req.user._id)) {
      activity.participants.push(req.user._id);
      await activity.save();
    }
    res.json(activity);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getActivities, joinActivity };
