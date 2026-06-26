import { connectDB } from '../../lib/mongodb.js'
import Drama from '../../lib/models/Drama.js'
import { requireAuth } from '../../lib/auth.js'

export default async function handler(req, res) {
  await connectDB()
  const { user, error, status } = await requireAuth(req)
  if (error) return res.status(status).json({ message: error })

  const { id } = req.query

  if (req.method === 'GET') {
    const drama = await Drama.findOne({ _id: id, userId: user._id })
    if (!drama) return res.status(404).json({ message: 'Not found' })
    return res.json(drama)
  }

  if (req.method === 'PUT') {
    const drama = await Drama.findOneAndUpdate(
      { _id: id, userId: user._id },
      req.body,
      { new: true, runValidators: true }
    )
    if (!drama) return res.status(404).json({ message: 'Not found' })
    return res.json(drama)
  }

  if (req.method === 'DELETE') {
    const drama = await Drama.findOneAndDelete({ _id: id, userId: user._id })
    if (!drama) return res.status(404).json({ message: 'Not found' })
    return res.json({ message: 'Deleted successfully' })
  }

  res.status(405).json({ message: 'Method not allowed' })
}