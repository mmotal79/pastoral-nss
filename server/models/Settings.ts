import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  companyName: { type: String, required: true, default: 'Pastoral de Pequeñas Comunidades' },
  logoUrl: { type: String, default: '' },
}, { timestamps: true });

export const Settings = mongoose.model('Settings', settingsSchema);
