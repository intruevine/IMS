require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3001;

function jsonBigIntReplacer(_key, value) {
  if (typeof value === 'bigint') return Number(value);
  return value;
}

// 미들웨어
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:4173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:4173', process.env.CLIENT_URL || 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('json replacer', jsonBigIntReplacer);

// 데이터베이스 초기화
const { initDatabase } = require('./db');

// 라우트
const contractsRouter = require('./routes/contracts');
const assetsRouter = require('./routes/assets');
const usersRouter = require('./routes/users');
const eventsRouter = require('./routes/events');
const membersRouter = require('./routes/members');

app.use('/api/contracts', contractsRouter);
app.use('/api/assets', assetsRouter);
app.use('/api/users', usersRouter);
app.use('/api/events', eventsRouter);
app.use('/api/members', membersRouter);

// 헬스체크
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 루트 경로 - API 정보 제공
app.get('/', (req, res) => {
  res.json({
    message: 'InTrueVine IMS API Server',
    version: '1.0.0',
    apiBase: '/api',
    endpoints: {
      users: '/api/users',
      contracts: '/api/contracts',
      assets: '/api/assets',
      events: '/api/events',
      members: '/api/members',
      health: '/health'
    },
    health: '/health'
  });
});

app.get('/api', (req, res) => {
  res.json({
    message: 'InTrueVine IMS API',
    endpoints: {
      users: '/api/users',
      contracts: '/api/contracts',
      assets: '/api/assets',
      events: '/api/events',
      members: '/api/members'
    }
  });
});

// 서버 시작
async function startServer() {
  try {
    await initDatabase();
    console.log('✅ Database initialized');
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📊 API Base URL: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
