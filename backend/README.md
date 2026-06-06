# AgentForge — Backend

## Prerequisites
- Node.js v18+
- Docker Desktop (must be running)
- MongoDB (local or Atlas)
- GitHub Personal Access Token
- At least one AI API key (Claude, Gemini, or OpenAI)

## Setup

1. Install dependencies
   npm install

2. Copy environment template
   cp .env.example .env

3. Fill in your .env file with actual values

4. Build the sandbox Docker image
   docker build -t agentforge-sandbox ./sandbox

5. Start the development server
   npm run dev

## Switching AI Providers

In your .env file, change AI_PROVIDER to any of:
- claude
- gemini
- openai

No code changes needed. Just update .env and restart the server.

## API Endpoints

POST   /api/repo/link         — Link a GitHub repository
GET    /api/repo/list         — List all linked repositories
POST   /api/agent/task        — Submit a new task
GET    /api/agent/task/:id    — Get task by ID
GET    /api/agent/tasks       — Get all tasks