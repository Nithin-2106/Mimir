import axios from 'axios'

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const { path, ...query } = req.query

    // path is an array with catch-all routes e.g. ['tv', '123', 'credits']
    const tmdbPath = Array.isArray(path) ? path.join('/') : path

    if (!tmdbPath) {
      return res.status(400).json({ message: 'No path provided' })
    }

    const tmdbKey = process.env.TMDB_KEY

    if (!tmdbKey) {
      console.error('TMDB_KEY is not set')
      return res.status(500).json({ message: 'TMDB_KEY not configured' })
    }

    const url = `https://api.themoviedb.org/3/${tmdbPath}`

    const response = await axios.get(url, {
      params: {
        ...query,
        api_key: tmdbKey,
      },
      timeout: 10000,
    })

    return res.json(response.data)

  } catch (err) {
    console.error('TMDB proxy error:', err.message)
    return res.status(err.response?.status || 500).json({
      message: err.response?.data?.status_message || err.message,
    })
  }
}