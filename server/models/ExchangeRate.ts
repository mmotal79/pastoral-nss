import mongoose from 'mongoose';

const exchangeRateSchema = new mongoose.Schema({
  promedio: { type: Number, required: true },
  fechaActualizacion: { type: String, required: true },
  lastChecked: { type: Date, default: Date.now }
}, { timestamps: true });

export const ExchangeRate = mongoose.model('ExchangeRate', exchangeRateSchema);
