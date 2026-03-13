import mongoose from 'mongoose';

const commissionSchema = new mongoose.Schema({
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  saleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['pendiente', 'pagada'], default: 'pendiente' },
  month: { type: Number, required: true },
  year: { type: Number, required: true }
}, { timestamps: true });

export const Commission = mongoose.model('Commission', commissionSchema);
