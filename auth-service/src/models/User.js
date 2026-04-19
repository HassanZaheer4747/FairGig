const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  role: { type: String, enum: ['worker', 'verifier', 'advocate'], default: 'worker' },
  city: { type: String, enum: ['Lahore', 'Karachi', 'Islamabad'], default: 'Lahore' },
  platform: { type: String, enum: ['Uber', 'Foodpanda', 'Fiverr', 'Multiple', 'Other'], default: 'Other' },
  isActive: { type: Boolean, default: true },
  profileImage: { type: String, default: null },
  phone: { type: String, default: null },
  joinedDate: { type: Date, default: Date.now },
}, { timestamps: true });

userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ city: 1 });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toPublic = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
