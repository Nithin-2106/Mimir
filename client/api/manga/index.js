import { connectDB } from '../../lib/mongodb.js'
import Manga from '../../lib/models/Manga.js'
import { requireAuth } from '../../lib/auth.js'

export default async function handler(req, res) {
  await connectDB()
  const { user, error, status } = await requireAuth(req)
  if (error) return res.status(status).json({ message: error })

  if (req.method === 'GET') {
    const manga = await Manga.find({ userId: user._id }).sort({ title: 1 })
    return res.json(manga)
  }

  if (req.method === 'POST') {
    const manga = await Manga.create({ ...req.body, userId: user._id })
    return res.status(201).json(manga)
  }

  res.status(405).json({ message: 'Method not allowed' })
}