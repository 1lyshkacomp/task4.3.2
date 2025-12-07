const mongoose = require("mongoose");
const crypto = require("crypto");

const userSchema = new mongoose.Schema({
  nickname: { type: String, unique: true, required: true },
  role: { type: String, default: "user" },

  // Технические поля
  passwordHash: { type: String, select: false },
  salt: { type: String, select: false },
  iterations: { type: Number, default: 1000, select: false },

  deletedAt: { type: Date, default: null, select: false }, // Soft Delete
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } 
});

// Генерация хеша (PBKDF2)
userSchema.methods.setPassword = function (password) {
  this.salt = crypto.randomBytes(16).toString("hex");
  this.passwordHash = crypto
    .pbkdf2Sync(password, this.salt, this.iterations, 64, "sha512")
    .toString("hex");
};

// Проверка пароля
userSchema.methods.checkPassword = function (password) {
  const hash = crypto
    .pbkdf2Sync(password, this.salt, this.iterations, 64, "sha512")
    .toString("hex");
  return hash === this.passwordHash;
};

module.exports = mongoose.model("User", userSchema);