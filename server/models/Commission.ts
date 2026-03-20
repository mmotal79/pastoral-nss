import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  amount: { type: Number, required: true },
  expenseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Expense' },
  status: { type: String, enum: ['pagado', 'por verificar', 'anulado'], default: 'pagado' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});

const commissionSchema = new mongoose.Schema({
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  saleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['pendiente', 'pagada', 'por verificar'], default: 'pendiente' },
  month: { type: Number, required: true },
  year: { type: Number, required: true },
  payments: [paymentSchema]
}, { timestamps: true });

export const Commission = mongoose.model('Commission', commissionSchema);
