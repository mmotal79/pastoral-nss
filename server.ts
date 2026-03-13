import express from 'express';
import { createServer as createViteServer } from 'vite';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRoutes from './server/routes/api.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Conexión a MongoDB
  let dbConnected = false;
  const connectDB = async () => {
    if (dbConnected) return;
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.warn('⚠️ MONGODB_URI no está definido en las variables de entorno. La base de datos no se conectará.');
      return;
    }
    try {
      await mongoose.connect(uri);
      dbConnected = true;
      console.log('✅ Conectado a MongoDB Atlas');
      
      // Intentar eliminar índice problemático si existe
      try {
        await mongoose.connection.collection('clients').dropIndex('documentId_1');
        console.log('✅ Índice documentId_1 eliminado de la colección clients');
      } catch (e) {
        // Ignorar si el índice no existe
      }
    } catch (err: any) {
      if (err.message && err.message.includes('bad auth')) {
        console.error('❌ Error de Autenticación en MongoDB: Usuario o contraseña incorrectos en MONGODB_URI.');
        console.error('👉 Por favor, verifica tus credenciales en el panel de Secrets de AI Studio.');
      } else {
        console.error('❌ Error conectando a MongoDB:', err.message || err);
      }
    }
  };
  
  // Intentar conectar al iniciar
  if (process.env.MONGODB_URI) {
    connectDB();
  }

  // ==========================================
  // RUTAS DE LA API (Backend)
  // ==========================================
  
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', dbConnected, message: 'API de Pastoral de Pequeñas Comunidades funcionando' });
  });

  // Importar y usar las rutas
  app.use('/api', apiRoutes);

  // ==========================================
  // CONFIGURACIÓN DE VITE (Frontend)
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // En producción, servir archivos estáticos de la carpeta dist
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  });
}

startServer();
