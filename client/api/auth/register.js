import { connectDB } from '../../lib/mongodb.js'
import User from '../../lib/models/User.js'
import jwt from 'jsonwebtoken'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })

  await connectDB()

  const { username, email, password, profileImage } = req.body
  if (!username || !email || !password)
    return res.status(400).json({ message: 'Username, email and password are required' })

  const exists = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username }] })
  if (exists) return res.status(400).json({ message: 'Username or email already taken' })

  const user = await User.create({ username, email: email.toLowerCase(), password, profileImage })
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' })

  res.status(201).json({
    token,
    user: { id: user._id, username: user.username, email: user.email, profileImage: user.profileImage }
  })
}