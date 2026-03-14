import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: { type: String },
    quantity: { type: Number, default: 1 },
    priceUSD: { type: Number, default: 0 }
  }],
  itemDescription: { type: String },
  estimatedCostUSD: { type: Number, required: true },
  orderDate: { type: Date, default: Date.now },
  deliveryDate: { type: Date, required: true },
  status: { type: String, enum: ['pending', 'in_progress', 'completed', 'transferred_to_sale'], default: 'pending' }
}, { timestamps: true });

export const Order = mongoose.model('Order', orderSchema);
