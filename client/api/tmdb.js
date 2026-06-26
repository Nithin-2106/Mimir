import axios from "axios";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { path, ...query } = req.query;

  if (!path) {
    return res.status(400).json({ message: "No path provided" });
  }

  const tmdbKey = process.env.TMDB_KEY;

  if (!tmdbKey) {
    return res.status(500).json({ message: "TMDB_KEY not configured" });
  }

  try {
    const response = await axios.get(
      `https://api.themoviedb.org/3/${path}`,
      {
        params: {
          ...query,
          api_key: tmdbKey,
        },
        timeout: 10000,
      }
    );

    return res.status(200).json(response.data);
  } catch (err) {
    return res.status(err.response?.status || 500).json({
      message: err.response?.data?.status_message || err.message,
    });
  }
}