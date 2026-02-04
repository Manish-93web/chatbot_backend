# Backend - Live Chat Platform

Express.js backend server with MongoDB and Socket.IO for real-time chat.

## Setup

1. **Install MongoDB**
   - Download and install MongoDB from https://www.mongodb.com/try/download/community
   - Start MongoDB service

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   - Copy `.env.example` to `.env`
   - Update MongoDB URI if needed

4. **Seed Database**
   ```bash
   npm run seed
   ```

5. **Start Server**
   ```bash
   npm run dev
   ```

Server will run on `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current agent

### Chats
- `GET /api/chats` - List chats
- `POST /api/chats` - Create chat
- `GET /api/chats/:id` - Get chat
- `PUT /api/chats/:id` - Update chat
- `DELETE /api/chats/:id` - Delete chat

### Messages
- `GET /api/messages/:chatId` - Get messages
- `POST /api/messages/:chatId` - Send message

### Visitors
- `GET /api/visitors` - List visitors
- `POST /api/visitors` - Track visitor
- `GET /api/visitors/:id` - Get visitor
- `PUT /api/visitors/:id` - Update visitor

### Agents
- `GET /api/agents` - List agents
- `POST /api/agents` - Create agent
- `GET /api/agents/:id` - Get agent
- `PUT /api/agents/:id` - Update agent
- `DELETE /api/agents/:id` - Delete agent

### Analytics
- `GET /api/analytics/overview` - Overview metrics
- `GET /api/analytics/agents` - Agent performance

### Widget
- `GET /api/widget/config` - Get config
- `PUT /api/widget/config` - Update config

## Demo Accounts

- **Admin:** john@company.com / password123
- **Agent:** sarah@company.com / password123
- **Agent:** mike@company.com / password123
