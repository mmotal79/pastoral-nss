import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  costUSD: { type: Number, required: true },
  priceUSD: { type: Number, required: true },
  stock: { type: Number, default: 0 },
  imageUrl: { type: String }, // Base64 o URL
  socialDescription: { type: String } // Descripción optimizada para redes sociales
}, { timestamps: true });

export const Product = mongoose.model('Product', productSchema);
