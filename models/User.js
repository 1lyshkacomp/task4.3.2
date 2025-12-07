const mongoose = require('mongoose');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  nickname: { type: String, required: true, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  
  // Роль: user или admin
  role: { type: String, enum: ['user', 'admin'], default: 'user' },

  // Технические поля (скрыты по умолчанию)
  passwordHash: { type: String, select: false },
  salt: { type: String, select: false },
  deletedAt: { type: Date, default: null, select: false },
  
  // Настройки хеширования
  iterations: { type: Number, default: 10000, select: false }
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } // Авто-даты
});

// Хеширование пароля
userSchema.methods.setPassword = function(password) {
  this.salt = crypto.randomBytes(16).toString('hex');
  this.passwordHash = crypto.pbkdf2Sync(password, this.salt, this.iterations, 64, 'sha512').toString('hex');
};

// Проверка пароля
userSchema.methods.checkPassword = function(password) {
  if (!this.passwordHash || !this.salt) return false;
  const hash = crypto.pbkdf2Sync(password, this.salt, this.iterations, 64, 'sha512').toString('hex');
  return this.passwordHash === hash;
};

module.exports = mongoose.model('User', userSchema);