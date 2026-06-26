import { connectDB } from '../../../lib/mongodb.js'
import Top10 from '../../../lib/models/Top10.js'
import { requireAuth } from '../../../lib/auth.js'

const emptySlots = () =>
  Array.from({ length: 10 }, (_, i) => ({
    position: i + 1, tmdbId: null, title: '', coverImage: '', year: null, type: ''
  }))

export default async function handler(req, res) {
  await connectDB()
  const { user, error, status } = await requireAuth(req)
  if (error) return res.status(status).json({ message: error })

  const { region } = req.query

  if (req.method === 'GET') {
    let doc = await Top10.findOne({ region, userId: user._id })
    if (!doc) doc = await Top10.create({ region, userId: user._id, entries: emptySlots() })
    return res.json(doc)
  }

  res.status(405).json({ message: 'Method not allowed' })
}