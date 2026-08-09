const Connection = require('../models/Connection');
const User = require('../models/User');

const getConnections = async (req, res) => {
  try {
    const connections = await Connection.find({ users: req.user._id }).populate('users', 'name age interests');
    res.json(connections);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const sendConnectionRequest = async (req, res) => {
  try {
    const { targetUserId } = req.body;
    
    // Check if connection already exists
    const existing = await Connection.findOne({
      users: { $all: [req.user._id, targetUserId] }
    });
    
    if (existing) {
      return res.status(400).json({ message: 'Connection already exists' });
    }

    const connection = await Connection.create({
      users: [req.user._id, targetUserId],
      status: 'pending'
    });
    
    res.status(201).json(connection);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateConnectionStatus = async (req, res) => {
  try {
    const { status } = req.body; // 'connected' or 'declined'
    const connection = await Connection.findById(req.params.id);
    
    if (!connection) return res.status(404).json({ message: 'Connection not found' });
    if (!connection.users.includes(req.user._id)) return res.status(403).json({ message: 'Not authorized' });

    connection.status = status;
    await connection.save();
    res.json(connection);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const sendMessage = async (req, res) => {
  try {
    const { text } = req.body;
    const connection = await Connection.findById(req.params.id);
    
    if (!connection || !connection.users.includes(req.user._id)) {
      return res.status(404).json({ message: 'Connection not found or unauthorized' });
    }

    connection.messages.push({
      sender: req.user._id,
      text
    });
    
    await connection.save();
    res.json(connection);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getConnections, sendConnectionRequest, updateConnectionStatus, sendMessage };
