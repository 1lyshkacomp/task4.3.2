require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const path = require("path");

const User = require("./models/User");

const app = express();
const PORT = process.env.PORT || 3000;

const JWT_SECRET = process.env.JWT_SECRET || "secret123";

app.use(express.json());
app.use(cors());

// serve frontend
app.use(express.static("public"));

// connect Mongo
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

// AUTH middleware
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "No token" });

  const token = header.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Invalid token" });

  jwt.verify(token, JWT_SECRET, (err, payload) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = payload;
    next();
  });
}

// REGISTER
app.post("/api/register", async (req, res) => {
  const { nickname, firstName, lastName, password } = req.body;
  try {
    const user = new User({ nickname, firstName, lastName });
    user.setPassword(password);
    await user.save();
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// LOGIN (return JWT)
app.post("/api/login", async (req, res) => {
  const { nickname, password } = req.body;

  const user = await User.findOne({ nickname, deletedAt: null }).select(
    "+passwordHash +salt +role"
  );

  if (!user || !user.checkPassword(password)) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign(
    { userId: user._id, role: user.role },
    JWT_SECRET,
    { expiresIn: "24h" }
  );

  res.json({ token });
});

// GET ME
app.get("/api/me", auth, async (req, res) => {
  const user = await User.findById(req.user.userId);
  res.json({
    id: user._id,
    nickname: user.nickname,
    firstName: user.firstName,
    lastName: user.lastName,
  });
});

// UPDATE PROFILE
app.put("/api/update", auth, async (req, res) => {
  const { firstName, lastName } = req.body;

  await User.findByIdAndUpdate(req.user.userId, {
    firstName,
    lastName,
  });

  res.json({ ok: true });
});

// CHANGE PASSWORD
app.put("/api/change-password", auth, async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user.userId).select(
    "+passwordHash +salt"
  );

  if (!user.checkPassword(oldPassword))
    return res.status(400).json({ error: "Wrong old password" });

  user.setPassword(newPassword);
  await user.save();

  res.json({ ok: true });
});

// SOFT DELETE
app.delete("/api/delete", auth, async (req, res) => {
  await User.findByIdAndUpdate(req.user.userId, {
    deletedAt: new Date(),
  });
  res.json({ ok: true });
});

app.listen(PORT, () => console.log("Server running on", PORT));
