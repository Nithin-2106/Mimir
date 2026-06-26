import { connectDB } from '../../lib/mongodb.js'
import MangaTop10 from '../../lib/models/MangaTop10.js'
import { requireAuth } from '../../lib/auth.js'

const emptySlots = () =>
  Array.from({ length: 10 }, (_, i) => ({
    position: i + 1, anilistId: null, title: '', coverImage: '', year: null, type: '', format: ''
  }))

export default async function handler(req, res) {
  await connectDB()
  const { user, error, status } = await requireAuth(req)
  if (error) return res.status(status).json({ message: error })

  const pos = parseInt(req.query.position)

  let doc = await MangaTop10.findOne({ userId: user._id })
  if (!doc) doc = await MangaTop10.create({ userId: user._id, entries: emptySlots() })

  const idx = doc.entries.findIndex(e => e.position === pos)
  if (idx === -1) return res.status(404).json({ message: 'Slot not found' })

  if (req.method === 'PUT') {
    doc.entries[idx] = { position: pos, ...req.body }
    doc.markModified('entries')
    await doc.save()
    return res.json(doc)
  }

  if (req.method === 'DELETE') {
    doc.entries[idx] = { position: pos, anilistId: null, title: '', coverImage: '', year: null, type: '', format: '' }
    doc.markModified('entries')
    await doc.save()
    return res.json(doc)
  }

  res.status(405).json({ message: 'Method not allowed' })
}