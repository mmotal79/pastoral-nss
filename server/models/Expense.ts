import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  description: { type: String, required: true },
  category: { type: String, enum: ['supplies', 'materials', 'equipment', 'services', 'payroll', 'other'], required: true },
  amountUSD: { type: Number, required: true },
  amountVED: { type: Number, default: 0 },
  exchangeRate: { type: Number, required: true },
  status: { type: String, enum: ['active', 'anulado'], default: 'active' }
}, { timestamps: true });

export const Expense = mongoose.model('Expense', expenseSchema);
