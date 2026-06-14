const logger = require('../utils/logger');
 
function errorHandler(err, req, res, next) {
  logger.error(`${err.message} — ${req.method} ${req.path}`);
 
  // CORS error
  if (err.message === 'CORS policy violation') {
    return res.status(403).json({ error: 'CORS policy violation' });
  }
 
  // JSON parse errors
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
 
  // Groq API errors
  if (err.message?.includes('Groq API error')) {
    return res.status(502).json({ error: 'AI service temporarily unavailable', detail: err.message });
  }
 
  // API key missing
  if (err.message?.includes('GROQ_API_KEY')) {
    return res.status(503).json({ error: 'AI service not configured on server' });
  }
 
  // JSON parse from AI response
  if (err instanceof SyntaxError) {
    return res.status(502).json({ error: 'AI returned invalid response format' });
  }
 
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}
 
module.exports = { errorHandler };
 
