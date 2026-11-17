import path from 'path';
import { createApp } from './server/app.ts';
import { connectDatabase } from './server/db/connection.ts';

const app = createApp();

if (process.env.VERCEL) {
  void connectDatabase();
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      return next();
    }
    return res.sendFile(path.resolve(process.cwd(), 'public/index.html'));
  });
}

export default app;
