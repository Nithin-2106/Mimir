import { connectDB } from '../../lib/mongodb.js'
import Drama from '../../lib/models/Drama.js'
import { requireAuth } from '../../lib/auth.js'

export default async function handler(req, res) {
  await connectDB()
  const { user, error, status } = await requireAuth(req)
  if (error) return res.status(status).json({ message: error })

  if (req.method === 'GET') {
    const drama = await Drama.find({ userId: user._id }).sort({ title: 1 })
    return res.json(drama)
  }

  if (req.method === 'POST') {
    const drama = await Drama.create({ ...req.body, userId: user._id })
    return res.status(201).json(drama)
  }

  res.status(405).json({ message: 'Method not allowed' })
}