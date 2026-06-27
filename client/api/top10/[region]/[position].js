import { connectDB } from "../../_lib/mongodb.js";
import Top10 from "../../_lib/models/Top10.js";
import { requireAuth } from "../../_lib/auth.js";

export default async function handler(req, res) {
  await connectDB();

  const auth = await requireAuth(req);
  if (auth.error)
    return res.status(auth.status).json({ message: auth.error });

  const { region, position } = req.query;
  const pos = Number(position);

  if (!region || isNaN(pos) || pos < 1 || pos > 10)
    return res.status(400).json({ message: "Invalid region or position" });

  if (req.method !== "PUT" && req.method !== "DELETE")
    return res.status(405).json({ message: "Method not allowed" });

  const doc = await Top10.findOne({ region, userId: auth.user._id });
  if (!doc)
    return res.status(404).json({ message: "Region not found" });

  const idx = doc.entries.findIndex((e) => e.position === pos);
  if (idx === -1)
    return res.status(404).json({ message: "Slot not found" });

  const field = `entries.${idx}`;

  if (req.method === "PUT") {
    await Top10.updateOne(
      { _id: doc._id, userId: auth.user._id },
      {
        $set: {
          [field]: {
            position: pos,
            tmdbId:     req.body.tmdbId     ?? null,
            title:      req.body.title      ?? "",
            coverImage: req.body.coverImage ?? "",
            year:       req.body.year       ?? null,
            type:       req.body.type       ?? "",
          },
        },
      }
    );

    const updated = await Top10.findById(doc._id);
    return res.json(updated);
  }

  if (req.method === "DELETE") {
    await Top10.updateOne(
      { _id: doc._id, userId: auth.user._id },
      {
        $set: {
          [field]: {
            position: pos,
            tmdbId:     null,
            title:      "",
            coverImage: "",
            year:       null,
            type:       "",
          },
        },
      }
    );

    const updated = await Top10.findById(doc._id);
    return res.json(updated);
  }
}