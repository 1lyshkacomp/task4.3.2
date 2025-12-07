require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const User = require('./models/User');

const app = express();
const PORT = 3000; // Стандарт для CodeSandbox
const JWT_SECRET = process.env.JWT_SECRET || 'secretKey123';

app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(express.static('public')); // Раздаем фронтенд

// Подключение к БД
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected!'))
  .catch(err => console.error('❌ DB Error:', err.message));

// --- Middleware: Проверка Токена ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer <token>"

  if (!token) return res.status(401).json({ error: 'Token required' });

  jwt.verify(token, JWT_SECRET, (err, userPayload) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = userPayload; // { userId, role }
    next();
  });
};

// --- РОУТЫ ---

// 1. Регистрация
app.post('/api/register', async (req, res) => {
  try {
    const { nickname, firstName, lastName, password } = req.body;
    const user = new User({ nickname, firstName, lastName });
    user.setPassword(password);
    await user.save();
    res.status(201).json({ message: 'User created' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 2. Логин (Выдача JWT)
app.post('/api/login', async (req, res) => {
  const { nickname, password } = req.body;
  
  // Ищем пользователя (включая удаленных? Нет, только активных)
  const user = await User.findOne({ nickname, deletedAt: null }).select('+passwordHash +salt +iterations +role');

  if (!user || !user.checkPassword(password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Создаем токен (живет 24 часа)
  const token = jwt.sign(
    { userId: user._id, role: user.role }, 
    JWT_SECRET, 
    { expiresIn: '24h' }
  );

  res.json({ token, role: user.role });
});

// 3. Получить профиль (Защищено JWT + Last-Modified)
app.get('/api/me', authenticateToken, async (req, res) => {
  const user = await User.findById(req.user.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Добавляем заголовок Last-Modified
  res.setHeader('Last-Modified', new Date(user.updated_at).toUTCString());
  
  res.json({
      nickname: user.nickname,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role
  });
});

// 4. Обновить профиль (Защищено + If-Unmodified-Since)
app.put('/api/update', authenticateToken, async (req, res) => {
    const user = await User.findById(req.user.userId);
    
    // Проверка заголовка If-Unmodified-Since
    const clientHeader = req.headers['if-unmodified-since'];
    if (clientHeader) {
        const clientTime = new Date(clientHeader).getTime();
        const serverTime = new Date(user.updated_at).getTime();
        
        // Если данные на сервере новее (с допуском 1 сек), то ошибка 412
        if (serverTime > clientTime + 1000) {
            return res.status(412).json({ error: 'Precondition Failed: Data outdated' });
        }
    }

    if (req.body.firstName) user.firstName = req.body.firstName;
    if (req.body.lastName) user.lastName = req.body.lastName;
    
    await user.save();
    res.setHeader('Last-Modified', new Date(user.updated_at).toUTCString());
    res.json({ message: 'Updated' });
});

// 5. Удаление (Soft Delete + Admin Check)
app.delete('/api/users/:id', authenticateToken, async (req, res) => {
    const targetId = req.params.id;
    const requester = req.user;

    // Админ может удалить любого, Юзер только себя
    if (requester.role !== 'admin' && requester.userId !== targetId) {
        return res.status(403).json({ error: 'Access denied' });
    }

    await User.findByIdAndUpdate(targetId, { deletedAt: new Date() });
    res.json({ message: 'User soft-deleted' });
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));