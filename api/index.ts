import type { Request, Response } from 'express';
import { createApp } from '../apps/api/src/app';
import { connectDB } from '../apps/api/src/config/db';

let isDbConnected = false;
const app = createApp();

export default async function handler(req: Request, res: Response) {
  if (!isDbConnected && process.env.MONGODB_URI) {
    try {
      await connectDB();
      isDbConnected = true;
    } catch (err) {
      console.warn('MongoDB connection error in serverless handler:', err);
    }
  }
  return app(req, res);
}
