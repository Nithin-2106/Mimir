import { connectDB } from '../../lib/mongodb.js'
import Anime from '../../lib/models/Anime.js'
import { requireAuth } from '../../lib/auth.js'

export default async function handler(req, res) {
  await connectDB()
  const { user, error, status } = await requireAuth(req)
  if (error) return res.status(status).json({ message: error })

  const { id } = req.query

  if (req.method === 'GET') {
    const anime = await Anime.findOne({ _id: id, userId: user._id })
    if (!anime) return res.status(404).json({ message: 'Not found' })
    return res.json(anime)
  }

  if (req.method === 'PUT') {
    const anime = await Anime.findOneAndUpdate(
      { _id: id, userId: user._id },
      req.body,
      { new: true, runValidators: true }
    )
    if (!anime) return res.status(404).json({ message: 'Not found' })
    return res.json(anime)
  }

  if (req.method === 'DELETE') {
    const anime = await Anime.findOneAndDelete({ _id: id, userId: user._id })
    if (!anime) return res.status(404).json({ message: 'Not found' })
    return res.json({ message: 'Deleted successfully' })
  }

  res.status(405).json({ message: 'Method not allowed' })
}