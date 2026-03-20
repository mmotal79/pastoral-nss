import express from 'express';
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import { Product } from '../models/Product.js';
import { Client } from '../models/Client.js';
import { Sale } from '../models/Sale.js';
import { Order } from '../models/Order.js';
import { Expense } from '../models/Expense.js';
import { User } from '../models/User.js';
import { Settings } from '../models/Settings.js';
import { Commission } from '../models/Commission.js';
import { ExchangeRate } from '../models/ExchangeRate.js';
import cron from 'node-cron';

const router = express.Router();

// Helper function to calculate commissions automatically
async function calculateCommissions(sale: any) {
  if (sale.status !== 'paid') return 0;

  let createdCount = 0;
  try {
    const users = await User.find({ commissionPercentage: { $gt: 0 } });
    const seller = await User.findById(sale.sellerId);
    
    if (!seller) {
      console.log(`[Commissions] Sale ${sale._id} has no valid sellerId (${sale.sellerId}). Skipping.`);
      return 0;
    }

    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    for (const user of users) {
      // Check if commission already exists for this user and sale
      const existing = await Commission.findOne({ saleId: sale._id, sellerId: user._id });
      if (existing) continue;

      let shouldGetCommission = false;

      if (user.role === 'admin') {
        shouldGetCommission = true;
      } else if (user.role === 'manager') {
        // Manager gets commission for their own sales and all sellers
        if (seller.role === 'seller' || seller._id.toString() === user._id.toString()) {
          shouldGetCommission = true;
        }
      } else if (user.role === 'seller') {
        // Seller gets commission for their own sales
        if (seller._id.toString() === user._id.toString()) {
          shouldGetCommission = true;
        }
      }

      if (shouldGetCommission) {
        const amount = (sale.totalUSD * user.commissionPercentage) / 100;
        await Commission.create({
          sellerId: user._id,
          saleId: sale._id,
          amount,
          status: 'pendiente',
          month,
          year
        });
        createdCount++;
        console.log(`[Commissions] Created commission for ${user.name} on sale ${sale._id} (Amount: ${amount})`);
      }
    }
  } catch (error) {
    console.error('Error calculating commissions:', error);
  }
  return createdCount;
}

// Configure Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'tu_correo@gmail.com',
    pass: process.env.EMAIL_PASS || 'tu_contraseña_de_aplicacion'
  }
});

// Helper function to send invitation email
const sendInvitationEmail = async (email: string, name: string, role: string) => {
  try {
    const roleName = role === 'admin' ? 'Administrador' : role === 'manager' ? 'Gerente' : 'Vendedor';
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    
    const mailOptions = {
      from: `"Pastoral de Pequeñas Comunidades" <${process.env.EMAIL_USER || 'noreply@ppc.com'}>`,
      to: email,
      subject: 'Acceso otorgado al Sistema PPC',
      html: `
        <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h2 style="color: #4f46e5; text-align: center;">¡Bienvenido al Sistema PPC!</h2>
          <p>Hola <strong>${name}</strong>,</p>
          <p>Se te ha otorgado acceso al Sistema de Gestión y Control de la Pastoral de Pequeñas Comunidades.</p>
          <p>Tu rol asignado es: <strong>${roleName}</strong></p>
          <p>Para acceder al sistema, por favor haz clic en el siguiente enlace e inicia sesión utilizando esta misma cuenta de Google (${email}):</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${appUrl}/login" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Acceder al Sistema</a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">Si no esperabas este correo, por favor ignóralo.</p>
        </div>
      `
    };

    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      await transporter.sendMail(mailOptions);
      console.log(`Email de invitación enviado a ${email}`);
      return { sent: true, simulated: false };
    } else {
      console.log('Simulando envío de correo (Credenciales no configuradas):');
      console.log(`Para: ${email}, Asunto: ${mailOptions.subject}`);
      return { sent: false, simulated: true };
    }
  } catch (error) {
    console.error('Error enviando email de invitación:', error);
    return { sent: false, simulated: false, error };
  }
};

// Middleware to check DB connection
router.use((req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: 'La base de datos no está conectada. Verifica la variable MONGODB_URI en Render.' });
  }
  next();
});

// ==========================================
// EXCHANGE RATE
// ==========================================
const updateExchangeRate = async () => {
  try {
    const response = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
    if (!response.ok) throw new Error('Failed to fetch exchange rate');
    const data = await response.json();
    
    // Check if we already have this update to avoid duplicates
    const existing = await ExchangeRate.findOne({ fechaActualizacion: data.fechaActualizacion });
    if (existing) {
      console.log('Tasa ya actualizada para:', data.fechaActualizacion);
      // Update lastChecked anyway to know when we last verified it
      existing.lastChecked = new Date();
      await existing.save();
      return existing;
    }

    const newRate = await ExchangeRate.create({ 
      promedio: data.promedio, 
      fechaActualizacion: data.fechaActualizacion,
      lastChecked: new Date()
    });
    console.log('✅ Nueva tasa de cambio registrada:', data.promedio);
    return newRate;
  } catch (error) {
    console.error('❌ Error actualizando tasa de cambio:', error);
    return null;
  }
};

// Programar actualizaciones a las 6 AM y 4 PM VET (UTC-4)
// 6 AM VET = 10 AM UTC
// 4 PM VET = 8 PM UTC
cron.schedule('0 10,20 * * *', updateExchangeRate);

router.get('/exchange-rate', async (req, res) => {
  try {
    // Get the most recent rate
    let rate = await ExchangeRate.findOne().sort({ createdAt: -1 });
    
    // If no rate exists or it's older than 2 hours, try to update
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    if (!rate || rate.createdAt < twoHoursAgo) {
      console.log('Tasa de cambio ausente o antigua, intentando actualizar...');
      const updatedRate = await updateExchangeRate();
      if (updatedRate) {
        rate = updatedRate;
      }
    }
    
    res.json(rate);
  } catch (error: any) {
    console.error('Error fetching exchange rate:', error);
    res.status(500).json({ error: error.message || 'Error fetching exchange rate' });
  }
});

// Get historical rate for a specific date
router.get('/exchange-rate/history', async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'Date is required' });

    // Find the rate closest to that date (but not after)
    const targetDate = new Date(date as string);
    const rate = await ExchangeRate.findOne({
      createdAt: { $lte: targetDate }
    }).sort({ createdAt: -1 });

    if (!rate) {
      // If no historical rate found, return the oldest one we have or the current one
      const oldest = await ExchangeRate.findOne().sort({ createdAt: 1 });
      return res.json(oldest);
    }

    res.json(rate);
  } catch (error: any) {
    console.error('Error fetching historical rate:', error);
    res.status(500).json({ error: error.message || 'Error fetching historical rate' });
  }
});

// ==========================================
// AUTH & USERS
// ==========================================
router.post('/auth/verify', async (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    let user = await User.findOne({ email });
    
    // Auto-create admin if it's the specified email
    if (!user && email === 'mmotal@gmail.com') {
      user = new User({
        name: name || 'Administrador',
        email,
        role: 'admin',
        isActive: true
      });
      await user.save();
    }

    if (!user) {
      return res.status(403).json({ error: 'Acceso denegado. Usuario no autorizado.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Cuenta desactivada. Contacte al administrador.' });
    }

    res.json(user);
  } catch (error: any) {
    console.error('Error verifying user:', error);
    res.status(500).json({ error: error.message || 'Error verifying user' });
  }
});

// ==========================================
// SETTINGS
// ==========================================
router.get('/settings', async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({ companyName: 'Pastoral de Pequeñas Comunidades', logoUrl: '' });
    }
    res.json(settings);
  } catch (error: any) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: error.message || 'Error fetching settings' });
  }
});

router.put('/settings', async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (settings) {
      settings.companyName = req.body.companyName || settings.companyName;
      settings.logoUrl = req.body.logoUrl !== undefined ? req.body.logoUrl : settings.logoUrl;
      settings.corporatePhone = req.body.corporatePhone !== undefined ? req.body.corporatePhone : settings.corporatePhone;
      await settings.save();
    } else {
      settings = await Settings.create(req.body);
    }
    res.json(settings);
  } catch (error: any) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: error.message || 'Error updating settings' });
  }
});

router.get('/users', async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (error: any) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: error.message || 'Error fetching users' });
  }
});

router.post('/users', async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    
    res.status(201).json(user);
  } catch (error: any) {
    console.error('Error creating user:', error);
    res.status(400).json({ error: error.message || 'Error creating user' });
  }
});

router.put('/users/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(user);
  } catch (error: any) {
    console.error('Error updating user:', error);
    res.status(400).json({ error: error.message || 'Error updating user' });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    res.status(400).json({ error: error.message || 'Error deleting user' });
  }
});

router.post('/users/:id/send-welcome', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    const emailStatus = await sendInvitationEmail(user.email, user.name, user.role);
    res.json({ success: true, emailStatus });
  } catch (error: any) {
    console.error('Error sending welcome email:', error);
    res.status(500).json({ error: error.message || 'Error sending welcome email' });
  }
});

// ==========================================
// PRODUCTS
// ==========================================
router.get('/products', async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (error: any) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: error.message || 'Error fetching products' });
  }
});

router.get('/products/:id/image', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product || !product.imageUrl) {
      return res.status(404).send('Image not found');
    }

    const match = product.imageUrl.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
    if (match) {
      const contentType = `image/${match[1]}`;
      const base64Data = match[2];
      const buffer = Buffer.from(base64Data, 'base64');
      res.set('Content-Type', contentType);
      res.set('Cache-Control', 'public, max-age=31536000');
      return res.send(buffer);
    }

    if (product.imageUrl.startsWith('http')) {
      return res.redirect(product.imageUrl);
    }

    res.status(404).send('Invalid image format');
  } catch (error: any) {
    console.error('Error fetching product image:', error);
    res.status(500).send('Error fetching image');
  }
});

router.get('/products/:id/image.jpg', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product || !product.imageUrl) {
      return res.status(404).send('Image not found');
    }

    const match = product.imageUrl.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
    if (match) {
      const contentType = `image/${match[1]}`;
      const base64Data = match[2];
      const buffer = Buffer.from(base64Data, 'base64');
      res.set('Content-Type', contentType);
      res.set('Cache-Control', 'public, max-age=31536000');
      return res.send(buffer);
    }

    if (product.imageUrl.startsWith('http')) {
      return res.redirect(product.imageUrl);
    }

    res.status(404).send('Invalid image format');
  } catch (error: any) {
    console.error('Error fetching product image:', error);
    res.status(500).send('Error fetching image');
  }
});

router.post('/products', async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.status(201).json(product);
  } catch (error: any) {
    console.error('Error creating product:', error);
    res.status(400).json({ error: error.message || 'Error creating product' });
  }
});

router.put('/products/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(product);
  } catch (error: any) {
    console.error('Error updating product:', error);
    res.status(400).json({ error: error.message || 'Error updating product' });
  }
});

router.delete('/products/:id', async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting product:', error);
    res.status(400).json({ error: error.message || 'Error deleting product' });
  }
});

// ==========================================
// CLIENTS
// ==========================================
router.get('/clients', async (req, res) => {
  try {
    const clients = await Client.find().sort({ createdAt: -1 });
    res.json(clients);
  } catch (error: any) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ error: error.message || 'Error fetching clients' });
  }
});

router.post('/clients', async (req, res) => {
  try {
    const client = new Client(req.body);
    await client.save();
    res.status(201).json(client);
  } catch (error: any) {
    console.error('Error creating client:', error);
    res.status(400).json({ error: error.message || 'Error creating client' });
  }
});

router.put('/clients/:id', async (req, res) => {
  try {
    const client = await Client.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(client);
  } catch (error: any) {
    console.error('Error updating client:', error);
    res.status(400).json({ error: error.message || 'Error updating client' });
  }
});

router.delete('/clients/:id', async (req, res) => {
  try {
    await Client.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting client:', error);
    res.status(400).json({ error: error.message || 'Error deleting client' });
  }
});

// ==========================================
// SALES
// ==========================================
router.get('/sales', async (req, res) => {
  try {
    const sales = await Sale.find().populate('clientId').sort({ date: -1 });
    res.json(sales);
  } catch (error: any) {
    console.error('Error fetching sales:', error);
    res.status(500).json({ error: error.message || 'Error fetching sales' });
  }
});

router.post('/sales', async (req, res) => {
  try {
    const sale = new Sale(req.body);
    await sale.save();
    
    // Update product stock
    if (sale.items && sale.items.length > 0) {
      for (const item of sale.items) {
        await Product.findByIdAndUpdate(item.productId, { $inc: { stock: -item.quantity } });
      }
    }
    
    // Calculate commissions if sale is paid
    if (sale.status === 'paid') {
      await calculateCommissions(sale);
    }
    
    res.status(201).json(sale);
  } catch (error: any) {
    console.error('Error creating sale:', error);
    res.status(400).json({ error: error.message || 'Error creating sale' });
  }
});

router.put('/sales/:id', async (req, res) => {
  try {
    const originalSale = await Sale.findById(req.params.id);
    const sale = await Sale.findByIdAndUpdate(req.params.id, req.body, { new: true });
    
    // Calculate commissions if sale became paid
    if (sale && sale.status === 'paid' && (!originalSale || originalSale.status !== 'paid')) {
      await calculateCommissions(sale);
    }
    
    res.json(sale);
  } catch (error: any) {
    console.error('Error updating sale:', error);
    res.status(400).json({ error: error.message || 'Error updating sale' });
  }
});

router.delete('/sales/:id', async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (sale && sale.items && sale.items.length > 0) {
      // Restore product stock
      for (const item of sale.items) {
        await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity } });
      }
    }
    await Sale.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting sale:', error);
    res.status(400).json({ error: error.message || 'Error deleting sale' });
  }
});

// ==========================================
// ORDERS
// ==========================================
router.get('/orders', async (req, res) => {
  try {
    const orders = await Order.find().populate('clientId').sort({ orderDate: -1 });
    res.json(orders);
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: error.message || 'Error fetching orders' });
  }
});

router.post('/orders', async (req, res) => {
  try {
    const order = new Order(req.body);
    await order.save();
    res.status(201).json(order);
  } catch (error: any) {
    console.error('Error creating order:', error);
    res.status(400).json({ error: error.message || 'Error creating order' });
  }
});

router.put('/orders/:id', async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(order);
  } catch (error: any) {
    console.error('Error updating order:', error);
    res.status(400).json({ error: error.message || 'Error updating order' });
  }
});

router.delete('/orders/:id', async (req, res) => {
  try {
    await Order.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting order:', error);
    res.status(400).json({ error: error.message || 'Error deleting order' });
  }
});

// ==========================================
// EXPENSES
// ==========================================
router.get('/expenses', async (req, res) => {
  try {
    const expenses = await Expense.find().sort({ date: -1 });
    res.json(expenses);
  } catch (error: any) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ error: error.message || 'Error fetching expenses' });
  }
});

router.post('/expenses', async (req, res) => {
  try {
    const expense = new Expense(req.body);
    await expense.save();
    res.status(201).json(expense);
  } catch (error: any) {
    console.error('Error creating expense:', error);
    res.status(400).json({ error: error.message || 'Error creating expense' });
  }
});

router.put('/expenses/:id', async (req, res) => {
  try {
    const expense = await Expense.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(expense);
  } catch (error: any) {
    console.error('Error updating expense:', error);
    res.status(400).json({ error: error.message || 'Error updating expense' });
  }
});

router.delete('/expenses/:id', async (req, res) => {
  try {
    await Expense.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting expense:', error);
    res.status(400).json({ error: error.message || 'Error deleting expense' });
  }
});

// ==========================================
// COMMISSIONS
// ==========================================
router.get('/commissions', async (req, res) => {
  try {
    const commissions = await Commission.find().sort({ createdAt: -1 });
    res.json(commissions);
  } catch (error: any) {
    console.error('Error fetching commissions:', error);
    res.status(500).json({ error: error.message || 'Error fetching commissions' });
  }
});

router.post('/commissions', async (req, res) => {
  try {
    const commission = new Commission(req.body);
    await commission.save();
    res.status(201).json(commission);
  } catch (error: any) {
    console.error('Error creating commission:', error);
    res.status(400).json({ error: error.message || 'Error creating commission' });
  }
});

router.post('/commissions/:id/payments', async (req, res) => {
  try {
    const { amount, date, createdBy } = req.body;
    const commission = await Commission.findById(req.params.id);
    if (!commission) return res.status(404).json({ error: 'Commission not found' });

    const receiver = await User.findById(commission.sellerId);
    const creator = await User.findById(createdBy);
    if (!receiver || !creator) return res.status(400).json({ error: 'Invalid user info' });

    let paymentStatus = 'pagado';
    if (creator.role === 'manager' && receiver.role === 'admin') {
      paymentStatus = 'por verificar';
    } else if (creator.role === 'admin') {
      paymentStatus = 'pagado';
    }

    let expenseId = null;
    
    // Only create expense if status is 'pagado'
    if (paymentStatus === 'pagado') {
      const currentRate = await ExchangeRate.findOne().sort({ fechaActualizacion: -1 });
      const rateValue = currentRate ? currentRate.promedio : 1;
      const sale = await Sale.findById(commission.saleId);
      const ref = sale ? sale._id.toString().substring(0, 8) : `${commission.month + 1}/${commission.year}`;

      // Category: 'services' for admin (Pago de servicios a Proveedor), 'payroll' for others (Nómina)
      const category = receiver.role === 'admin' ? 'services' : 'payroll';

      const expense = new Expense({
        description: `Pago de Comisión - ${receiver.name} - Ref: ${ref}`,
        amountUSD: amount,
        amountVED: amount * rateValue,
        exchangeRate: rateValue,
        category: category,
        date: date || new Date()
      });
      await expense.save();
      expenseId = expense._id;
    }

    const payment = {
      date: date || new Date(),
      amount,
      expenseId,
      status: paymentStatus,
      createdBy
    };

    commission.payments.push(payment);

    // Recalculate commission status
    const totalPaid = commission.payments
      .filter(p => p.status === 'pagado')
      .reduce((sum, p) => sum + p.amount, 0);
    
    const hasPendingVerification = commission.payments.some(p => p.status === 'por verificar');

    if (hasPendingVerification) {
      commission.status = 'por verificar';
    } else if (totalPaid >= commission.amount) {
      commission.status = 'pagada';
    } else {
      commission.status = 'pendiente';
    }

    await commission.save();
    res.json(commission);
  } catch (error: any) {
    console.error('Error adding commission payment:', error);
    res.status(500).json({ error: error.message || 'Error adding commission payment' });
  }
});

router.delete('/commissions/:id/payments/:paymentId', async (req, res) => {
  try {
    const commission = await Commission.findById(req.params.id);
    if (!commission) return res.status(404).json({ error: 'Commission not found' });

    const paymentIndex = commission.payments.findIndex(p => p._id.toString() === req.params.paymentId);
    if (paymentIndex === -1) return res.status(404).json({ error: 'Payment not found' });

    const payment = commission.payments[paymentIndex];
    
    // Cancel linked expense
    if (payment.expenseId) {
      await Expense.findByIdAndUpdate(payment.expenseId, { status: 'anulado' });
    }

    commission.payments.splice(paymentIndex, 1);

    // Recalculate commission status
    const totalPaid = commission.payments
      .filter(p => p.status === 'pagado')
      .reduce((sum, p) => sum + p.amount, 0);
    
    const hasPendingVerification = commission.payments.some(p => p.status === 'por verificar');

    if (hasPendingVerification) {
      commission.status = 'por verificar';
    } else if (totalPaid >= commission.amount) {
      commission.status = 'pagada';
    } else {
      commission.status = 'pendiente';
    }

    await commission.save();
    res.json(commission);
  } catch (error: any) {
    console.error('Error deleting commission payment:', error);
    res.status(500).json({ error: error.message || 'Error deleting commission payment' });
  }
});

router.patch('/commissions/:id/payments/:paymentId/revert', async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Solo los administradores pueden reversar pagos.' });
    }

    const commission = await Commission.findById(req.params.id);
    if (!commission) return res.status(404).json({ error: 'Commission not found' });

    const payment = commission.payments.id(req.params.paymentId);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    payment.status = 'por verificar';

    // Annul linked expense if it exists
    if (payment.expenseId) {
      await Expense.findByIdAndUpdate(payment.expenseId, { status: 'anulado' });
    }

    // Recalculate commission status
    const totalPaid = commission.payments
      .filter(p => p.status === 'pagado')
      .reduce((sum, p) => sum + p.amount, 0);
    
    const hasPendingVerification = commission.payments.some(p => p.status === 'por verificar');

    if (hasPendingVerification) {
      commission.status = 'por verificar';
    } else if (totalPaid >= commission.amount) {
      commission.status = 'pagada';
    } else {
      commission.status = 'pendiente';
    }

    await commission.save();
    res.json(commission);
  } catch (error: any) {
    console.error('Error reverting commission payment:', error);
    res.status(500).json({ error: error.message || 'Error reverting commission payment' });
  }
});

router.patch('/commissions/:id/payments/:paymentId/validate', async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Solo los administradores pueden validar pagos.' });
    }

    const commission = await Commission.findById(req.params.id);
    if (!commission) return res.status(404).json({ error: 'Commission not found' });

    const payment = commission.payments.id(req.params.paymentId);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    payment.status = 'pagado';

    // Create expense if not already created
    if (!payment.expenseId) {
      const receiver = await User.findById(commission.sellerId);
      const currentRate = await ExchangeRate.findOne().sort({ fechaActualizacion: -1 });
      const rateValue = currentRate ? currentRate.promedio : 1;
      const sale = await Sale.findById(commission.saleId);
      const ref = sale ? sale._id.toString().substring(0, 8) : `${commission.month + 1}/${commission.year}`;

      const category = receiver?.role === 'admin' ? 'services' : 'payroll';

      const expense = new Expense({
        description: `Pago de Comisión - ${receiver?.name || 'Vendedor'} - Ref: ${ref}`,
        amountUSD: payment.amount,
        amountVED: payment.amount * rateValue,
        exchangeRate: rateValue,
        category: category,
        date: new Date()
      });
      await expense.save();
      payment.expenseId = expense._id;
    } else {
      // If expense exists but was annulled, reactivate it
      await Expense.findByIdAndUpdate(payment.expenseId, { status: 'active' });
    }

    // Recalculate commission status
    const totalPaid = commission.payments
      .filter(p => p.status === 'pagado')
      .reduce((sum, p) => sum + p.amount, 0);
    
    const hasPendingVerification = commission.payments.some(p => p.status === 'por verificar');

    if (hasPendingVerification) {
      commission.status = 'por verificar';
    } else if (totalPaid >= commission.amount) {
      commission.status = 'pagada';
    } else {
      commission.status = 'pendiente';
    }

    await commission.save();
    res.json(commission);
  } catch (error: any) {
    console.error('Error validating commission payment:', error);
    res.status(500).json({ error: error.message || 'Error validating commission payment' });
  }
});

router.put('/commissions/:id', async (req, res) => {
  try {
    const commission = await Commission.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(commission);
  } catch (error: any) {
    console.error('Error updating commission:', error);
    res.status(400).json({ error: error.message || 'Error updating commission' });
  }
});

router.post('/commissions/regularize', async (req, res) => {
  try {
    const { month, year } = req.body;
    if (month === undefined || year === undefined) {
      return res.status(400).json({ error: 'Month and year are required' });
    }

    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59);

    const sales = await Sale.find({
      status: 'paid',
      date: { $gte: startDate, $lte: endDate }
    });

    let salesProcessed = 0;
    let commissionsCreated = 0;
    for (const sale of sales) {
      const created = await calculateCommissions(sale);
      if (created > 0) {
        commissionsCreated += created;
      }
      salesProcessed++;
    }

    res.json({ 
      success: true, 
      salesProcessed, 
      commissionsCreated,
      message: `Se regularizaron ${salesProcessed} ventas y se generaron ${commissionsCreated} comisiones nuevas.` 
    });
  } catch (error: any) {
    console.error('Error regularizing commissions:', error);
    res.status(500).json({ error: error.message || 'Error regularizing commissions' });
  }
});

router.post('/commissions/process-cut', async (req, res) => {
  try {
    const { month, year } = req.body;
    if (month === undefined || year === undefined) {
      return res.status(400).json({ error: 'Month and year are required' });
    }

    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59);

    const sales = await Sale.find({
      status: 'paid',
      date: { $gte: startDate, $lte: endDate }
    });

    let salesProcessed = 0;
    let commissionsCreated = 0;
    for (const sale of sales) {
      const created = await calculateCommissions(sale);
      if (created > 0) {
        commissionsCreated += created;
      }
      salesProcessed++;
    }

    res.json({ 
      success: true, 
      salesProcessed, 
      commissionsCreated,
      message: `Corte procesado: ${salesProcessed} ventas analizadas, ${commissionsCreated} comisiones generadas.` 
    });
  } catch (error: any) {
    console.error('Error processing commissions cut:', error);
    res.status(500).json({ error: error.message || 'Error processing commissions cut' });
  }
});

router.post('/utils/shorten', async (req, res) => {
  try {
    const { longUrl } = req.body;
    if (!longUrl) return res.status(400).json({ error: 'longUrl is required' });

    const bitlyToken = process.env.BITLY_TOKEN;
    if (!bitlyToken) {
      console.warn('BITLY_TOKEN not configured, returning original URL');
      return res.json({ link: longUrl });
    }

    const response = await fetch('https://api-ssl.bitly.com/v4/shorten', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${bitlyToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ long_url: longUrl })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Bitly error:', errorData);
      return res.json({ link: longUrl });
    }

    const data = await response.json();
    res.json({ link: data.link });
  } catch (error: any) {
    console.error('Error shortening URL:', error);
    res.status(500).json({ error: error.message || 'Error shortening URL' });
  }
});

export default router;
