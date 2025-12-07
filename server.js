require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const User = require("./models/User");

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "secretKey123";

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static("public")); 

// Подключение к БД
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected!"))
  .catch((err) => console.error("❌ DB Error:", err.message));

// Middleware: Проверка JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; 

  if (!token) return res.status(401).json({ error: "Token required" });

  jwt.verify(token, JWT_SECRET, (err, userPayload) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = userPayload; // { userId, role }
    next();
  });
};

// --- Роуты ---

// 1. Регистрация (Теперь только с ником и паролем)
app.post("/api/register", async (req, res) => {
  try {
    const { nickname, password } = req.body;
    const user = new User({ nickname });
    user.setPassword(password);
    await user.save();
    res.status(201).json({ message: "User created" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 2. Логин
app.post("/api/login", async (req, res) => {
  const { nickname, password } = req.body;
  const user = await User.findOne({ nickname, deletedAt: null }).select(
    "+passwordHash +salt +iterations +role"
  );
  if (!user || !user.checkPassword(password)) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, {
    expiresIn: "24h",
  });
  res.json({ token, role: user.role });
});

// 3. Получить профиль
app.get("/api/me", authenticateToken, async (req, res) => {
  const user = await User.findById(req.user.userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  res.setHeader("Last-Modified", new Date(user.updated_at).toUTCString());
  res.json({
    nickname: user.nickname,
    role: user.role,
  });
});

// 4. Обновить профиль (Тест 412) - Теперь обновляется только updated_at
app.put("/api/update", authenticateToken, async (req, res) => {
  const user = await User.findById(req.user.userId);

  const clientHeader = req.headers["if-unmodified-since"];
  if (clientHeader) {
    const clientTime = new Date(clientHeader).getTime();
    const serverTime = new Date(user.updated_at).getTime();

    if (serverTime > clientTime + 1000) {
      return res
        .status(412)
        .json({ error: "Precondition Failed: Data outdated" });
    }
  }

  // Поскольку нет полей, которые нужно обновить, мы просто "сохраняем"
  // чтобы обновить updated_at для следующего 412 теста.
  user.updated_at = new Date(); // Принудительно обновляем дату
  await user.save(); 
  
  res.setHeader("Last-Modified", new Date(user.updated_at).toUTCString());
  res.json({ message: "Updated" });
});

// 5. Удаление (Soft Delete + Admin Check)
app.delete("/api/users/:id", authenticateToken, async (req, res) => {
  const targetId = req.params.id;
  const requester = req.user;

  if (requester.role !== "admin" && requester.userId !== targetId) {
    return res.status(403).json({ error: "Access denied" });
  }

  await User.findByIdAndUpdate(targetId, { deletedAt: new Date() });
  res.json({ message: "User soft-deleted" });
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));