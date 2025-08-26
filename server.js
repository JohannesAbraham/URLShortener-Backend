import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import slugify from "slugify";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const urlSchema = new mongoose.Schema({
  longUrl: String,
  shortUrl: String,
});

const Url = mongoose.model("Url", urlSchema);

function createShortUrl(longUrl) {
  try {
    const url = new URL(longUrl);
    const domain = slugify(url.hostname, { lower: true, strict: true });
    return domain + "-" + Math.random().toString(36).substring(2, 6);
  } catch {
    return "short-" + Math.random().toString(36).substring(2, 6);
  }
}

app.get("/admin/urls", async (req, res) => {
  try {
    const urls = await Url.find({}, { _id: 0, __v: 0 });
    res.json(urls);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/shorten", async (req, res) => {
  const { longUrl } = req.body;

  let existing = await Url.findOne({ longUrl });
  if (existing) {
    return res.json({ shortUrl: `${process.env.BASE_URL}/short/${existing.shortUrl}` });
  }

  const short = createShortUrl(longUrl); // only the slug
  const url = new Url({ longUrl, shortUrl: short });
  await url.save();

  res.json({ shortUrl: `${process.env.BASE_URL}/short/${short}` });
});


app.get("/short/:shortURL", async (req, res) => {
  const { shortURL } = req.params;
  const url = await Url.findOne({ shortUrl: shortURL });
  if (!url) return res.status(404).send("Not found");
  res.redirect(url.longUrl);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
