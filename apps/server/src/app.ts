import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import 'dotenv/config';

import prisma from './lib/prisma';
import passport from './lib/passport';
import { errorHandler } from './middleware/errorHandler';
import authRouter from './routes/auth.routes';
import playlistRouter from './routes/playlist.routes';
import userRouter from './routes/user.routes';

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL?.trim(), credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Session is used only for Passport's OAuth state management during the Google redirect window.
app.use(
  session({
    secret: process.env.JWT_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 10 * 60 * 1000,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session()); // needed so Passport can read the session-stored OAuth state on the Google callback

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get('/health', async (_req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ success: true, data: { status: 'ok', db: 'connected' } });
  } catch (err) {
    next(err);
  }
});

app.use('/api/auth', authRouter);
app.use('/api/playlists', playlistRouter);
app.use('/api/user', userRouter);

app.use(errorHandler);

export default app;
