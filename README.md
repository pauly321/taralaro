# Tara Laro

Tara Laro is a college project pickup sports platform built with `React + Vite + TypeScript`, `Node.js + Express`, and `MySQL`.

It includes:
- user registration and login
- bcrypt password hashing
- JWT access tokens
- refresh-session support with `HttpOnly` cookies
- role-based access for `player`, `organizer`, and `admin`
- game creation and join requests
- abuse reporting, policy acknowledgment, and audit logging

## Tech Stack

- Frontend: `React`, `TypeScript`, `Vite`
- Backend: `Node.js`, `Express`
- Database: `MySQL 8`
- Auth: `bcrypt`, `JWT`

## Project Files

- `MYSQL_SCRIPTS.md` - database setup and SQL scripts
- `PaulPhase1.md` - Phase 1 security implementation plan
- `PaulPhase2.md` - Phase 2 security hardening plan
- `ASSESSMENT.md` - explanation of implemented security criteria
- `BRIEFER.md` - student-style report answer based on the project brief

## Prerequisites

Before starting, make sure you have:
- `Node.js` 18+
- `npm`
- `MySQL 8`

## 1. Clone From GitLab

```bash
git clone <your-gitlab-repo-url>
cd taralaro
```

## 2. Install Dependencies

```bash
npm install
```

## 3. Create Environment File

Copy `.env.example` to `.env`.

Example:

```env
PORT=3001
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=tara_laro
CORS_ORIGIN=http://localhost:5173
VITE_API_BASE_URL=http://localhost:3001/api
JWT_SECRET=change-this-jwt-secret
JWT_EXPIRES_IN=8h
JWT_REFRESH_EXPIRES_DAYS=7
TRUST_PROXY=1
REQUIRE_HTTPS=false
COOKIE_SECURE=false
COOKIE_DOMAIN=
TLS_KEY_PATH=
TLS_CERT_PATH=
```

For a simple college demo, keep:
- `REQUIRE_HTTPS=false`
- `COOKIE_SECURE=false`

## 4. Set Up The Database Using `MYSQL_SCRIPTS.md`

Use `MYSQL_SCRIPTS.md` as the source of truth for the database.

### Recommended Order

Run the SQL sections in this order:
1. Database bootstrap
2. Users, roles, and authentication
3. Games and participation
4. Policies and consent tracking
5. Reporting and auditability
6. Notifications
7. Views
8. Seed data

### Option A: Manual Setup

Open your MySQL client, then copy and run the SQL blocks from:

`MYSQL_SCRIPTS.md`

### Option B: Seed Demo Data After Tables Exist

After the tables are created, run:

```bash
npm run seed:auth-demo
```

This will add:
- demo users
- roles
- sample games
- policy documents
- notifications

## 5. Start The Backend Server

```bash
npm run server
```

For watch mode during development:

```bash
npm run dev:server
```

Backend default URL:

`http://localhost:3001`

## 6. Start The Frontend

Open a second terminal and run:

```bash
npm run dev
```

Frontend default URL:

`http://localhost:5173`

## 7. Demo Accounts

After running `npm run seed:auth-demo`, you can log in with:

- `admin@taralaro.local` / `AdminPass123!`
- `organizer@taralaro.local` / `OrganizerPass123!`
- `player@taralaro.local` / `PlayerPass123!`

## Build And Test

### Run Tests

```bash
npm test
```

### Build Project

```bash
npm run build
```

## Common Commands

```bash
npm install
npm run server
npm run dev
npm run seed:auth-demo
npm test
npm run build
```

## Simple Startup Checklist

If you only want the fastest setup for a classroom demo:

1. `npm install`
2. Copy `.env.example` to `.env`
3. Create the database from `MYSQL_SCRIPTS.md`
4. `npm run seed:auth-demo`
5. `npm run server`
6. `npm run dev`
7. Open `http://localhost:5173`

## Notes

- `MYSQL_SCRIPTS.md` must be used for database setup
- `ASSESSMENT.md` explains which security criteria were implemented
- `BRIEFER.md` can be used as a guide for the written report
- For a college project, local HTTP mode is acceptable for demo use
- HTTPS support exists, but it is optional unless your instructor specifically requires encrypted deployment
