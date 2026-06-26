import { connectDB } from '../_lib/mongodb.js'
import Anime from '../_lib/models/Anime.js'
import { requireAuth } from '../_lib/auth.js'

export default async function handler(req, res) {
  await connectDB()
  const { user, error, status } = await requireAuth(req)
  if (error) return res.status(status).json({ message: error })

  if (req.method === 'GET') {
    const anime = await Anime.find({ userId: user._id }).sort({ title: 1 })
    return res.json(anime)
  }

  if (req.method === 'POST') {
    const anime = await Anime.create({ ...req.body, userId: user._id })
    return res.status(201).json(anime)
  }

  res.status(405).json({ message: 'Method not allowed' })
}