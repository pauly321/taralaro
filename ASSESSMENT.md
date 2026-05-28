# Security Implementation Assessment

## Course: INTE 302 - Information Assurance and Security
## Project: Social Engineering Risk Assessment and Defense Strategy
## Application: Tara Laro - Pickup Sports Coordination Platform

---

## 1. Authentication and Password Security

### Criteria: Hash passwords server-side; never store raw or reversible passwords

**How it was implemented:**

- Passwords are hashed using `bcrypt` with a cost factor of 12 before being stored in the MySQL `users` table
- The `password_hash` column stores only the bcrypt hash, never the plaintext password
- During registration (`POST /api/auth/register`), the server runs `bcrypt.hash(password, 12)` before inserting into the database
- During login (`POST /api/auth/login`), the server runs `bcrypt.compare(password, userRecord.password_hash)` to verify the submitted password against the stored hash
- The browser never sends or stores the raw password after submission; it is only transmitted once over the connection and immediately discarded

**Files involved:**
- `server/index.js` (lines for `/api/auth/register` and `/api/auth/login`)
- `MYSQL_SCRIPTS.md` (`users` table definition with `password_hash VARCHAR(255)`)

### Criteria: Add authenticated user state before allowing protected actions

**How it was implemented:**

- The frontend uses a React context (`useAuth` in `src/hooks/useAuth.tsx`) that manages the current user session
- On app load, the frontend calls `POST /api/auth/refresh` to check for an existing `HttpOnly` refresh cookie and receive a fresh access token
- The `ProtectedRoute` component in `src/routes/ProtectedRoute.tsx` blocks unauthenticated users from accessing the main app at `/` and redirects them to `/login`
- While the session is being validated on load, `isBootstrapping` is true and the route guard returns null to prevent flash of protected content

**Files involved:**
- `src/hooks/useAuth.tsx` (session bootstrap via refresh cookie)
- `src/routes/ProtectedRoute.tsx` (route guard)
- `src/App.tsx` (route definitions with protected wrapper)

### Criteria: JWT-based access control with refresh token rotation

**How it was implemented:**

- After successful login or registration, the server issues a short-lived JWT access token and stores a refresh token in a database-backed `auth_sessions` row
- The refresh token is hashed with SHA-256 before database storage and delivered to the browser as an `HttpOnly`, `Secure`, `SameSite` cookie
- The access token is kept in frontend memory only (not persisted to browser storage) and renewed on each page load via `POST /api/auth/refresh`
- Each refresh call rotates the refresh token: the old one is invalidated and a new one is issued, preventing token replay
- Logout (`POST /api/auth/logout`) revokes the refresh session in the database and clears the cookie

**Files involved:**
- `server/index.js` (refresh, logout, token hashing, cookie management)
- `server/config.js` (`jwtConfig.refreshExpiresDays`, `serverConfig.cookieSecure`)
- `src/hooks/useAuth.tsx` (bootstrap from refresh cookie, clear session on logout)
- `src/lib/auth.ts` (session storage types, `accessToken` is optional/null)

---

## 2. Role-Based Access Control

### Criteria: Replace hardcoded organizer flag with real role checks

**How it was implemented:**

- The original `HomeFeed.tsx` had `const isOrganizer = true` hardcoded, meaning everyone could see the "Post Game" button
- This was replaced with a real role check: `const isOrganizer = user?.role === 'organizer' || user?.role === 'admin'`
- The user's role comes from the database via the `user_roles` table and is included in the JWT payload and returned user profile

**Files involved:**
- `src/components/tara-laro/HomeFeed.tsx` (real role check for FAB visibility)
- `server/index.js` (role assignment during registration, role included in JWT)

### Criteria: Restrict game creation, editing, and organizer-only actions to authorized users

**How it was implemented:**

- The `POST /api/games` endpoint checks `req.authUser.role` and rejects non-organizer/non-admin users with a 403 response
- The frontend `CreateGameModal` checks `user?.role === 'organizer' || user?.role === 'admin'` and disables the submit button with a visual indicator for non-organizers
- The `GameDetails` component checks if the current user is the game organizer (`user?.id === game.organizerUserId`) and shows "You organized this game" instead of the join button
- Unauthenticated users are redirected to `/login` before they can reach any game creation or join UI

**Files involved:**
- `server/index.js` (`POST /api/games` role check)
- `src/components/tara-laro/CreateGameModal.tsx` (frontend role check, disabled submit)
- `src/components/tara-laro/GameDetails.tsx` (organizer ownership check)

---

## 3. Input Validation and Data Integrity

### Criteria: Validate game creation and profile inputs with shared schemas

**How it was implemented:**

- A shared Zod validation schema (`createGameSchema` in `src/lib/validation/game.ts`) defines rules for all game creation fields:
  - `title`: 5-150 characters
  - `courtName`: 3-150 characters
  - `sport`: must be "basketball" or "volleyball"
  - `date`: must match YYYY-MM-DD format
  - `time`: must match HH:MM format
  - `location`: 5-255 characters
  - `barangay` and `city`: 2-120 characters each
  - `slots`: 6-50, must be a whole number
  - `entryFee`: must be zero or greater (or blank for free)
  - `description`: max 1000 characters
- The same schema validates both client-side (for instant error feedback) and server-side (as the authoritative check)
- A separate `createReportSchema` validates abuse reports: category must be a valid enum, description must be 10-1000 characters

**Files involved:**
- `src/lib/validation/game.ts` (Zod schemas, `toCreateGamePayload` helper)
- `src/components/tara-laro/CreateGameModal.tsx` (client-side validation with field-level errors)
- `server/index.js` (`validateGameInput`, `validateReportInput` server-side validation)

---

## 4. Security Awareness and Policy Surfaces

### Criteria: Add a visible privacy, terms, and community safety entry point in the UI

**How it was implemented:**

- The `ProfileScreen` includes a "Compliance Center" section with three policy links: Privacy Notice, Terms of Use, and Community Safety Rules
- Clicking any link opens a `PolicyModal` that fetches policy documents from the backend (`GET /api/policies`)
- The modal displays the full policy content, version label, and published date
- Users can click "Acknowledge" to record their acknowledgment, which is stored in the `policy_acceptances` MySQL table with IP address, user agent, and timestamp
- Each acknowledgment is also logged in the `audit_logs` table as a `policy_acknowledged` event

**Files involved:**
- `src/components/tara-laro/ProfileScreen.tsx` (Compliance Center section)
- `src/components/policy/PolicyModal.tsx` (policy display, acknowledge button)
- `server/index.js` (`GET /api/policies`, `POST /api/policies/:policyId/accept`)
- `MYSQL_SCRIPTS.md` (`policy_documents`, `policy_acceptances` tables)

---

## 5. Reporting and Abuse Prevention

### Criteria: Add a way for users to report suspicious or abusive games, users, or messages

**How it was implemented:**

- The `GameDetails` screen includes a "Report this game" button that opens a `ReportIssueModal`
- The modal presents six report categories: Fraud, Unsafe Behavior, harassment, Impersonation, Spam, and Other
- Users provide a text description (10-1000 characters) explaining their concern
- The report is submitted to `POST /api/reports` which inserts it into the `abuse_reports` MySQL table with status "submitted"
- All admin users receive a notification about the new report
- The submission and each notification are recorded in the `audit_logs` table

**Files involved:**
- `src/components/tara-laro/GameDetails.tsx` (report button)
- `src/components/tara-laro/ReportIssueModal.tsx` (report form with category selection)
- `src/lib/phase1Api.ts` (`submitReport` function)
- `server/index.js` (`POST /api/reports`, admin notifications, audit logging)
- `MYSQL_SCRIPTS.md` (`abuse_reports` table)

---

## 6. Audit Logging and Incident Tracking

### Criteria: Record key actions with enough metadata for audit review

**How it was implemented:**

- Every significant user action is recorded in the `audit_logs` MySQL table with:
  - `id` (UUID)
  - `actor_user_id` (who performed the action)
  - `action_type` (e.g., `auth_login_success`, `auth_login_failed`, `auth_register_success`, `game_created`, `game_join_requested`, `report_submitted`, `policy_acknowledged`, `auth_refresh_success`, `auth_logout`)
  - `target_type` and `target_id` (what was affected)
  - `metadata_json` (additional context like email, role, sport, slots, report category)
  - `ip_address` and `user_agent` (request metadata)
  - `created_at` (timestamp)
- Failed login attempts are logged with the reason (e.g., `user_not_found`, `password_mismatch`, `status_pending_verification`)
- The `audit_logs` table is append-only in normal operation, preserving a chronological trail of all security-relevant events

**Files involved:**
- `server/index.js` (`writeAuditLog` function, called from every auth endpoint and sensitive action)
- `MYSQL_SCRIPTS.md` (`audit_logs` table definition)

---

## 7. API Endpoint Security and Transport Encryption

### Criteria: Encrypt API endpoints

**How it was implemented:**

- The server supports HTTPS via optional `TLS_KEY_PATH` and `TLS_CERT_PATH` environment variables; when set, the Node server creates an HTTPS listener directly
- For production deployment, the `REQUIRE_HTTPS` flag enables HTTP-to-HTTPS redirect behavior and activates HSTS headers
- The `helmet` middleware adds security headers to all responses: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Strict-Transport-Security` (when HTTPS is required)
- CORS is configured per environment with explicit origin allowlisting and `credentials: true` for cookie support
- The `express-rate-limit` middleware is applied to authentication endpoints (10 attempts per 15 minutes for login/register, 30 refreshes per 15 minutes, 12 reports per 15 minutes) to slow brute-force attacks

**Files involved:**
- `server/index.js` (helmet, rate limiting, HTTPS redirect, TLS server option)
- `server/config.js` (`requireHttps`, `cookieSecure`, `tlsKeyPath`, `tlsCertPath`)
- `vite.config.ts` (dev proxy to backend)

---

## 8. Session Security and Token Management

### Criteria: Safer token handling with refresh token rotation and revocation

**How it was implemented:**

- Access tokens are short-lived JWTs (default 8 hours, configurable via `JWT_EXPIRES_IN`)
- Refresh tokens are cryptographically random 48-byte hex strings, stored only as SHA-256 hashes in the `auth_sessions` MySQL table
- Refresh tokens are delivered as `HttpOnly` cookies (not accessible to JavaScript), with `Secure` and `SameSite` flags
- Each refresh call rotates the token: the old session row is updated with the new hash, preventing reuse of old refresh tokens
- The `auth_sessions` table tracks `ip_address`, `user_agent`, `last_seen_at`, and `expires_at` for each session
- Logout revokes the session in the database and clears the browser cookie

**Files involved:**
- `server/index.js` (session creation, rotation, revocation, cookie management)
- `src/hooks/useAuth.tsx` (refresh bootstrap, clear on logout)
- `src/lib/auth.ts` (session storage, access token kept in memory only)
- `MYSQL_SCRIPTS.md` (`auth_sessions` table)

---

## 9. Data Storage and Database Security

### Criteria: Proper data modeling with bcrypt hashes and structured tables

**How it was implemented:**

- The MySQL schema in `MYSQL_SCRIPTS.md` defines 10 tables covering the full security lifecycle:
  - `users` (bcrypt password hash, account status, timestamps)
  - `roles` (player, organizer, admin)
  - `user_roles` (many-to-many mapping with audit trail)
  - `auth_sessions` (hashed refresh tokens with expiry and revocation)
  - `email_verification_tokens` and `password_reset_tokens` (hashed, with expiry)
  - `games` and `game_participants` (with status tracking)
  - `policy_documents` and `policy_acceptances` (consent tracking)
  - `abuse_reports` (with status workflow)
  - `audit_logs` (append-only event trail)
  - `notifications` (user-facing event feed)
- Database views (`v_active_user_roles`, `v_open_games_with_slots`, `v_pending_reports`) provide quick compliance review queries

**Files involved:**
- `MYSQL_SCRIPTS.md` (complete schema, seed data, views, example queries)

---

## 10. Test Coverage

### Criteria: Add baseline tests for auth guards, validation, and protected UI flows

**How it was implemented:**

- The project uses `vitest` with `@testing-library/react` and `jsdom` for testing
- `src/routes/ProtectedRoute.test.tsx` verifies that:
  - Unauthenticated users are redirected to `/login`
  - Authenticated users see the protected home screen
- `src/lib/validation/game.test.ts` verifies that:
  - A valid organizer game payload passes Zod validation
  - Invalid slot counts and short titles are rejected with the correct error messages
  - Overly short abuse reports are rejected

**Files involved:**
- `vitest.config.ts` (test configuration)
- `src/test/setup.ts` (jest-dom matchers)
- `src/routes/ProtectedRoute.test.tsx` (route guard tests)
- `src/lib/validation/game.test.ts` (validation tests)

---

## 11. Project Hardening

### Criteria: Tighten project configuration for safer development

**How it was implemented:**

- `tsconfig.json` added `forceConsistentCasingInFileNames`, `noFallthroughCasesInSwitch`, and `noImplicitReturns` for stricter TypeScript checking
- `vite.config.ts` narrowed `allowedHosts` from `true` (all hosts) to `["localhost", "127.0.0.1"]` to prevent DNS rebinding attacks during development
- The `x-powered-by` header is disabled via `app.disable('x-powered-by')` to avoid fingerprinting the Express framework
- Environment variables for secrets (`JWT_SECRET`, database credentials) are loaded from `.env` files, which are excluded from git via `.gitignore`

**Files involved:**
- `tsconfig.json` (stricter compiler options)
- `vite.config.ts` (narrowed allowed hosts)
- `server/index.js` (`app.disable('x-powered-by')`)
- `.gitignore` (excludes `.env` files)

---

## 12. Documentation and Compliance Trail

### Criteria: Document the implementation for future code change review

**How it was implemented:**

- `PaulPhase1.md` documents the Phase 1 compliance plan: problem statement, scope, requirements, acceptance criteria, execution plan, and file touch points
- `PaulPhase2.md` documents the Phase 2 plan: API encryption, session hardening, and rubric alignment
- `MYSQL_SCRIPTS.md` provides the complete, executable MySQL schema with inline documentation and setup instructions
- `ASSESSMENT.md` (this file) maps every project requirement to its implementation

**Files involved:**
- `PaulPhase1.md`
- `PaulPhase2.md`
- `MYSQL_SCRIPTS.md`
- `ASSESSMENT.md`

---

## Summary Table

| Security Area | Status | Key Implementation |
|---|---|---|
| Password hashing | Done | bcrypt cost 12, server-side only |
| Authentication flow | Done | JWT access + refresh cookie + database sessions |
| Role-based access | Done | Database roles enforced in API and UI |
| Input validation | Done | Shared Zod schemas, client and server |
| Policy/consent surfaces | Done | Privacy, terms, community rules with acknowledge |
| Abuse reporting | Done | Category-based reports with admin notifications |
| Audit logging | Done | All auth and sensitive actions logged to MySQL |
| Transport encryption | Done | HTTPS support, helmet, rate limiting |
| Session security | Done | Refresh rotation, HttpOnly cookies, revocation |
| Test coverage | Done | Route guard and validation tests |
| Project hardening | Done | TypeScript strictness, host narrowing, header hiding |
| Documentation | Done | Phase 1/2 plans, schema docs, this assessment |
