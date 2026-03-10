import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  amountUSD: { type: Number, required: true },
  amountVED: { type: Number, default: 0 },
  exchangeRate: { type: Number, required: true },
  method: { type: String, enum: ['cash_usd', 'cash_ved', 'transfer', 'mobile_payment'], required: true },
  bankSender: { type: String },
  bankReceiver: { type: String },
  reference: { type: String },
  phoneSender: { type: String },
  changeUSD: { type: Number, default: 0 },
  savedCreditUSD: { type: Number, default: 0 }
});

const saleSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  date: { type: Date, default: Date.now },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    priceUSD: { type: Number, required: true }
  }],
  totalUSD: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'paid'], default: 'pending' },
  payments: [paymentSchema]
}, { timestamps: true });

export const Sale = mongoose.model('Sale', saleSchema);
