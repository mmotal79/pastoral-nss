import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  amountUSD: { type: Number, required: true },
  status: { type: String, enum: ['pagado', 'por verificar', 'anulado'], default: 'pagado' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  expenseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Expense' }
});

const payrollSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['diario', 'semanal'], required: true },
  concept: { type: String, required: true },
  amountUSD: { type: Number, required: true },
  date: { type: Date, required: true },
  status: { type: String, enum: ['pendiente', 'pagado', 'parcial', 'anulado'], default: 'pendiente' },
  payments: [paymentSchema]
}, { timestamps: true });

export const Payroll = mongoose.model('Payroll', payrollSchema);
