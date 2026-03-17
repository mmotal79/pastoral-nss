import mongoose from 'mongoose';

const exchangeRateSchema = new mongoose.Schema({
  promedio: { type: Number, required: true },
  fechaActualizacion: { type: String, required: true },
  lastChecked: { type: Date, default: Date.now }
}, { timestamps: true });

// Index by date for faster historical lookups
exchangeRateSchema.index({ createdAt: -1 });
exchangeRateSchema.index({ fechaActualizacion: -1 });

export const ExchangeRate = mongoose.model('ExchangeRate', exchangeRateSchema);
