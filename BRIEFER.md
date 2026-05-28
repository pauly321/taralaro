# Secure Systems Development: Security Implementation Report

**Name:** Paul Alcaraz
**Year and Section:** [Your Year and Section]
**Course:** INTE 302 - Information Assurance and Security
**Instructor:** Cristian Balatbat, MIT
**Academic Year:** SY 2025-2026, 2nd Semester

---

## System Overview

### Description of System

Tara Laro is a pickup sports coordination platform that allows users to discover, create, and join local basketball and volleyball games. Users can browse available games, filter by sport and location, join games as players, and organizers can create and manage game events. The system also includes user registration, login, abuse reporting, and a policy center for terms and community guidelines.

### Target Users

- **Players** - Users who browse and join pickup games in their area
- **Organizers** - Users who create and manage game events
- **Admins** - Users who review reports, manage policies, and oversee platform security

### Basic Architecture

The application follows a three-tier architecture:

- **Frontend** - React + TypeScript single-page application built with Vite, served as static files
- **Backend** - Node.js + Express REST API server handling authentication, game management, reporting, and policy flows
- **Database** - MySQL 8 storing users, roles, games, sessions, reports, audit logs, and policy data

Communication between frontend and backend uses JSON over HTTP during local development and HTTPS in deployed environments. Authentication uses JWT access tokens paired with HttpOnly refresh cookies.

---

## Threat and Vulnerability Identification

Before development, we identified the following threats and vulnerabilities that could affect the system:

| Threat                     | Possible Vulnerability                                                                         | Impact                                                                        |
| -------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Unauthorized Access        | Weak or no authentication allowing attackers to access other users' accounts or admin features | Attacker can view, modify, or delete games, user data, and reports            |
| Credential Theft           | Plain text password storage or transmission allowing attackers to steal login credentials      | Compromised accounts leading to fraud, impersonation, or data leakage         |
| SQL Injection              | Unsanitized user input passed directly into database queries                                   | Attacker can read, modify, or delete entire database contents                 |
| Cross-Site Scripting (XSS) | Malicious scripts injected through user-submitted content like game descriptions or usernames  | Attacker can steal session tokens or perform actions on behalf of other users |
| Brute Force Attacks        | No rate limiting on login or registration endpoints allowing unlimited password guesses        | Attacker can brute-force weak passwords and gain unauthorized access          |
| Social Engineering         | Fake login pages or phishing emails tricking users into revealing their credentials            | Users unknowingly give attackers access to their real accounts                |
| Session Hijacking          | Stolen access tokens or cookies allowing attackers to impersonate legitimate users             | Attacker can perform actions as the victim without knowing their password     |

**Who might attack the system:**

- External attackers trying to gain unauthorized access
- Malicious users attempting to post fraudulent games or abuse the reporting system
- Social engineering attackers using phishing or pretexting to steal credentials

---

## Security Implementation

### Security Control: Password Hashing

**Threat Addressed:** Credential theft and plain text password storage

**CIA Principle:** Confidentiality

**Implementation:** Used bcrypt with a cost factor of 12 to hash passwords before saving to the MySQL database. The `users` table stores only the bcrypt hash in the `password_hash` column. During login, the server uses `bcrypt.compare()` to verify the submitted password against the stored hash. At no point is the plain text password stored or retrievable.

```javascript
// Registration - hashing before storage
const passwordHash = await bcrypt.hash(password, 12);
await connection.execute(
  'INSERT INTO users (id, email, password_hash, ...) VALUES (?, ?, ?, ...)',
  [userId, email, passwordHash, ...]
);

// Login - verifying against stored hash
const passwordMatches = await bcrypt.compare(password, userRecord.password_hash);
```

---

### Security Control: Role-Based Access Control

**Threat Addressed:** Unauthorized access to organizer and admin features

**CIA Principle:** Confidentiality and Integrity

**Implementation:** The system defines three roles (player, organizer, admin) stored in the MySQL `roles` table and mapped to users through `user_roles`. The backend checks the user's role from the JWT token on every protected endpoint. For example, only organizers and admins can create games. The frontend hides the "Post Game" button and disables the submit function for non-organizer users. The `ProtectedRoute` component redirects unauthenticated users to the login page.

```javascript
// Backend: role check before game creation
if (!["organizer", "admin"].includes(req.authUser.role)) {
  res
    .status(403)
    .json({ message: "Only organizers and admins can create games." });
  return;
}
```

```javascript
// Frontend: role check for UI visibility
const isOrganizer = user?.role === "organizer" || user?.role === "admin";
// FAB button only renders when isOrganizer is true
{
  isOrganizer && activeTab === "home" && (
    <button onClick={() => setShowCreateGame(true)}>Post Game</button>
  );
}
```

---

### Security Control: Input Validation

**Threat Addressed:** SQL injection, XSS, and malformed data

**CIA Principle:** Integrity

**Implementation:** All user inputs are validated using shared Zod schemas on both the client and server side. The `createGameSchema` validates game title (5-150 chars), court name, sport type, date/time format, location details, slot count (6-50), entry fee (zero or greater), and description (max 1000 chars). The `createReportSchema` validates abuse report categories and description length (10-1000 chars). Server-side validation uses parameterized queries (`?` placeholders in MySQL) which prevent SQL injection by separating data from query structure. XSS is prevented because React automatically escapes rendered content, and user-supplied text is never injected as raw HTML.

```javascript
// Zod validation schema for game creation
export const createGameSchema = z.object({
  title: z.string().trim().min(5).max(150),
  courtName: z.string().trim().min(3).max(150),
  sport: z.enum(["basketball", "volleyball"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  slots: z.string().refine((v) => {
    const n = Number(v);
    return Number.isInteger(n) && n >= 6 && n <= 50;
  }),
  // ...
});
```

```javascript
// Server-side parameterized query (prevents SQL injection)
await connection.execute(
  'INSERT INTO users (id, email, password_hash, ...) VALUES (?, ?, ?, ...)',
  [userId, email, passwordHash, ...]
);
```

---

### Security Control: JWT Authentication with Refresh Token Rotation

**Threat Addressed:** Session hijacking, token theft, and unauthorized persistent access

**CIA Principle:** Confidentiality

**Implementation:** The system uses a two-token approach. Short-lived JWT access tokens (8 hours) are used for API authorization. Refresh tokens are cryptographically random 48-byte strings stored only as SHA-256 hashes in the `auth_sessions` MySQL table. Refresh tokens are delivered as HttpOnly cookies (not accessible to JavaScript) with Secure and SameSite flags. Each refresh call rotates the token, invalidating the old one. Logout revokes the session in the database and clears the cookie. Access tokens are kept in frontend memory only, not persisted to browser storage.

```javascript
// Refresh token is hashed before database storage
const refreshToken = createRefreshToken();
const refreshTokenHash = hashToken(refreshToken); // SHA-256

// Cookie is HttpOnly - JavaScript cannot access it
res.cookie(refreshCookieName, refreshToken, {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  path: "/api/auth",
});
```

---

### Security Control: Rate Limiting

**Threat Addressed:** Brute force attacks and account enumeration

**CIA Principle:** Availability

**Implementation:** The `express-rate-limit` middleware is applied to authentication and reporting endpoints. Login and registration are limited to 10 requests per 15 minutes per IP. Session refresh is limited to 30 requests per 15 minutes. Report submission is limited to 12 requests per 15 minutes. Exceeding the limit returns a clear error message and blocks further requests for the window duration.

```javascript
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many authentication attempts." },
});
```

---

### Security Control: Security Headers

**Threat Addressed:** Clickjacking, MIME sniffing, and information leakage

**CIA Principle:** Confidentiality

**Implementation:** The `helmet` middleware adds security headers to all API responses: `X-Content-Type-Options: nosniff` prevents MIME type sniffing, `X-Frame-Options: DENY` prevents clickjacking, `Referrer-Policy: no-referrer` controls information leakage through referer headers, and `Strict-Transport-Security` enforces HTTPS when enabled. The `x-powered-by` header is disabled to avoid fingerprinting the Express framework.

```javascript
app.disable("x-powered-by");
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    hsts: serverConfig.requireHttps,
    referrerPolicy: { policy: "no-referrer" },
  }),
);
```

---

### Security Control: Abuse Reporting and Audit Logging

**Threat Addressed:** Fraud, harassment, impersonation, and insider threats

**CIA Principle:** Integrity and Availability

**Implementation:** Users can report suspicious games through the Report Issue modal with categories like fraud, unsafe behavior, harassment, impersonation, and spam. Reports are stored in the `abuse_reports` table with status tracking. Every security-relevant action (login success, login failure, registration, game creation, join request, report submission, policy acknowledgment, session refresh, logout) is recorded in the `audit_logs` table with actor ID, action type, target, metadata, IP address, user agent, and timestamp. Admin users receive notifications about new reports.

```javascript
// Audit log entry for failed login
await writeAuditLog({
  actorUserId: userRecord.id,
  actionType: "auth_login_failed",
  targetType: "user",
  targetId: userRecord.id,
  metadata: { email, reason: "password_mismatch" },
  req,
});
```

---

### Security Control: Policy and Consent Tracking

**Threat Addressed:** Lack of user awareness and legal exposure

**CIA Principle:** Confidentiality and Integrity

**Implementation:** The Policy Center in the user profile displays three documents: Privacy Notice, Terms of Use, and Community Safety Rules. These are fetched from the `policy_documents` MySQL table. Users can acknowledge each policy, and their acknowledgment is recorded in `policy_acceptances` with IP address, user agent, and timestamp. This creates a compliance trail showing that users were informed of platform rules.

---

### Security Control: HTTPS Transport Encryption

**Threat Addressed:** Data interception and man-in-the-middle attacks

**CIA Principle:** Confidentiality

**Implementation:** The server supports direct HTTPS via TLS certificate and key paths configured through environment variables. For production deployment, the `REQUIRE_HTTPS` flag enables HTTP-to-HTTPS redirects and activates HSTS headers. The `cookieSecure` flag ensures refresh cookies are only sent over HTTPS connections.

---

## CIA Triad Application

### Confidentiality

Confidentiality is achieved through multiple layers. Passwords are hashed with bcrypt before storage, so even if the database is compromised, raw passwords cannot be recovered. JWT access tokens are short-lived and stored only in frontend memory. Refresh tokens are HttpOnly cookies inaccessible to JavaScript. The `Authorization` header carries bearer tokens for API requests, and CORS restricts which origins can access the API. Role-based access ensures users can only access features their role permits. HTTPS encrypts all data in transit.

### Integrity

Data integrity is maintained through input validation using Zod schemas on both client and server. Parameterized MySQL queries prevent SQL injection, which could otherwise modify or destroy data. The audit log is append-only, preserving a chronological record of all actions. Game status changes are tracked in the `game_status_history` table. Policy acknowledgments record the exact version acknowledged. The `ON DUPLICATE KEY UPDATE` patterns in seed scripts prevent duplicate inserts while preserving existing data.

### Availability

Availability is protected through rate limiting on authentication endpoints to prevent brute force denial. The MySQL connection pool manages database connections efficiently. Error handling throughout the backend ensures the server continues running even when individual requests fail. Graceful error messages are shown to users without exposing internal server details. The application is a standard React SPA that can be served as static files behind any web server.

---

## Conclusion

Through this project, we learned that security is not a single feature but a collection of practices that must be woven into every layer of an application. Implementing bcrypt password hashing, JWT sessions with refresh token rotation, role-based access control, input validation, rate limiting, audit logging, and transport encryption taught us that each control addresses specific threats while supporting the CIA triad.

We also learned that security controls must balance protection with usability. For example, short-lived access tokens improve security but require a refresh mechanism to avoid forcing users to log in repeatedly. Rate limiting prevents brute force attacks but must be generous enough to not block legitimate users.

Most importantly, we learned that no application is fully secure. Social engineering attacks like phishing can bypass even strong technical controls by targeting human behavior rather than software vulnerabilities. This is why the defense strategy must include both technical measures like encryption and validation, and human measures like security awareness, policy acknowledgment, and clear reporting procedures. Secure development is an ongoing process, not a one-time task.

---

## References

- INTE 302 Course Briefer - Social Engineering Risk Assessment and Defense Strategy Project
- OWASP Top 10 Web Application Security Risks
- bcrypt Specification - Howard, Hinnant, et al.
- JSON Web Tokens (RFC 7519)
- Express.js Security Best Practices
