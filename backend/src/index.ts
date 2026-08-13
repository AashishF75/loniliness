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
import userRoutes from './routes/user.routes';
import connectionRoutes from './routes/connection.routes';
import messageRoutes from './routes/message.routes';
import notificationRoutes from './routes/notification.routes';
import safetyRoutes from './routes/safety.routes';

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/users', userRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/safety', safetyRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Saathi API is running perfectly.' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Saathi Backend Server running on port ${PORT}`);
});
