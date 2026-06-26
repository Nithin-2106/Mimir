import { connectDB } from '../_lib/mongodb.js'
import Manga from '../_lib/models/Manga.js'
import { requireAuth } from '../_lib/auth.js'

export default async function handler(req, res) {
  await connectDB()
  const { user, error, status } = await requireAuth(req)
  if (error) return res.status(status).json({ message: error })

  const { id } = req.query

  if (req.method === 'GET') {
    const manga = await Manga.findOne({ _id: id, userId: user._id })
    if (!manga) return res.status(404).json({ message: 'Not found' })
    return res.json(manga)
  }

  if (req.method === 'PUT') {
    const manga = await Manga.findOneAndUpdate(
      { _id: id, userId: user._id },
      req.body,
      { new: true, runValidators: true }
    )
    if (!manga) return res.status(404).json({ message: 'Not found' })
    return res.json(manga)
  }

  if (req.method === 'DELETE') {
    const manga = await Manga.findOneAndDelete({ _id: id, userId: user._id })
    if (!manga) return res.status(404).json({ message: 'Not found' })
    return res.json({ message: 'Deleted successfully' })
  }

  res.status(405).json({ message: 'Method not allowed' })
}