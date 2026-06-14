const express = require('express');
const prisma = require('../utils/prisma');
const router = express.Router();

router.get('/ping', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.get('/ready', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ready', database: 'connected', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: 'not_ready', database: 'disconnected', error: err.message });
  }
});

module.exports = router;
