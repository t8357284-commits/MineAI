require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
 
const logger = require('./utils/logger');
const { errorHandler } = require('./middleware/errorHandler');
const { authMiddleware } = require('./middleware/auth');
const { requireUser } = require('./middleware/userAuth');
const { consumeAiCredit } = require('./middleware/usage');
 
// Routes
const anthropicRoutes = require('./routes/anthropic');
const analyticsRoutes = require('./routes/analytics');
const contentRoutes = require('./routes/content');
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const projectsRoutes = require('./routes/projects');
const scriptsRoutes = require('./routes/scripts');
const adminRoutes = require('./routes/admin');
const paymentsRoutes = require('./routes/payments');
const uploadsRoutes = require('./routes/uploads');
const templatesRoutes = require('./routes/templates');
const voiceRoutes = require('./routes/voice');
 
const app = express();
const PORT = process.env.PORT || 3000;
 
// Trust first proxy (required for correct client IPs behind reverse proxies/load balancers)
app.set('trust proxy', 1);
 
// ─── Security & Middleware ────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com", "fonts.gstatic.com"],
      fontSrc: ["'self'", "fonts.gstatic.com"],
      connectSrc: ["'self'", "https://api.groq.com"],
      imgSrc: ["'self'", "data:", "blob:", "https://res.cloudinary.com"],
      mediaSrc: ["'self'", "blob:", "https://res.cloudinary.com"],
    },
  },
}));
 
app.use(compression());
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));
 
// CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:8080'];
 
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('CORS policy violation'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
 
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), { maxAge: process.env.NODE_ENV === 'production' ? '7d' : 0 }));
 
// ─── Rate Limiting ─────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'عدد كبير جداً من الطلبات، حاول بعد قليل' },
});
 
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.AI_RATE_LIMIT || '10'),
  message: { error: 'تجاوزت حد طلبات الذكاء الاصطناعي، حاول بعد دقيقة' },
});
 
app.use(globalLimiter);
 
// ─── Static Frontend ───────────────────────────────────────
app.use(express.static(path.join(__dirname, '../frontend/public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
  etag: true,
}));
 
// ─── API Routes ────────────────────────────────────────────
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiLimiter, requireUser, consumeAiCredit, anthropicRoutes);
app.use('/api/analytics', authMiddleware, analyticsRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/scripts', scriptsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/uploads', uploadsRoutes);
app.use('/api/templates', templatesRoutes);
app.use('/api/voice', voiceRoutes);
 
// ─── SPA Fallback ──────────────────────────────────────────
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});
 
// ─── Error Handler ─────────────────────────────────────────
app.use(errorHandler);
 
// ─── Start Server ─────────────────────────────────────────
app.listen(PORT, () => {
  logger.info(`🚀 SocialPulse Server running on port ${PORT}`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔑 Groq API: ${process.env.GROQ_API_KEY ? '✅ Configured' : '❌ Missing'}`);
});
 
module.exports = app;
 
