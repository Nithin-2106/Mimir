import axios from 'axios'

export default async function handler(req, res) {
  const { path, ...query } = req.query

  const tmdbPath = Array.isArray(path) ? path.join('/') : path

  try {
    const response = await axios.get(`https://api.themoviedb.org/3/${tmdbPath}`, {
      params: {
        ...query,
        api_key: process.env.TMDB_KEY,
      },
    })
    res.json(response.data)
  } catch (err) {
    res.status(err.response?.status || 500).json({
      message: err.response?.data || err.message,
    })
  }
}