require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const connectDB = require('./config/database');
const { initializeSocketServer } = require('./websocket/socketServer');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003',
    'http://localhost:3004',
    'http://localhost:3005'
  ].filter(Boolean),
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Static folder for uploads
app.use('/uploads', express.static('uploads'));

const { standardLimiter, authLimiter, widgetLimiter } = require('./middleware/rateLimiter');

// API Routes
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/chats', standardLimiter, require('./routes/chats'));
app.use('/api/messages', standardLimiter, require('./routes/messages'));
app.use('/api/visitors', standardLimiter, require('./routes/visitors'));
app.use('/api/agents', standardLimiter, require('./routes/agents'));
app.use('/api/departments', standardLimiter, require('./routes/departments'));
app.use('/api/roles', standardLimiter, require('./routes/roles'));
app.use('/api/shortcuts', standardLimiter, require('./routes/shortcuts'));
app.use('/api/triggers', standardLimiter, require('./routes/triggers'));
app.use('/api/analytics', standardLimiter, require('./routes/analytics'));
app.use('/api/widget', widgetLimiter, require('./routes/widget'));
app.use('/api/tickets', standardLimiter, require('./routes/tickets'));
app.use('/api/ratings', standardLimiter, require('./routes/ratings'));
app.use('/api/kb', standardLimiter, require('./routes/kb'));
app.use('/api/admin', standardLimiter, require('./routes/admin'));
app.use('/api/upload', standardLimiter, require('./routes/upload'));
app.use('/api/omni', standardLimiter, require('./routes/omni'));
app.use('/api/issue-categories', standardLimiter, require('./routes/issueCategories'));
app.use('/api/subscriptions', standardLimiter, require('./routes/subscriptions'));


// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// Initialize Socket.IO
initializeSocketServer(server);

// Start Auto Rules Service (Lifecycle management)
const { startAutoRulesService } = require('./services/autoRulesService');
startAutoRulesService();

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server ready`);
});

module.exports = app;
