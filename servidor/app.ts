import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import documentRouter from './document.controller';
import { authMiddleware } from './auth.middleware';
import authRouter from './auth.controller';
import projectRouter from './project.controller';
import userRouter from './user.controller';
import onlyofficeRouter from './onlyoffice.controller';
import path from 'path';

dotenv.config();

export const app = express();

app.use(cors());
// Logging middleware
app.use((req, res, next) => {
  // Disable logging during tests to keep output clean
  if (process.env.NODE_ENV !== 'test') {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  }
  next();
});
app.use(express.json());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use('/auth', authRouter);
app.use('/projects', authMiddleware, projectRouter);
app.use('/users', authMiddleware, userRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Rutas protegidas
app.use('/documents', authMiddleware, documentRouter);
app.use('/onlyoffice', onlyofficeRouter);

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});
