# CRM Dashboard - Backend API

RESTful API server built with Node.js, Express, and PostgreSQL.

## Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Run migrations
npm run db:migrate

# Seed default user
npm run db:seed

# Start server (development)
npm run dev

# Start server (production)
npm start
```

Server runs at: http://localhost:5000

## Environment Variables

```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=crm_dashboard
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:3000
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register user |
| POST | /api/auth/login | Login user |
| GET | /api/auth/me | Get current user |
| GET | /api/users | List users (admin) |
| POST | /api/users | Create user (admin) |
| PUT | /api/users/:id | Update user (admin) |
| DELETE | /api/users/:id | Delete user (admin) |
| GET | /api/dashboard/overview | Dashboard stats |

## Default Login

- **Email:** vijaybabu@gmail.com
- **Password:** Testing@123

## Scripts

| Command | Description |
|---------|-------------|
| npm run dev | Start with hot reload |
| npm start | Start production |
| npm test | Run tests |
| npm run db:migrate | Run migrations |
| npm run db:seed | Seed database |
