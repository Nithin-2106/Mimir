const Drama = require('../models/Drama');

// GET all drama
exports.getAll = async (req, res) => {
  try {
    const drama = await Drama.find().sort({ title: 1 });
    res.json(drama);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET single drama
exports.getOne = async (req, res) => {
  try {
    const drama = await Drama.findById(req.params.id);
    if (!drama) return res.status(404).json({ message: 'Not found' });
    res.json(drama);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST create drama
exports.create = async (req, res) => {
  try {
    const drama = await Drama.create(req.body);
    res.status(201).json(drama);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// PUT update drama
exports.update = async (req, res) => {
  try {
    const drama = await Drama.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!drama) return res.status(404).json({ message: 'Not found' });
    res.json(drama);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// DELETE drama
exports.remove = async (req, res) => {
  try {
    const drama = await Drama.findByIdAndDelete(req.params.id);
    if (!drama) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};