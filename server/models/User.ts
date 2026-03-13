import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: false },
  role: { type: String, enum: ['admin', 'seller', 'manager'], default: 'seller' },
  isActive: { type: Boolean, default: true },
  commissionPercentage: { type: Number, default: 0, min: 0, max: 100 },
  periodicSalary: { type: Number, default: 0 },
  salaryFrequency: { type: String, enum: ['diario', 'semanal', 'quincenal', 'mensual', 'anual'], default: 'mensual' }
}, { timestamps: true });

export const User = mongoose.model('User', userSchema);
