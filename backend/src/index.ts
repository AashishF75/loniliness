import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const app = express();
export const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

import authRoutes from './routes/auth.routes';
import aiRoutes from './routes/ai.routes';

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Saathi API is running perfectly.' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Saathi Backend Server running on port ${PORT}`);
});
