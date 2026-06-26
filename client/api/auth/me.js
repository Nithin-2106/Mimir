import { requireAuth } from '../../lib/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' })

  const { user, error, status } = await requireAuth(req)
  if (error) return res.status(status).json({ message: error })

  res.json({ id: user._id, username: user.username, email: user.email, profileImage: user.profileImage })
}