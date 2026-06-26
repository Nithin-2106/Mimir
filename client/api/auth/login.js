import { connectDB } from '../../lib/mongodb.js'
import User from '../../lib/models/User.js'
import jwt from 'jsonwebtoken'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })

  await connectDB()

  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ message: 'Email and password are required' })

  const user = await User.findOne({ email: email.toLowerCase() })
  if (!user || !(await user.comparePassword(password)))
    return res.status(401).json({ message: 'Invalid email or password' })

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' })

  res.json({
    token,
    user: { id: user._id, username: user.username, email: user.email, profileImage: user.profileImage }
  })
}