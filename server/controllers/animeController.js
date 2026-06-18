const Anime = require('../models/Anime');

// GET all anime
exports.getAll = async (req, res) => {
  try {
    const anime = await Anime.find().sort({ title: 1 });
    res.json(anime);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET single anime
exports.getOne = async (req, res) => {
  try {
    const anime = await Anime.findById(req.params.id);
    if (!anime) return res.status(404).json({ message: 'Not found' });
    res.json(anime);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST create anime
exports.create = async (req, res) => {
  try {
    const anime = await Anime.create(req.body);
    res.status(201).json(anime);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// PUT update anime
exports.update = async (req, res) => {
  try {
    const anime = await Anime.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!anime) return res.status(404).json({ message: 'Not found' });
    res.json(anime);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// DELETE anime
exports.remove = async (req, res) => {
  try {
    const anime = await Anime.findByIdAndDelete(req.params.id);
    if (!anime) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};