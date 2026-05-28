# MySQL Scripts

This file contains MySQL 8 scripts that support the Phase 1 and Phase 2 plans in `taralaro/PaulPhase1.md` and `taralaro/PaulPhase2.md`.

- Target: `taralaro` security and compliance baseline
- Engine: `MySQL 8+`
- Purpose: create the minimum schema for auth, roles, games, reporting, policy tracking, notifications, and audit logging
- Assumption: the application generates UUID strings and hashes passwords with `Argon2id` or `bcrypt` before insert; never store plain text passwords

## Backend Auth Setup

After the tables are created:
- Copy `.env.example` to `.env`
- Update the MySQL connection values
- Set `JWT_SECRET` and `JWT_EXPIRES_IN`
- Set `JWT_REFRESH_EXPIRES_DAYS`, `REQUIRE_HTTPS`, and `COOKIE_SECURE` for deployed environments
- Run `npm install`
- Run `npm run seed:auth-demo` to create bcrypt-hashed demo users
- Run `npm run server` to start the auth API on `http://localhost:3001`

Live auth now uses the actual database:
- `POST /api/auth/register` inserts new users into `users` and `user_roles`
- `POST /api/auth/login` verifies `users.password_hash` with `bcrypt`
- JWT access tokens are signed by the backend and returned to the frontend after login or registration
- Refresh tokens are hashed and stored in `auth_sessions`, then delivered to the browser as `HttpOnly` cookies
- `POST /api/auth/refresh` rotates refresh sessions and returns a fresh access token
- `POST /api/auth/logout` revokes the refresh session and clears the auth cookie

## Auth Flow Mapping

These tables directly support the live login and registration flow:
- `users` stores the bcrypt password hash and account profile
- `roles` defines allowed roles
- `user_roles` maps a registered user to `player`, `organizer`, or `admin`
- `audit_logs` records successful and failed auth events
- `auth_sessions` stores hashed refresh tokens for rotation, expiration, and revocation

JWT access tokens are signed in the application layer and are not stored directly in MySQL.
Transport encryption for the API is handled by `HTTPS/TLS`, not by MySQL itself.

## Execution Order
Run the sections in this order:
1. Database bootstrap
2. Users, roles, and auth tables
3. Games and participation tables
4. Policies and consent tracking
5. Reporting and audit tables
6. Notifications and indexes
7. Seed data

## 1. Database Bootstrap

```sql
CREATE DATABASE IF NOT EXISTS tara_laro
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE tara_laro;
```

## 2. Users, Roles, and Authentication

```sql
USE tara_laro;

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  username VARCHAR(50) NOT NULL,
  display_name VARCHAR(120) NOT NULL,
  first_name VARCHAR(100) NULL,
  last_name VARCHAR(100) NULL,
  phone VARCHAR(30) NULL,
  city VARCHAR(120) NULL,
  barangay VARCHAR(120) NULL,
  avatar_url VARCHAR(500) NULL,
  preferred_sport ENUM('basketball', 'volleyball') NULL,
  account_status ENUM('pending_verification', 'active', 'suspended', 'deactivated') NOT NULL DEFAULT 'pending_verification',
  email_verified_at DATETIME NULL,
  last_login_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_username (username)
);

CREATE TABLE IF NOT EXISTS roles (
  id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  role_name VARCHAR(50) NOT NULL,
  description VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_roles_role_name (role_name)
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id CHAR(36) NOT NULL,
  role_id SMALLINT UNSIGNED NOT NULL,
  assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  assigned_by CHAR(36) NULL,
  PRIMARY KEY (user_id, role_id),
  CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(id),
  CONSTRAINT fk_user_roles_assigned_by FOREIGN KEY (assigned_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  refresh_token_hash VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(500) NULL,
  last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_auth_sessions_user_id (user_id),
  KEY idx_auth_sessions_expires_at (expires_at),
  CONSTRAINT fk_auth_sessions_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  consumed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_email_verification_user_id (user_id),
  CONSTRAINT fk_email_verification_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  consumed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_password_reset_user_id (user_id),
  CONSTRAINT fk_password_reset_user FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## 3. Games and Participation

```sql
USE tara_laro;

CREATE TABLE IF NOT EXISTS games (
  id CHAR(36) NOT NULL,
  organizer_user_id CHAR(36) NOT NULL,
  title VARCHAR(150) NOT NULL,
  sport ENUM('basketball', 'volleyball') NOT NULL,
  court_name VARCHAR(150) NOT NULL,
  description TEXT NULL,
  game_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NULL,
  location_text VARCHAR(255) NOT NULL,
  barangay VARCHAR(120) NOT NULL,
  city VARCHAR(120) NOT NULL,
  max_slots INT UNSIGNED NOT NULL,
  entry_fee DECIMAL(10,2) NULL,
  image_url VARCHAR(500) NULL,
  visibility ENUM('public', 'private') NOT NULL DEFAULT 'public',
  status ENUM('draft', 'open', 'full', 'cancelled', 'completed') NOT NULL DEFAULT 'draft',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_games_organizer_user_id (organizer_user_id),
  KEY idx_games_status (status),
  KEY idx_games_sport_date (sport, game_date),
  CONSTRAINT fk_games_organizer_user FOREIGN KEY (organizer_user_id) REFERENCES users(id),
  CONSTRAINT chk_games_max_slots CHECK (max_slots > 1),
  CONSTRAINT chk_games_entry_fee CHECK (entry_fee IS NULL OR entry_fee >= 0)
);

CREATE TABLE IF NOT EXISTS game_participants (
  id CHAR(36) NOT NULL,
  game_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  join_status ENUM('pending', 'approved', 'rejected', 'cancelled', 'left_game') NOT NULL DEFAULT 'pending',
  requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at DATETIME NULL,
  reviewed_by CHAR(36) NULL,
  notes VARCHAR(255) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_game_participants_game_user (game_id, user_id),
  KEY idx_game_participants_user_id (user_id),
  KEY idx_game_participants_status (join_status),
  CONSTRAINT fk_game_participants_game FOREIGN KEY (game_id) REFERENCES games(id),
  CONSTRAINT fk_game_participants_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_game_participants_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS game_status_history (
  id CHAR(36) NOT NULL,
  game_id CHAR(36) NOT NULL,
  previous_status ENUM('draft', 'open', 'full', 'cancelled', 'completed') NULL,
  new_status ENUM('draft', 'open', 'full', 'cancelled', 'completed') NOT NULL,
  changed_by CHAR(36) NOT NULL,
  reason VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_game_status_history_game_id (game_id),
  CONSTRAINT fk_game_status_history_game FOREIGN KEY (game_id) REFERENCES games(id),
  CONSTRAINT fk_game_status_history_changed_by FOREIGN KEY (changed_by) REFERENCES users(id)
);
```

## 4. Policies and Consent Tracking

```sql
USE tara_laro;

CREATE TABLE IF NOT EXISTS policy_documents (
  id CHAR(36) NOT NULL,
  policy_type ENUM('privacy', 'terms', 'community_rules') NOT NULL,
  version_label VARCHAR(50) NOT NULL,
  title VARCHAR(150) NOT NULL,
  content_md LONGTEXT NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  published_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_policy_documents_type_version (policy_type, version_label)
);

CREATE TABLE IF NOT EXISTS policy_acceptances (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  policy_document_id CHAR(36) NOT NULL,
  accepted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(500) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_policy_acceptances_user_policy (user_id, policy_document_id),
  KEY idx_policy_acceptances_user_id (user_id),
  CONSTRAINT fk_policy_acceptances_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_policy_acceptances_document FOREIGN KEY (policy_document_id) REFERENCES policy_documents(id)
);
```

## 5. Reporting and Auditability

```sql
USE tara_laro;

CREATE TABLE IF NOT EXISTS abuse_reports (
  id CHAR(36) NOT NULL,
  reporter_user_id CHAR(36) NOT NULL,
  report_target_type ENUM('game', 'user', 'message', 'profile') NOT NULL,
  report_target_id CHAR(36) NOT NULL,
  category ENUM('spam', 'fraud', 'harassment', 'unsafe_behavior', 'impersonation', 'other') NOT NULL,
  description TEXT NOT NULL,
  status ENUM('submitted', 'under_review', 'resolved', 'dismissed') NOT NULL DEFAULT 'submitted',
  reviewed_by CHAR(36) NULL,
  reviewed_at DATETIME NULL,
  resolution_notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_abuse_reports_reporter_user_id (reporter_user_id),
  KEY idx_abuse_reports_target (report_target_type, report_target_id),
  KEY idx_abuse_reports_status (status),
  CONSTRAINT fk_abuse_reports_reporter FOREIGN KEY (reporter_user_id) REFERENCES users(id),
  CONSTRAINT fk_abuse_reports_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id CHAR(36) NOT NULL,
  actor_user_id CHAR(36) NULL,
  action_type VARCHAR(100) NOT NULL,
  target_type VARCHAR(50) NOT NULL,
  target_id CHAR(36) NULL,
  metadata_json JSON NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_logs_actor_user_id (actor_user_id),
  KEY idx_audit_logs_action_type (action_type),
  KEY idx_audit_logs_target (target_type, target_id),
  KEY idx_audit_logs_created_at (created_at),
  CONSTRAINT fk_audit_logs_actor FOREIGN KEY (actor_user_id) REFERENCES users(id)
);
```

## 6. Notifications

```sql
USE tara_laro;

CREATE TABLE IF NOT EXISTS notifications (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  notification_type ENUM('join_request', 'accepted', 'rejected', 'reminder', 'system', 'security') NOT NULL,
  title VARCHAR(150) NOT NULL,
  message VARCHAR(255) NOT NULL,
  related_game_id CHAR(36) NULL,
  related_user_id CHAR(36) NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  read_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notifications_user_id (user_id),
  KEY idx_notifications_is_read (is_read),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_notifications_related_game FOREIGN KEY (related_game_id) REFERENCES games(id),
  CONSTRAINT fk_notifications_related_user FOREIGN KEY (related_user_id) REFERENCES users(id)
);
```

## 7. Helpful Views for Compliance Review

```sql
USE tara_laro;

CREATE OR REPLACE VIEW v_active_user_roles AS
SELECT
  u.id AS user_id,
  u.email,
  u.username,
  u.account_status,
  r.role_name,
  ur.assigned_at
FROM users u
JOIN user_roles ur ON ur.user_id = u.id
JOIN roles r ON r.id = ur.role_id;

CREATE OR REPLACE VIEW v_open_games_with_slots AS
SELECT
  g.id,
  g.title,
  g.sport,
  g.game_date,
  g.start_time,
  g.city,
  g.barangay,
  g.max_slots,
  SUM(CASE WHEN gp.join_status = 'approved' THEN 1 ELSE 0 END) AS approved_slots,
  (g.max_slots - SUM(CASE WHEN gp.join_status = 'approved' THEN 1 ELSE 0 END)) AS remaining_slots
FROM games g
LEFT JOIN game_participants gp ON gp.game_id = g.id
WHERE g.status = 'open'
GROUP BY g.id, g.title, g.sport, g.game_date, g.start_time, g.city, g.barangay, g.max_slots;

CREATE OR REPLACE VIEW v_pending_reports AS
SELECT
  ar.id,
  ar.report_target_type,
  ar.report_target_id,
  ar.category,
  ar.status,
  ar.created_at,
  u.email AS reporter_email,
  u.username AS reporter_username
FROM abuse_reports ar
JOIN users u ON u.id = ar.reporter_user_id
WHERE ar.status IN ('submitted', 'under_review');
```

## 8. Seed Data

```sql
USE tara_laro;

INSERT INTO roles (role_name, description)
VALUES
  ('player', 'Standard player account'),
  ('organizer', 'Can create and manage games'),
  ('admin', 'Can review reports and audits')
ON DUPLICATE KEY UPDATE
  description = VALUES(description);

INSERT INTO policy_documents (id, policy_type, version_label, title, content_md, is_active)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'privacy',
    'v1.0',
    'Privacy Notice',
    '# Privacy Notice\nInitial placeholder for Phase 1 privacy notice.',
    1
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'terms',
    'v1.0',
    'Terms of Use',
    '# Terms of Use\nInitial placeholder for Phase 1 terms.',
    1
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'community_rules',
    'v1.0',
    'Community Rules',
    '# Community Rules\nInitial placeholder for Phase 1 safety rules.',
    1
  )
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  content_md = VALUES(content_md),
  is_active = VALUES(is_active);
```

## 9. Example Admin and Organizer Inserts

Replace the hashes and UUIDs with real values from the application.

```sql
USE tara_laro;

INSERT INTO users (
  id,
  email,
  password_hash,
  username,
  display_name,
  first_name,
  last_name,
  city,
  barangay,
  account_status,
  email_verified_at
) VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'admin@taralaro.local',
  '$2y$12$replace_with_real_hash',
  'admin',
  'Tara Laro Admin',
  'Tara',
  'Admin',
  'Manila',
  'Sampaloc',
  'active',
  NOW()
)
ON DUPLICATE KEY UPDATE
  display_name = VALUES(display_name),
  account_status = VALUES(account_status);

INSERT INTO users (
  id,
  email,
  password_hash,
  username,
  display_name,
  first_name,
  last_name,
  city,
  barangay,
  account_status,
  email_verified_at
) VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'organizer@taralaro.local',
  '$2y$12$replace_with_real_hash',
  'organizer1',
  'Demo Organizer',
  'Demo',
  'Organizer',
  'Quezon City',
  'Pinyahan',
  'active',
  NOW()
)
ON DUPLICATE KEY UPDATE
  display_name = VALUES(display_name),
  account_status = VALUES(account_status);

INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  r.id,
  NULL
FROM roles r
WHERE r.role_name = 'admin'
ON DUPLICATE KEY UPDATE
  assigned_at = assigned_at;

INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  r.id,
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
FROM roles r
WHERE r.role_name = 'organizer'
ON DUPLICATE KEY UPDATE
  assigned_at = assigned_at;
```

## 9.1 Example Sample Games

```sql
USE tara_laro;

INSERT INTO games (
  id,
  organizer_user_id,
  title,
  sport,
  court_name,
  description,
  game_date,
  start_time,
  location_text,
  barangay,
  city,
  max_slots,
  entry_fee,
  image_url,
  visibility,
  status
) VALUES
  (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'Sunday Streetball Showdown',
    'basketball',
    'Barangay 638 Basketball Court',
    'Full court 5-on-5. Bring your own water. Sneakers required.',
    '2026-07-13',
    '06:00:00',
    'Covered court beside barangay hall',
    'Brgy. 638',
    'Manila',
    10,
    50.00,
    'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&q=80',
    'public',
    'open'
  ),
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'QC Spikers Open',
    'volleyball',
    'Liwasang Kalayaan Court',
    'Mixed volleyball. 6-person teams. Beginners welcome.',
    '2026-07-15',
    '16:00:00',
    'Open court near community gym',
    'Brgy. Pinyahan',
    'Quezon City',
    12,
    NULL,
    'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800&q=80',
    'public',
    'open'
  )
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  description = VALUES(description),
  game_date = VALUES(game_date),
  start_time = VALUES(start_time),
  location_text = VALUES(location_text),
  barangay = VALUES(barangay),
  city = VALUES(city),
  max_slots = VALUES(max_slots),
  entry_fee = VALUES(entry_fee),
  image_url = VALUES(image_url),
  status = VALUES(status);
```

## 10. Example Queries to Support Implementation

### Check if a user can post a game

```sql
SELECT 1
FROM user_roles ur
JOIN roles r ON r.id = ur.role_id
JOIN users u ON u.id = ur.user_id
WHERE ur.user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
  AND r.role_name IN ('organizer', 'admin')
  AND u.account_status = 'active'
LIMIT 1;
```

### Insert a new game

```sql
INSERT INTO games (
  id,
  organizer_user_id,
  title,
  sport,
  court_name,
  description,
  game_date,
  start_time,
  location_text,
  barangay,
  city,
  max_slots,
  entry_fee,
  status
) VALUES (
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'Sunday Streetball Showdown',
  'basketball',
  'Barangay 638 Basketball Court',
  'Full court 5-on-5. Bring your own water.',
  '2026-07-13',
  '06:00:00',
  'Brgy. 638, Sampaloc, Manila',
  'Brgy. 638',
  'Manila',
  10,
  50.00,
  'open'
);
```

### Submit an abuse report

```sql
INSERT INTO abuse_reports (
  id,
  reporter_user_id,
  report_target_type,
  report_target_id,
  category,
  description
) VALUES (
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'game',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'fraud',
  'Organizer asked users to send payment outside the platform.'
);
```

### Insert an audit event

```sql
INSERT INTO audit_logs (
  id,
  actor_user_id,
  action_type,
  target_type,
  target_id,
  metadata_json,
  ip_address,
  user_agent
) VALUES (
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'game_created',
  'game',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  JSON_OBJECT('source', 'web', 'status', 'open'),
  '127.0.0.1',
  'Mozilla/5.0'
);
```

## 11. Mapping to the Phase 1 Plan
- Auth and session layer: `users`, `auth_sessions`, `email_verification_tokens`, `password_reset_tokens`
- Authorization: `roles`, `user_roles`
- Validation-backed domain storage: `games`, `game_participants`, `game_status_history`
- Policy and consent surface: `policy_documents`, `policy_acceptances`
- Reporting and auditability: `abuse_reports`, `audit_logs`
- Existing UI notifications: `notifications`

## 12. Implementation Notes
- Keep password hashing in the application layer using `Argon2id` when available, or `bcrypt` as the fallback standard.
- Store only hashed tokens for sessions, email verification, and password resets.
- Generate UUIDs in the application so inserts remain framework-agnostic.
- Add migrations later if you move from markdown-managed SQL to a migration tool.
- If you decide to use Supabase instead of MySQL, this document becomes a relational reference, not the direct execution source.
