const mongoose = require("mongoose");
const crypto = require("crypto");

const userSchema = new mongoose.Schema(
  {
    nickname: { type: String, unique: true, required: true },
    firstName: String,
    lastName: String,

    passwordHash: { type: String, select: false },
    salt: { type: String, select: false },

    role: { type: String, default: "user", select: false },

    deletedAt: { type: Date, default: null, select: false },
  },
  { timestamps: true }
);

// --- password hashing ---
userSchema.methods.setPassword = function (password) {
  this.salt = crypto.randomBytes(16).toString("hex");
  this.passwordHash = crypto
    .pbkdf2Sync(password, this.salt, 1000, 64, "sha512")
    .toString("hex");
};

userSchema.methods.checkPassword = function (password) {
  const hash = crypto
    .pbkdf2Sync(password, this.salt, 1000, 64, "sha512")
    .toString("hex");
  return this.passwordHash === hash;
};

module.exports = mongoose.model("User", userSchema);
