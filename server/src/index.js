import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import './db.js';
import { ensureSeed } from './seed.js';
import { brevoConfigured } from './mailer.js';
import { cloudinaryConfigured } from './cloudinary.js';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import categoryRoutes from './routes/categories.js';
import corridorRoutes from './routes/corridors.js';
import groupageRoutes from './routes/groupages.js';
import shipmentRoutes from './routes/shipments.js';
import quoteRoutes from './routes/quotes.js';
import clientRoutes from './routes/clients.js';
import settingsRoutes from './routes/settings.js';
import mediaRoutes from './routes/media.js';
import statsRoutes from './routes/stats.js';

// Crée l'admin, la fiche tarifaire et un jeu de démo si la base est vide
ensureSeed();

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => res.json({
  ok: true,
  service: 'edop',
  time: new Date().toISOString(),
  integrations: { cloudinary: cloudinaryConfigured(), brevo: brevoConfigured() }
}));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/corridors', corridorRoutes);
app.use('/api/groupages', groupageRoutes);
app.use('/api/shipments', shipmentRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/stats', statsRoutes);

app.use((req, res) => res.status(404).json({ error: 'Route introuvable' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Erreur serveur' });
});

// API_PORT dédié : évite toute collision avec un PORT injecté par l'outil de preview (Vite = 5173)
const PORT = process.env.API_PORT || 4000;
app.listen(PORT, () => {
  console.log(`\n  📦  E-DOP API — http://localhost:${PORT}`);
  console.log(`      Cloudinary : ${cloudinaryConfigured() ? 'configuré' : 'non configuré (uploads désactivés)'}`);
  console.log(`      Brevo      : ${brevoConfigured() ? 'configuré' : 'non configuré (emails journalisés seulement)'}\n`);
});
