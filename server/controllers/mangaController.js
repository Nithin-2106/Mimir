const Manga = require('../models/Manga');

// GET all manga
exports.getAll = async (req, res) => {
  try {
    const manga = await Manga.find().sort({ title: 1 });
    res.json(manga);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET single manga
exports.getOne = async (req, res) => {
  try {
    const manga = await Manga.findById(req.params.id);
    if (!manga) return res.status(404).json({ message: 'Not found' });
    res.json(manga);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST create manga
exports.create = async (req, res) => {
  try {
    const manga = await Manga.create(req.body);
    res.status(201).json(manga);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// PUT update manga
exports.update = async (req, res) => {
  try {
    const manga = await Manga.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!manga) return res.status(404).json({ message: 'Not found' });
    res.json(manga);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// DELETE manga
// DELETE manga
exports.remove = async (req, res) => {
  try {
    const manga = await Manga.findByIdAndDelete(req.params.id);
    if (!manga) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};