import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import fs from 'node:fs';
import helmet from 'helmet';
import http from 'node:http';
import https from 'node:https';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import rateLimit from 'express-rate-limit';
import { createHash, randomBytes, randomInt, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { getDb } from './db.js';
import { emailConfig, jwtConfig, otpConfig, serverConfig } from './config.js';

const rolePriority = ['admin', 'organizer', 'player'];
const publicRoles = ['player', 'organizer'];
const validSports = ['basketball', 'volleyball'];
const validReportCategories = ['spam', 'fraud', 'harassment', 'unsafe_behavior', 'impersonation', 'other'];
const validJoinReviewDecisions = ['approved', 'rejected'];
const validOtpPurposes = ['login', 'register'];
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const usernamePattern = /^[a-zA-Z0-9._-]{3,30}$/;
const otpPattern = new RegExp(`^\\d{${otpConfig.codeLength}}$`);
const refreshCookieName = 'tara_laro_refresh';

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
});

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts. Please wait before trying again.' },
});

const refreshRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many session refresh attempts. Please sign in again.' },
});

const otpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many verification attempts. Please wait before requesting another code.' },
});

const reportRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many reports submitted. Please wait before sending more.' },
});

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const normalizeString = (value) => String(value || '').trim();
const safePreferredSport = (value) => (value === 'volleyball' ? 'volleyball' : 'basketball');
const getPrimaryRole = (roles) => rolePriority.find((role) => roles.includes(role)) || 'player';

const hashToken = (token) => createHash('sha256').update(token).digest('hex');
const hashOtpCode = (code) => createHash('sha256').update(String(code)).digest('hex');
const createRefreshToken = () => randomBytes(48).toString('hex');

const createHttpError = (statusCode, message) => Object.assign(new Error(message), { statusCode });

const maskEmail = (email) => {
  const [localPart = '', domain = ''] = String(email || '').split('@');

  if (!localPart || !domain) {
    return email;
  }

  const visibleLocal = localPart.slice(0, 2);
  const maskedLocal = `${visibleLocal}${'*'.repeat(Math.max(localPart.length - visibleLocal.length, 1))}`;
  const [domainName = '', domainSuffix = ''] = domain.split('.');
  const visibleDomain = domainName ? `${domainName[0]}${'*'.repeat(Math.max(domainName.length - 1, 1))}` : '***';

  return `${maskedLocal}@${visibleDomain}${domainSuffix ? `.${domainSuffix}` : ''}`;
};

const generateOtpCode = () => Array.from({ length: otpConfig.codeLength }, () => String(randomInt(0, 10))).join('');

const getOtpExpiryDate = () => {
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + otpConfig.expiryMinutes);
  return expiresAt;
};

let emailTransporter;
let ensureEmailOtpTablePromise;

const getEmailTransporter = () => {
  if (!emailConfig.host) {
    return null;
  }

  if (!emailTransporter) {
    emailTransporter = nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth: emailConfig.user
        ? {
            user: emailConfig.user,
            pass: emailConfig.password,
          }
        : undefined,
    });
  }

  return emailTransporter;
};

const ensureEmailOtpTable = async () => {
  if (!ensureEmailOtpTablePromise) {
    ensureEmailOtpTablePromise = getDb().execute(
      `
        CREATE TABLE IF NOT EXISTS auth_email_otps (
          id CHAR(36) NOT NULL,
          user_id CHAR(36) NULL,
          email VARCHAR(255) NOT NULL,
          purpose ENUM('login', 'register') NOT NULL,
          otp_hash VARCHAR(255) NOT NULL,
          context_json LONGTEXT NULL,
          attempts_remaining TINYINT UNSIGNED NOT NULL DEFAULT 5,
          expires_at DATETIME NOT NULL,
          consumed_at DATETIME NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_auth_email_otps_user_id (user_id),
          KEY idx_auth_email_otps_email_purpose (email, purpose),
          KEY idx_auth_email_otps_expires_at (expires_at),
          CONSTRAINT fk_auth_email_otps_user FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `
    );
  }

  await ensureEmailOtpTablePromise;
};

const sendOtpEmail = async ({ email, otpCode, purpose }) => {
  const transporter = getEmailTransporter();
  const actionLabel = purpose === 'login' ? 'sign in' : 'complete your registration';
  const subject = purpose === 'login' ? 'Your Tara Laro login code' : 'Your Tara Laro registration code';
  const text = [
    `Your Tara Laro verification code is ${otpCode}.`,
    `Use it to ${actionLabel}.`,
    `This code expires in ${otpConfig.expiryMinutes} minutes.`,
    'If you did not request this code, you can ignore this email.',
  ].join('\n\n');
  const html = `
    <div style="font-family: Arial, sans-serif; color: #0d1b2a; line-height: 1.6;">
      <p>Your Tara Laro verification code is:</p>
      <p style="font-size: 28px; font-weight: 700; letter-spacing: 0.35em; margin: 16px 0;">${otpCode}</p>
      <p>Use it to ${actionLabel}. It expires in ${otpConfig.expiryMinutes} minutes.</p>
      <p>If you did not request this code, you can ignore this email.</p>
    </div>
  `;

  if (!transporter) {
    if (!otpConfig.devMode) {
      throw new Error('SMTP is not configured for OTP delivery.');
    }

    console.info(`[OTP:${purpose}] ${email} -> ${otpCode}`);
    return { deliveryMethod: 'console', devOtpPreview: otpCode };
  }

  await transporter.sendMail({
    from: `${emailConfig.fromName} <${emailConfig.fromEmail}>`,
    to: email,
    subject,
    text,
    html,
  });

  return {
    deliveryMethod: 'smtp',
    devOtpPreview: otpConfig.devMode ? otpCode : undefined,
  };
};

const getRefreshExpiryDate = () => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + jwtConfig.refreshExpiresDays);
  return expiresAt;
};

const getRefreshCookieOptions = (expiresAt) => ({
  httpOnly: true,
  secure: serverConfig.cookieSecure || serverConfig.requireHttps,
  sameSite: 'lax',
  domain: serverConfig.cookieDomain,
  path: '/api/auth',
  expires: expiresAt,
});

const setRefreshCookie = (res, token, expiresAt) => {
  res.cookie(refreshCookieName, token, getRefreshCookieOptions(expiresAt));
};

const clearRefreshCookie = (res) => {
  res.clearCookie(refreshCookieName, {
    ...getRefreshCookieOptions(new Date(0)),
    expires: new Date(0),
  });
};

const formatDateLabel = (value) => {
  try {
    return dateFormatter.format(new Date(`${String(value).slice(0, 10)}T00:00:00`));
  } catch {
    return String(value);
  }
};

const formatTimeLabel = (value) => {
  try {
    const normalized = String(value).slice(0, 8);
    return timeFormatter.format(new Date(`1970-01-01T${normalized}`));
  } catch {
    return String(value);
  }
};

const serializeGame = (row) => {
  const slotsFilled = Number(row.slots_filled || 0);
  const slotsTotal = Number(row.max_slots || 0);
  let status = String(row.status || 'open').toUpperCase();

  if ((status === 'OPEN' || status === 'FULL') && slotsTotal > 0 && slotsFilled >= slotsTotal) {
    status = 'FULL';
  }

  return {
    id: row.id,
    title: row.title,
    courtName: row.court_name,
    sport: row.sport,
    date: formatDateLabel(row.game_date),
    time: formatTimeLabel(row.start_time),
    location: row.location_text,
    barangay: row.barangay,
    city: row.city,
    slotsTotal,
    slotsFilled,
    entryFee: row.entry_fee === null ? null : Number(row.entry_fee),
    status,
    organizerUserId: row.organizer_user_id,
    organizerName: row.organizer_name,
    description: row.description || '',
    imageUrl: row.image_url || 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&q=80',
    joinedStatus: row.joined_status || null,
  };
};

const serializeNotification = (row) => ({
  id: row.id,
  type: row.notification_type,
  message: row.message,
  gameId: row.related_game_id || '',
  gameTitle: row.related_game_title || row.title || 'Platform update',
  read: Boolean(row.is_read),
  time: row.created_at
    ? new Date(row.created_at).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'Now',
});

const serializeJoinRequest = (row) => ({
  id: row.id,
  userId: row.user_id,
  displayName: row.display_name,
  username: row.username,
  city: row.city || '',
  barangay: row.barangay || '',
  preferredSport: safePreferredSport(row.preferred_sport),
  status: row.join_status,
  requestedAt: row.requested_at
    ? new Date(row.requested_at).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'Now',
});

const buildAuthUser = (rows) => {
  const [firstRow] = rows;
  const roles = [...new Set(rows.map((row) => row.role_name).filter(Boolean))];

  return {
    id: firstRow.id,
    email: firstRow.email,
    username: firstRow.username,
    displayName: firstRow.display_name,
    role: getPrimaryRole(roles),
    city: firstRow.city || '',
    barangay: firstRow.barangay || '',
    preferredSport: safePreferredSport(firstRow.preferred_sport),
  };
};

const issueAccessToken = (user) =>
  jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      username: user.username,
    },
    jwtConfig.secret,
    { expiresIn: jwtConfig.expiresIn }
  );

const buildAuthResponse = (rows) => {
  const user = buildAuthUser(rows);
  return {
    user,
    accessToken: issueAccessToken(user),
  };
};

const getBearerToken = (req) => {
  const header = req.get('authorization') || '';

  if (!header.startsWith('Bearer ')) {
    return null;
  }

  return header.slice(7).trim();
};

const validateRegistrationInput = (body) => {
  const email = normalizeEmail(body?.email);
  const password = String(body?.password || '');
  const username = normalizeString(body?.username);
  const displayName = normalizeString(body?.displayName);
  const city = normalizeString(body?.city);
  const barangay = normalizeString(body?.barangay);
  const preferredSport = safePreferredSport(body?.preferredSport);
  const role = publicRoles.includes(body?.role) ? body.role : 'player';

  if (!emailPattern.test(email)) {
    return { error: 'A valid email address is required.' };
  }

  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters long.' };
  }

  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return { error: 'Password must include both letters and numbers.' };
  }

  if (!usernamePattern.test(username)) {
    return { error: 'Username must be 3-30 characters using letters, numbers, dots, underscores, or hyphens.' };
  }

  if (displayName.length < 2 || displayName.length > 120) {
    return { error: 'Display name must be between 2 and 120 characters.' };
  }

  if (!city || !barangay) {
    return { error: 'City and barangay are required.' };
  }

  if (!validSports.includes(preferredSport)) {
    return { error: 'Preferred sport must be basketball or volleyball.' };
  }

  return {
    data: {
      email,
      password,
      username,
      displayName,
      city,
      barangay,
      preferredSport,
      role,
    },
  };
};

const validateOtpRequestInput = (body) => {
  const challengeId = normalizeString(body?.challengeId);
  const otp = normalizeString(body?.otp);
  const purpose = validOtpPurposes.includes(body?.purpose) ? body.purpose : null;

  if (!challengeId) {
    return { error: 'A verification challenge is required.' };
  }

  if (!otpPattern.test(otp)) {
    return { error: `Verification codes must be ${otpConfig.codeLength} digits.` };
  }

  if (!purpose) {
    return { error: 'A valid verification purpose is required.' };
  }

  return {
    data: {
      challengeId,
      otp,
      purpose,
    },
  };
};

const validateGameInput = (body) => {
  const title = normalizeString(body?.title);
  const courtName = normalizeString(body?.courtName);
  const sport = validSports.includes(body?.sport) ? body.sport : null;
  const gameDate = normalizeString(body?.date);
  const startTime = normalizeString(body?.time);
  const locationText = normalizeString(body?.location);
  const barangay = normalizeString(body?.barangay);
  const city = normalizeString(body?.city);
  const slots = Number(body?.slots);
  const imageUrl = normalizeString(body?.imageUrl);
  const description = normalizeString(body?.description);
  const entryFeeRaw = body?.entryFee;
  const entryFee = entryFeeRaw === null || entryFeeRaw === '' || typeof entryFeeRaw === 'undefined' ? null : Number(entryFeeRaw);

  if (title.length < 5 || title.length > 150) {
    return { error: 'Game title must be between 5 and 150 characters.' };
  }

  if (courtName.length < 3 || courtName.length > 150) {
    return { error: 'Court name must be between 3 and 150 characters.' };
  }

  if (!sport) {
    return { error: 'Sport must be basketball or volleyball.' };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(gameDate)) {
    return { error: 'A valid game date is required.' };
  }

  if (!/^\d{2}:\d{2}$/.test(startTime)) {
    return { error: 'A valid start time is required.' };
  }

  if (locationText.length < 5 || locationText.length > 255) {
    return { error: 'Location details must be between 5 and 255 characters.' };
  }

  if (barangay.length < 2 || barangay.length > 120 || city.length < 2 || city.length > 120) {
    return { error: 'Barangay and city are required.' };
  }

  if (!Number.isInteger(slots) || slots < 6 || slots > 50) {
    return { error: 'Slots must be a whole number between 6 and 50.' };
  }

  if (entryFee !== null && (!Number.isFinite(entryFee) || entryFee < 0)) {
    return { error: 'Entry fee must be zero or greater.' };
  }

  if (description.length > 1000) {
    return { error: 'Description must be 1000 characters or fewer.' };
  }

  return {
    data: {
      title,
      courtName,
      sport,
      gameDate,
      startTime: `${startTime}:00`,
      locationText,
      barangay,
      city,
      slots,
      entryFee,
      description,
      imageUrl: imageUrl || null,
    },
  };
};

const validateReportInput = (body) => {
  const targetType = body?.targetType;
  const targetId = normalizeString(body?.targetId);
  const category = body?.category;
  const description = normalizeString(body?.description);

  if (targetType !== 'game') {
    return { error: 'Only game reports are supported in Phase 2.' };
  }

  if (!targetId) {
    return { error: 'A report target is required.' };
  }

  if (!validReportCategories.includes(category)) {
    return { error: 'A valid report category is required.' };
  }

  if (description.length < 10 || description.length > 1000) {
    return { error: 'Report details must be between 10 and 1000 characters.' };
  }

  return {
    data: {
      targetType,
      targetId,
      category,
      description,
    },
  };
};

const validateJoinReviewInput = (body) => {
  const decision = validJoinReviewDecisions.includes(body?.decision) ? body.decision : null;

  if (!decision) {
    return { error: 'A valid organizer review decision is required.' };
  }

  return {
    data: {
      decision,
    },
  };
};

const writeAuditLog = async ({ actorUserId = null, actionType, targetType, targetId = null, metadata = {}, req }) => {
  try {
    const db = getDb();
    await db.execute(
      `
        INSERT INTO audit_logs (
          id,
          actor_user_id,
          action_type,
          target_type,
          target_id,
          metadata_json,
          ip_address,
          user_agent
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        randomUUID(),
        actorUserId,
        actionType,
        targetType,
        targetId,
        JSON.stringify(metadata),
        req.ip || null,
        req.get('user-agent') || null,
      ]
    );
  } catch (error) {
    console.warn(`Audit log skipped: ${error.message}`);
  }
};

const writeNotification = async ({ userId, type, title, message, relatedGameId = null, relatedUserId = null }, connection = getDb()) => {
  await connection.execute(
    `
      INSERT INTO notifications (
        id,
        user_id,
        notification_type,
        title,
        message,
        related_game_id,
        related_user_id,
        is_read,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, NOW())
    `,
    [randomUUID(), userId, type, title, message, relatedGameId, relatedUserId]
  );
};

const fetchUserRowsByEmail = async (email, connection = getDb()) => {
  const [rows] = await connection.execute(
    `
      SELECT
        u.id,
        u.email,
        u.username,
        u.display_name,
        u.city,
        u.barangay,
        u.preferred_sport,
        u.account_status,
        u.password_hash,
        r.role_name
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON r.id = ur.role_id
      WHERE u.email = ?
    `,
    [email]
  );

  return rows;
};

const fetchUserRowsById = async (userId, connection = getDb()) => {
  const [rows] = await connection.execute(
    `
      SELECT
        u.id,
        u.email,
        u.username,
        u.display_name,
        u.city,
        u.barangay,
        u.preferred_sport,
        u.account_status,
        u.password_hash,
        r.role_name
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON r.id = ur.role_id
      WHERE u.id = ?
    `,
    [userId]
  );

  return rows;
};

const fetchRoleId = async (roleName, connection = getDb()) => {
  const [rows] = await connection.execute('SELECT id FROM roles WHERE role_name = ? LIMIT 1', [roleName]);
  return rows[0]?.id || null;
};

const fetchAdminUserIds = async (connection = getDb()) => {
  const [rows] = await connection.execute(
    `
      SELECT u.id
      FROM users u
      INNER JOIN user_roles ur ON ur.user_id = u.id
      INNER JOIN roles r ON r.id = ur.role_id
      WHERE r.role_name = 'admin' AND u.account_status = 'active'
    `
  );

  return rows.map((row) => row.id);
};

const findUserConflict = async (email, username, connection = getDb()) => {
  const [rows] = await connection.execute(
    'SELECT email, username FROM users WHERE email = ? OR username = ? LIMIT 1',
    [email, username]
  );

  return rows[0] || null;
};

const consumeEmailOtpChallenge = async (challengeId, connection = getDb()) => {
  await connection.execute('UPDATE auth_email_otps SET consumed_at = NOW() WHERE id = ? AND consumed_at IS NULL', [challengeId]);
};

const fetchEmailOtpChallengeById = async (challengeId, connection = getDb()) => {
  await ensureEmailOtpTable();

  const [rows] = await connection.execute(
    `
      SELECT
        id,
        user_id,
        email,
        purpose,
        otp_hash,
        context_json,
        attempts_remaining,
        expires_at,
        consumed_at,
        created_at
      FROM auth_email_otps
      WHERE id = ?
      LIMIT 1
      FOR UPDATE
    `,
    [challengeId]
  );

  return rows[0] || null;
};

const createEmailOtpChallenge = async ({ email, purpose, userId = null, context = null }, connection = getDb()) => {
  await ensureEmailOtpTable();

  const challengeId = randomUUID();
  const otpCode = generateOtpCode();
  const expiresAt = getOtpExpiryDate();

  await connection.execute(
    `
      UPDATE auth_email_otps
      SET consumed_at = NOW()
      WHERE email = ? AND purpose = ? AND consumed_at IS NULL
    `,
    [email, purpose]
  );

  await connection.execute(
    `
      INSERT INTO auth_email_otps (
        id,
        user_id,
        email,
        purpose,
        otp_hash,
        context_json,
        attempts_remaining,
        expires_at,
        consumed_at,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NOW())
    `,
    [
      challengeId,
      userId,
      email,
      purpose,
      hashOtpCode(otpCode),
      context ? JSON.stringify(context) : null,
      otpConfig.maxAttempts,
      expiresAt,
    ]
  );

  return { challengeId, otpCode, expiresAt };
};

const issueEmailOtpChallenge = async ({ email, purpose, userId = null, context = null }, connection = getDb()) => {
  const challenge = await createEmailOtpChallenge({ email, purpose, userId, context }, connection);

  try {
    const delivery = await sendOtpEmail({ email, otpCode: challenge.otpCode, purpose });

    return {
      ...challenge,
      ...delivery,
      maskedEmail: maskEmail(email),
    };
  } catch (error) {
    await consumeEmailOtpChallenge(challenge.challengeId, connection);
    throw error;
  }
};

const resolveEmailOtpChallenge = async ({ challengeId, otp, purpose }, connection = getDb()) => {
  const challenge = await fetchEmailOtpChallengeById(challengeId, connection);

  if (!challenge || challenge.purpose !== purpose) {
    throw createHttpError(404, 'Verification request not found. Please request a new code.');
  }

  if (challenge.consumed_at) {
    throw createHttpError(409, 'This verification code was already used. Please request a new one.');
  }

  if (new Date(challenge.expires_at) <= new Date()) {
    await consumeEmailOtpChallenge(challengeId, connection);
    throw createHttpError(410, 'This verification code has expired. Please request a new one.');
  }

  if (Number(challenge.attempts_remaining) <= 0) {
    await consumeEmailOtpChallenge(challengeId, connection);
    throw createHttpError(429, 'Too many invalid verification attempts. Please request a new code.');
  }

  if (hashOtpCode(otp) !== challenge.otp_hash) {
    const nextAttempts = Math.max(Number(challenge.attempts_remaining) - 1, 0);

    await connection.execute(
      `
        UPDATE auth_email_otps
        SET attempts_remaining = ?,
            consumed_at = CASE WHEN ? = 0 THEN NOW() ELSE consumed_at END
        WHERE id = ?
      `,
      [nextAttempts, nextAttempts, challengeId]
    );

    if (nextAttempts === 0) {
      throw createHttpError(429, 'Too many invalid verification attempts. Please request a new code.');
    }

    throw createHttpError(401, 'Invalid verification code. Please try again.');
  }

  let context = null;

  if (challenge.context_json) {
    try {
      context = JSON.parse(challenge.context_json);
    } catch {
      throw createHttpError(500, 'Stored verification data is invalid. Please request a new code.');
    }
  }

  return { challenge, context };
};

const createAuthSession = async (userId, req, connection = getDb()) => {
  const refreshToken = createRefreshToken();
  const refreshTokenHash = hashToken(refreshToken);
  const expiresAt = getRefreshExpiryDate();

  await connection.execute(
    `
      INSERT INTO auth_sessions (
        id,
        user_id,
        refresh_token_hash,
        ip_address,
        user_agent,
        last_seen_at,
        expires_at,
        revoked_at,
        created_at
      ) VALUES (?, ?, ?, ?, ?, NOW(), ?, NULL, NOW())
    `,
    [randomUUID(), userId, refreshTokenHash, req.ip || null, req.get('user-agent') || null, expiresAt]
  );

  return { refreshToken, expiresAt };
};

const fetchAuthSessionByToken = async (refreshToken, connection = getDb()) => {
  const [rows] = await connection.execute(
    `
      SELECT id, user_id, expires_at, revoked_at
      FROM auth_sessions
      WHERE refresh_token_hash = ?
      LIMIT 1
    `,
    [hashToken(refreshToken)]
  );

  return rows[0] || null;
};

const revokeAuthSessionById = async (sessionId, connection = getDb()) => {
  await connection.execute('UPDATE auth_sessions SET revoked_at = NOW() WHERE id = ? AND revoked_at IS NULL', [sessionId]);
};

const rotateAuthSession = async (sessionId, req, connection = getDb()) => {
  const refreshToken = createRefreshToken();
  const refreshTokenHash = hashToken(refreshToken);
  const expiresAt = getRefreshExpiryDate();

  await connection.execute(
    `
      UPDATE auth_sessions
      SET refresh_token_hash = ?,
          ip_address = ?,
          user_agent = ?,
          last_seen_at = NOW(),
          expires_at = ?,
          revoked_at = NULL
      WHERE id = ?
    `,
    [refreshTokenHash, req.ip || null, req.get('user-agent') || null, expiresAt, sessionId]
  );

  return { refreshToken, expiresAt };
};

const fetchFeedGames = async (userId, connection = getDb()) => {
  const [rows] = await connection.execute(
    `
      SELECT
        g.id,
        g.organizer_user_id,
        g.title,
        g.sport,
        g.court_name,
        g.description,
        g.game_date,
        g.start_time,
        g.location_text,
        g.barangay,
        g.city,
        g.max_slots,
        g.entry_fee,
        g.image_url,
        g.status,
        organizer.display_name AS organizer_name,
        COALESCE(SUM(CASE WHEN gp.join_status = 'approved' THEN 1 ELSE 0 END), 0) AS slots_filled,
        MAX(self_gp.join_status) AS joined_status
      FROM games g
      INNER JOIN users organizer ON organizer.id = g.organizer_user_id
      LEFT JOIN game_participants gp ON gp.game_id = g.id
      LEFT JOIN game_participants self_gp ON self_gp.game_id = g.id AND self_gp.user_id = ?
      WHERE g.visibility = 'public' AND g.status IN ('open', 'full')
      GROUP BY
        g.id,
        g.organizer_user_id,
        g.title,
        g.sport,
        g.court_name,
        g.description,
        g.game_date,
        g.start_time,
        g.location_text,
        g.barangay,
        g.city,
        g.max_slots,
        g.entry_fee,
        g.image_url,
        g.status,
        organizer.display_name
      ORDER BY g.game_date ASC, g.start_time ASC, g.created_at DESC
    `,
    [userId]
  );

  return rows.map(serializeGame);
};

const fetchMyGames = async (userId, connection = getDb()) => {
  const [rows] = await connection.execute(
    `
      SELECT
        g.id,
        g.organizer_user_id,
        g.title,
        g.sport,
        g.court_name,
        g.description,
        g.game_date,
        g.start_time,
        g.location_text,
        g.barangay,
        g.city,
        g.max_slots,
        g.entry_fee,
        g.image_url,
        g.status,
        organizer.display_name AS organizer_name,
        COALESCE(SUM(CASE WHEN gp.join_status = 'approved' THEN 1 ELSE 0 END), 0) AS slots_filled,
        MAX(membership.join_status) AS joined_status
      FROM games g
      INNER JOIN users organizer ON organizer.id = g.organizer_user_id
      LEFT JOIN game_participants gp ON gp.game_id = g.id
      LEFT JOIN game_participants membership ON membership.game_id = g.id AND membership.user_id = ?
      WHERE g.organizer_user_id = ? OR membership.user_id = ?
      GROUP BY
        g.id,
        g.organizer_user_id,
        g.title,
        g.sport,
        g.court_name,
        g.description,
        g.game_date,
        g.start_time,
        g.location_text,
        g.barangay,
        g.city,
        g.max_slots,
        g.entry_fee,
        g.image_url,
        g.status,
        organizer.display_name
      ORDER BY g.game_date ASC, g.start_time ASC, g.created_at DESC
    `,
    [userId, userId, userId]
  );

  return rows.map(serializeGame);
};

const fetchGameById = async (gameId, userId, connection = getDb()) => {
  const [rows] = await connection.execute(
    `
      SELECT
        g.id,
        g.organizer_user_id,
        g.title,
        g.sport,
        g.court_name,
        g.description,
        g.game_date,
        g.start_time,
        g.location_text,
        g.barangay,
        g.city,
        g.max_slots,
        g.entry_fee,
        g.image_url,
        g.status,
        organizer.display_name AS organizer_name,
        COALESCE(SUM(CASE WHEN gp.join_status = 'approved' THEN 1 ELSE 0 END), 0) AS slots_filled,
        MAX(self_gp.join_status) AS joined_status
      FROM games g
      INNER JOIN users organizer ON organizer.id = g.organizer_user_id
      LEFT JOIN game_participants gp ON gp.game_id = g.id
      LEFT JOIN game_participants self_gp ON self_gp.game_id = g.id AND self_gp.user_id = ?
      WHERE g.id = ?
      GROUP BY
        g.id,
        g.organizer_user_id,
        g.title,
        g.sport,
        g.court_name,
        g.description,
        g.game_date,
        g.start_time,
        g.location_text,
        g.barangay,
        g.city,
        g.max_slots,
        g.entry_fee,
        g.image_url,
        g.status,
        organizer.display_name
      LIMIT 1
    `,
    [userId, gameId]
  );

  return rows[0] ? serializeGame(rows[0]) : null;
};

const fetchPendingJoinRequests = async (gameId, organizerUserId, connection = getDb()) => {
  const [rows] = await connection.execute(
    `
      SELECT
        gp.id,
        gp.user_id,
        gp.join_status,
        gp.requested_at,
        requester.display_name,
        requester.username,
        requester.city,
        requester.barangay,
        requester.preferred_sport
      FROM game_participants gp
      INNER JOIN games g ON g.id = gp.game_id
      INNER JOIN users requester ON requester.id = gp.user_id
      WHERE gp.game_id = ?
        AND g.organizer_user_id = ?
        AND gp.join_status = 'pending'
      ORDER BY gp.requested_at ASC
    `,
    [gameId, organizerUserId]
  );

  return rows.map(serializeJoinRequest);
};

const fetchNotifications = async (userId, connection = getDb()) => {
  const [rows] = await connection.execute(
    `
      SELECT
        n.id,
        n.notification_type,
        n.title,
        n.message,
        n.related_game_id,
        n.related_user_id,
        n.is_read,
        n.created_at,
        g.title AS related_game_title
      FROM notifications n
      LEFT JOIN games g ON g.id = n.related_game_id
      WHERE n.user_id = ?
      ORDER BY n.created_at DESC
      LIMIT 50
    `,
    [userId]
  );

  return rows.map(serializeNotification);
};

const requireAuth = async (req, res, next) => {
  const token = getBearerToken(req);

  if (!token) {
    res.status(401).json({ message: 'Missing bearer token.' });
    return;
  }

  try {
    const payload = jwt.verify(token, jwtConfig.secret);
    const userRows = await fetchUserRowsById(payload.sub);

    if (!userRows.length) {
      res.status(401).json({ message: 'Session is no longer valid.' });
      return;
    }

    const user = buildAuthUser(userRows);

    if (userRows[0].account_status !== 'active') {
      res.status(403).json({ message: 'Account is not active.' });
      return;
    }

    req.authUser = user;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

export const createServer = () => {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', serverConfig.trustProxy);

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || serverConfig.corsOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error('Blocked by CORS policy.'));
      },
      credentials: true,
    })
  );

  app.use((req, res, next) => {
    if (!serverConfig.requireHttps) {
      next();
      return;
    }

    const forwardedProto = req.get('x-forwarded-proto');

    if (req.secure || forwardedProto === 'https') {
      next();
      return;
    }

    const host = req.get('host');
    res.redirect(301, `https://${host}${req.originalUrl}`);
  });

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      hsts: serverConfig.requireHttps,
      referrerPolicy: { policy: 'no-referrer' },
    })
  );
  app.use(cookieParser());
  app.use(express.json());

  app.get('/api/health', async (_req, res) => {
    try {
      const db = getDb();
      await db.query('SELECT 1');
      res.json({ ok: true, database: 'connected', httpsRequired: serverConfig.requireHttps });
    } catch (error) {
      res.status(500).json({ ok: false, message: error.message });
    }
  });

  app.post('/api/auth/refresh', refreshRateLimiter, async (req, res) => {
    const refreshToken = req.cookies?.[refreshCookieName];

    if (!refreshToken) {
      clearRefreshCookie(res);
      res.status(401).json({ message: 'No refresh session available.' });
      return;
    }

    try {
      const session = await fetchAuthSessionByToken(refreshToken);

      if (!session || session.revoked_at || new Date(session.expires_at) <= new Date()) {
        clearRefreshCookie(res);
        res.status(401).json({ message: 'Refresh session expired. Please sign in again.' });
        return;
      }

      const userRows = await fetchUserRowsById(session.user_id);

      if (!userRows.length || userRows[0].account_status !== 'active') {
        await revokeAuthSessionById(session.id);
        clearRefreshCookie(res);
        res.status(401).json({ message: 'Session is no longer valid.' });
        return;
      }

      const rotated = await rotateAuthSession(session.id, req);
      const authPayload = buildAuthResponse(userRows);

      setRefreshCookie(res, rotated.refreshToken, rotated.expiresAt);
      await writeAuditLog({
        actorUserId: authPayload.user.id,
        actionType: 'auth_refresh_success',
        targetType: 'user',
        targetId: authPayload.user.id,
        metadata: { sessionId: session.id },
        req,
      });

      res.json(authPayload);
    } catch (error) {
      console.error('Refresh failed:', error);
      clearRefreshCookie(res);
      res.status(500).json({ message: 'Unable to refresh the session.' });
    }
  });

  app.post('/api/auth/logout', async (req, res) => {
    const refreshToken = req.cookies?.[refreshCookieName];

    try {
      if (refreshToken) {
        const session = await fetchAuthSessionByToken(refreshToken);

        if (session) {
          await revokeAuthSessionById(session.id);
          await writeAuditLog({
            actorUserId: session.user_id,
            actionType: 'auth_logout',
            targetType: 'user',
            targetId: session.user_id,
            metadata: { sessionId: session.id },
            req,
          });
        }
      }
    } catch (error) {
      console.error('Logout cleanup failed:', error);
    }

    clearRefreshCookie(res);
    res.json({ success: true });
  });

  app.get('/api/auth/me', requireAuth, async (req, res) => {
    res.json({ user: req.authUser });
  });

  app.post('/api/auth/register', authRateLimiter, async (req, res) => {
    const validation = validateRegistrationInput(req.body);

    if (validation.error) {
      res.status(400).json({ message: validation.error });
      return;
    }

    const { email, password, username, displayName, city, barangay, preferredSport, role } = validation.data;

    try {
      const existingUser = await findUserConflict(email, username);

      if (existingUser) {
        const conflictField = existingUser.email === email ? 'email' : 'username';
        res.status(409).json({ message: `That ${conflictField} is already in use.` });
        return;
      }

      const roleId = await fetchRoleId(role);

      if (!roleId) {
        res.status(500).json({ message: 'Required roles are missing from the database.' });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 12);

      const otpChallenge = await issueEmailOtpChallenge({
        email,
        purpose: 'register',
        context: {
          email,
          passwordHash,
          username,
          displayName,
          city,
          barangay,
          preferredSport,
          role,
        },
      });

      await writeAuditLog({
        actionType: 'auth_register_otp_sent',
        targetType: 'user',
        metadata: { email, role, deliveryMethod: otpChallenge.deliveryMethod },
        req,
      });

      res.status(202).json({
        requiresOtp: true,
        challengeId: otpChallenge.challengeId,
        maskedEmail: otpChallenge.maskedEmail,
        expiresAt: otpChallenge.expiresAt.toISOString(),
        devOtpPreview: otpChallenge.devOtpPreview,
      });
    } catch (error) {
      console.error('Registration OTP setup failed:', error);
      res.status(500).json({ message: 'Unable to send the registration code right now.' });
    }
  });

  app.post('/api/auth/register/verify-otp', otpRateLimiter, async (req, res) => {
    const validation = validateOtpRequestInput({ ...req.body, purpose: 'register' });

    if (validation.error) {
      res.status(400).json({ message: validation.error });
      return;
    }

    const { challengeId, otp } = validation.data;
    const db = getDb();
    const connection = await db.getConnection();
    let transactionStarted = false;

    try {
      await connection.beginTransaction();
      transactionStarted = true;

      const { challenge, context } = await resolveEmailOtpChallenge({ challengeId, otp, purpose: 'register' }, connection);

      if (!context?.email || !context?.username || !context?.displayName || !context?.passwordHash) {
        throw createHttpError(400, 'Stored registration data is incomplete. Please register again.');
      }

      const existingUser = await findUserConflict(context.email, context.username, connection);

      if (existingUser) {
        const conflictField = existingUser.email === context.email ? 'email' : 'username';
        await consumeEmailOtpChallenge(challenge.id, connection);
        await connection.commit();
        transactionStarted = false;
        res.status(409).json({ message: `That ${conflictField} is already in use.` });
        return;
      }

      const roleId = await fetchRoleId(context.role, connection);

      if (!roleId) {
        throw createHttpError(500, 'Required roles are missing from the database.');
      }

      const userId = randomUUID();

      await connection.execute(
        `
          INSERT INTO users (
            id,
            email,
            password_hash,
            username,
            display_name,
            city,
            barangay,
            preferred_sport,
            account_status,
            email_verified_at,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW(), NOW(), NOW())
        `,
        [
          userId,
          context.email,
          context.passwordHash,
          context.username,
          context.displayName,
          context.city,
          context.barangay,
          context.preferredSport,
        ]
      );
      await connection.execute(
        `INSERT INTO user_roles (user_id, role_id, assigned_at, assigned_by) VALUES (?, ?, NOW(), NULL)`,
        [userId, roleId]
      );

      const session = await createAuthSession(userId, req, connection);
      await consumeEmailOtpChallenge(challenge.id, connection);
      await connection.commit();
      transactionStarted = false;

      const userRows = await fetchUserRowsById(userId, connection);
      const authPayload = buildAuthResponse(userRows);

      setRefreshCookie(res, session.refreshToken, session.expiresAt);
      await writeAuditLog({
        actorUserId: authPayload.user.id,
        actionType: 'auth_register_success',
        targetType: 'user',
        targetId: authPayload.user.id,
        metadata: { email: authPayload.user.email, role: authPayload.user.role },
        req,
      });

      res.status(201).json(authPayload);
    } catch (error) {
      if (transactionStarted) {
        try {
          await connection.rollback();
        } catch {
        }
      }

      if (error?.statusCode) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        console.error('Registration OTP verification failed:', error);
        res.status(500).json({ message: 'Unable to verify the registration code right now.' });
      }
    } finally {
      connection.release();
    }
  });

  app.post('/api/auth/login', authRateLimiter, async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || '');

    if (!email || !password.trim()) {
      res.status(400).json({ message: 'Email and password are required.' });
      return;
    }

    try {
      const rows = await fetchUserRowsByEmail(email);

      if (!rows.length) {
        await writeAuditLog({
          actionType: 'auth_login_failed',
          targetType: 'user',
          metadata: { email, reason: 'user_not_found' },
          req,
        });
        res.status(401).json({ message: 'Invalid email or password.' });
        return;
      }

      const [userRecord] = rows;

      if (userRecord.account_status !== 'active') {
        await writeAuditLog({
          actorUserId: userRecord.id,
          actionType: 'auth_login_blocked',
          targetType: 'user',
          targetId: userRecord.id,
          metadata: { email, reason: `status_${userRecord.account_status}` },
          req,
        });
        res.status(403).json({ message: 'Account is not active yet. Please verify or contact an administrator.' });
        return;
      }

      const passwordMatches = await bcrypt.compare(password, userRecord.password_hash);

      if (!passwordMatches) {
        await writeAuditLog({
          actorUserId: userRecord.id,
          actionType: 'auth_login_failed',
          targetType: 'user',
          targetId: userRecord.id,
          metadata: { email, reason: 'password_mismatch' },
          req,
        });
        res.status(401).json({ message: 'Invalid email or password.' });
        return;
      }

      const otpChallenge = await issueEmailOtpChallenge({
        email,
        purpose: 'login',
        userId: userRecord.id,
      });

      await writeAuditLog({
        actorUserId: userRecord.id,
        actionType: 'auth_login_otp_sent',
        targetType: 'user',
        targetId: userRecord.id,
        metadata: { email, deliveryMethod: otpChallenge.deliveryMethod },
        req,
      });

      res.status(202).json({
        requiresOtp: true,
        challengeId: otpChallenge.challengeId,
        maskedEmail: otpChallenge.maskedEmail,
        expiresAt: otpChallenge.expiresAt.toISOString(),
        devOtpPreview: otpChallenge.devOtpPreview,
      });
    } catch (error) {
      console.error('Login OTP setup failed:', error);
      res.status(500).json({ message: 'Unable to send the login code right now.' });
    }
  });

  app.post('/api/auth/login/verify-otp', otpRateLimiter, async (req, res) => {
    const validation = validateOtpRequestInput({ ...req.body, purpose: 'login' });

    if (validation.error) {
      res.status(400).json({ message: validation.error });
      return;
    }

    const { challengeId, otp } = validation.data;
    const db = getDb();
    const connection = await db.getConnection();
    let transactionStarted = false;

    try {
      await connection.beginTransaction();
      transactionStarted = true;

      const { challenge } = await resolveEmailOtpChallenge({ challengeId, otp, purpose: 'login' }, connection);

      if (!challenge.user_id) {
        throw createHttpError(400, 'Stored login verification data is incomplete. Please sign in again.');
      }

      const userRows = await fetchUserRowsById(challenge.user_id, connection);

      if (!userRows.length) {
        throw createHttpError(404, 'This account no longer exists.');
      }

      if (userRows[0].account_status !== 'active') {
        throw createHttpError(403, 'Account is not active yet. Please verify or contact an administrator.');
      }

      await connection.execute('UPDATE users SET last_login_at = NOW() WHERE id = ?', [challenge.user_id]);
      const session = await createAuthSession(challenge.user_id, req, connection);
      await consumeEmailOtpChallenge(challenge.id, connection);
      await connection.commit();
      transactionStarted = false;

      const authPayload = buildAuthResponse(userRows);

      setRefreshCookie(res, session.refreshToken, session.expiresAt);
      await writeAuditLog({
        actorUserId: authPayload.user.id,
        actionType: 'auth_login_success',
        targetType: 'user',
        targetId: authPayload.user.id,
        metadata: { email: authPayload.user.email, role: authPayload.user.role },
        req,
      });

      res.json(authPayload);
    } catch (error) {
      if (transactionStarted) {
        try {
          await connection.rollback();
        } catch {
        }
      }

      if (error?.statusCode) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        console.error('Login OTP verification failed:', error);
        res.status(500).json({ message: 'Unable to verify the login code right now.' });
      }
    } finally {
      connection.release();
    }
  });

  app.get('/api/games', requireAuth, async (req, res) => {
    try {
      const games = await fetchFeedGames(req.authUser.id);
      res.json({ games });
    } catch (error) {
      console.error('Load games failed:', error);
      res.status(500).json({ message: 'Unable to load games.' });
    }
  });

  app.get('/api/games/mine', requireAuth, async (req, res) => {
    try {
      const games = await fetchMyGames(req.authUser.id);
      res.json({ games });
    } catch (error) {
      console.error('Load my games failed:', error);
      res.status(500).json({ message: 'Unable to load your games.' });
    }
  });

  app.post('/api/games', requireAuth, async (req, res) => {
    if (!['organizer', 'admin'].includes(req.authUser.role)) {
      res.status(403).json({ message: 'Only organizers and admins can create games.' });
      return;
    }

    const validation = validateGameInput(req.body);

    if (validation.error) {
      res.status(400).json({ message: validation.error });
      return;
    }

    const data = validation.data;
    const db = getDb();
    const connection = await db.getConnection();
    let transactionStarted = false;

    try {
      const gameId = randomUUID();

      await connection.beginTransaction();
      transactionStarted = true;
      await connection.execute(
        `
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
            status,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'public', 'open', NOW(), NOW())
        `,
        [
          gameId,
          req.authUser.id,
          data.title,
          data.sport,
          data.courtName,
          data.description || null,
          data.gameDate,
          data.startTime,
          data.locationText,
          data.barangay,
          data.city,
          data.slots,
          data.entryFee,
          data.imageUrl,
        ]
      );
      await connection.execute(
        `
          INSERT INTO game_status_history (
            id,
            game_id,
            previous_status,
            new_status,
            changed_by,
            reason,
            created_at
          ) VALUES (?, ?, NULL, 'open', ?, 'game_created', NOW())
        `,
        [randomUUID(), gameId, req.authUser.id]
      );
      await connection.commit();

      const game = await fetchGameById(gameId, req.authUser.id, connection);
      await writeAuditLog({
        actorUserId: req.authUser.id,
        actionType: 'game_created',
        targetType: 'game',
        targetId: gameId,
        metadata: { sport: data.sport, slots: data.slots },
        req,
      });

      res.status(201).json({ game });
    } catch (error) {
      if (transactionStarted) {
        try {
          await connection.rollback();
        } catch {
        }
      }
      console.error('Create game failed:', error);
      res.status(500).json({ message: 'Unable to create the game right now.' });
    } finally {
      connection.release();
    }
  });

  app.post('/api/games/:gameId/join', requireAuth, async (req, res) => {
    const { gameId } = req.params;
    const db = getDb();
    const connection = await db.getConnection();
    let transactionStarted = false;

    try {
      const [gameRows] = await connection.execute(
        `
          SELECT
            g.id,
            g.organizer_user_id,
            g.title,
            g.max_slots,
            g.status,
            COALESCE(SUM(CASE WHEN gp.join_status = 'approved' THEN 1 ELSE 0 END), 0) AS slots_filled
          FROM games g
          LEFT JOIN game_participants gp ON gp.game_id = g.id
          WHERE g.id = ?
          GROUP BY g.id, g.organizer_user_id, g.title, g.max_slots, g.status
          LIMIT 1
        `,
        [gameId]
      );

      const game = gameRows[0];

      if (!game) {
        res.status(404).json({ message: 'Game not found.' });
        return;
      }

      if (game.organizer_user_id === req.authUser.id) {
        res.status(403).json({ message: 'You cannot join your own game.' });
        return;
      }

      if (!['open', 'full'].includes(game.status)) {
        res.status(409).json({ message: 'This game is not accepting join requests.' });
        return;
      }

      if (Number(game.slots_filled) >= Number(game.max_slots)) {
        res.status(409).json({ message: 'This game is already full.' });
        return;
      }

      const [existingRows] = await connection.execute(
        'SELECT id FROM game_participants WHERE game_id = ? AND user_id = ? LIMIT 1',
        [gameId, req.authUser.id]
      );

      if (existingRows.length) {
        res.status(409).json({ message: 'You already have a join request or membership for this game.' });
        return;
      }

      await connection.beginTransaction();
      transactionStarted = true;
      await connection.execute(
        `
          INSERT INTO game_participants (
            id,
            game_id,
            user_id,
            join_status,
            requested_at,
            notes
          ) VALUES (?, ?, ?, 'pending', NOW(), ?)
        `,
        [randomUUID(), gameId, req.authUser.id, 'Submitted from Tara Laro Phase 2 join flow']
      );
      await writeNotification(
        {
          userId: game.organizer_user_id,
          type: 'join_request',
          title: 'New join request',
          message: `${req.authUser.displayName} wants to join ${game.title}.`,
          relatedGameId: gameId,
          relatedUserId: req.authUser.id,
        },
        connection
      );
      await connection.commit();

      await writeAuditLog({
        actorUserId: req.authUser.id,
        actionType: 'game_join_requested',
        targetType: 'game',
        targetId: gameId,
        metadata: { organizerUserId: game.organizer_user_id },
        req,
      });

      res.json({ message: 'Join request sent for organizer review.' });
    } catch (error) {
      if (transactionStarted) {
        try {
          await connection.rollback();
        } catch {
        }
      }
      console.error('Join game failed:', error);
      res.status(500).json({ message: 'Unable to send the join request.' });
    } finally {
      connection.release();
    }
  });

  app.get('/api/games/:gameId/requests', requireAuth, async (req, res) => {
    const { gameId } = req.params;
    const db = getDb();

    try {
      const [gameRows] = await db.execute('SELECT id, organizer_user_id FROM games WHERE id = ? LIMIT 1', [gameId]);
      const game = gameRows[0];

      if (!game) {
        res.status(404).json({ message: 'Game not found.' });
        return;
      }

      if (game.organizer_user_id !== req.authUser.id) {
        res.status(403).json({ message: 'Only the organizer can review join requests for this game.' });
        return;
      }

      const requests = await fetchPendingJoinRequests(gameId, req.authUser.id, db);
      res.json({ requests });
    } catch (error) {
      console.error('Load join requests failed:', error);
      res.status(500).json({ message: 'Unable to load join requests right now.' });
    }
  });

  app.patch('/api/games/:gameId/requests/:requestId', requireAuth, async (req, res) => {
    const { gameId, requestId } = req.params;
    const validation = validateJoinReviewInput(req.body);

    if (validation.error) {
      res.status(400).json({ message: validation.error });
      return;
    }

    const { decision } = validation.data;
    const db = getDb();
    const connection = await db.getConnection();
    let transactionStarted = false;
    const rollbackAndRespond = async (statusCode, message) => {
      if (transactionStarted) {
        try {
          await connection.rollback();
        } catch {
        }
        transactionStarted = false;
      }

      res.status(statusCode).json({ message });
    };

    try {
      await connection.beginTransaction();
      transactionStarted = true;

      const [gameRows] = await connection.execute(
        `
          SELECT id, organizer_user_id, title, max_slots, status
          FROM games
          WHERE id = ?
          LIMIT 1
          FOR UPDATE
        `,
        [gameId]
      );
      const game = gameRows[0];

      if (!game) {
        await rollbackAndRespond(404, 'Game not found.');
        return;
      }

      if (game.organizer_user_id !== req.authUser.id) {
        await rollbackAndRespond(403, 'Only the organizer can review join requests for this game.');
        return;
      }

      if (decision === 'approved' && !['open', 'full'].includes(game.status)) {
        await rollbackAndRespond(409, 'This game is no longer accepting approved participants.');
        return;
      }

      const [requestRows] = await connection.execute(
        `
          SELECT gp.id, gp.user_id, gp.join_status, requester.display_name
          FROM game_participants gp
          INNER JOIN users requester ON requester.id = gp.user_id
          WHERE gp.id = ? AND gp.game_id = ?
          LIMIT 1
          FOR UPDATE
        `,
        [requestId, gameId]
      );
      const joinRequest = requestRows[0];

      if (!joinRequest) {
        await rollbackAndRespond(404, 'Join request not found.');
        return;
      }

      if (joinRequest.join_status !== 'pending') {
        await rollbackAndRespond(409, 'This join request has already been reviewed.');
        return;
      }

      let approvedSlots = 0;

      if (decision === 'approved') {
        const [countRows] = await connection.execute(
          `
            SELECT COUNT(*) AS approved_slots
            FROM game_participants
            WHERE game_id = ? AND join_status = 'approved'
            FOR UPDATE
          `,
          [gameId]
        );

        approvedSlots = Number(countRows[0]?.approved_slots || 0);

        if (approvedSlots >= Number(game.max_slots)) {
          await rollbackAndRespond(409, 'No slots remain for this game.');
          return;
        }
      }

      await connection.execute(
        `
          UPDATE game_participants
          SET join_status = ?,
              reviewed_at = NOW(),
              reviewed_by = ?
          WHERE id = ?
        `,
        [decision, req.authUser.id, requestId]
      );

      if (decision === 'approved' && approvedSlots + 1 >= Number(game.max_slots) && game.status !== 'full') {
        await connection.execute('UPDATE games SET status = ? WHERE id = ?', ['full', gameId]);
      }

      await writeNotification(
        {
          userId: joinRequest.user_id,
          type: decision === 'approved' ? 'accepted' : 'rejected',
          title: decision === 'approved' ? 'Join request accepted' : 'Join request declined',
          message:
            decision === 'approved'
              ? `${req.authUser.displayName} accepted your join request for ${game.title}.`
              : `${req.authUser.displayName} declined your join request for ${game.title}.`,
          relatedGameId: gameId,
          relatedUserId: req.authUser.id,
        },
        connection
      );

      await connection.commit();

      const updatedGame = await fetchGameById(gameId, req.authUser.id, connection);

      await writeAuditLog({
        actorUserId: req.authUser.id,
        actionType: decision === 'approved' ? 'game_join_approved' : 'game_join_rejected',
        targetType: 'game_participant',
        targetId: requestId,
        metadata: {
          gameId,
          participantUserId: joinRequest.user_id,
        },
        req,
      });

      res.json({
        message: decision === 'approved' ? 'Player approved for the game.' : 'Join request declined.',
        request: {
          id: requestId,
          status: decision,
          userId: joinRequest.user_id,
          displayName: joinRequest.display_name,
        },
        game: updatedGame,
      });
    } catch (error) {
      if (transactionStarted) {
        try {
          await connection.rollback();
        } catch {
        }
      }
      console.error('Review join request failed:', error);
      res.status(500).json({ message: 'Unable to review this join request right now.' });
    } finally {
      connection.release();
    }
  });

  app.get('/api/notifications', requireAuth, async (req, res) => {
    try {
      const notifications = await fetchNotifications(req.authUser.id);
      res.json({ notifications });
    } catch (error) {
      console.error('Load notifications failed:', error);
      res.status(500).json({ message: 'Unable to load notifications.' });
    }
  });

  app.get('/api/policies', async (_req, res) => {
    try {
      const db = getDb();
      const [rows] = await db.execute(
        `
          SELECT id, policy_type, version_label, title, content_md, is_active, published_at
          FROM policy_documents
          WHERE is_active = 1
          ORDER BY FIELD(policy_type, 'privacy', 'terms', 'community_rules'), published_at DESC
        `
      );

      const policies = rows.map((row) => ({
        id: row.id,
        policyType: row.policy_type,
        versionLabel: row.version_label,
        title: row.title,
        content: row.content_md,
        isActive: Boolean(row.is_active),
        publishedAt: row.published_at
          ? new Date(row.published_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          : 'Draft',
      }));

      res.json({ policies });
    } catch (error) {
      console.error('Load policies failed:', error);
      res.status(500).json({ message: 'Unable to load policy documents.' });
    }
  });

  app.post('/api/policies/:policyId/accept', requireAuth, async (req, res) => {
    const { policyId } = req.params;
    const db = getDb();

    try {
      await db.execute(
        `
          INSERT INTO policy_acceptances (
            id,
            user_id,
            policy_document_id,
            accepted_at,
            ip_address,
            user_agent
          ) VALUES (?, ?, ?, NOW(), ?, ?)
          ON DUPLICATE KEY UPDATE
            accepted_at = VALUES(accepted_at),
            ip_address = VALUES(ip_address),
            user_agent = VALUES(user_agent)
        `,
        [randomUUID(), req.authUser.id, policyId, req.ip || null, req.get('user-agent') || null]
      );

      await writeAuditLog({
        actorUserId: req.authUser.id,
        actionType: 'policy_acknowledged',
        targetType: 'policy_document',
        targetId: policyId,
        metadata: { policyId },
        req,
      });

      res.json({ accepted: true });
    } catch (error) {
      console.error('Policy acknowledgment failed:', error);
      res.status(500).json({ message: 'Unable to record policy acknowledgment.' });
    }
  });

  app.post('/api/reports', reportRateLimiter, requireAuth, async (req, res) => {
    const validation = validateReportInput(req.body);

    if (validation.error) {
      res.status(400).json({ message: validation.error });
      return;
    }

    const { targetType, targetId, category, description } = validation.data;
    const db = getDb();
    const connection = await db.getConnection();
    let transactionStarted = false;

    try {
      await connection.beginTransaction();
      transactionStarted = true;
      await connection.execute(
        `
          INSERT INTO abuse_reports (
            id,
            reporter_user_id,
            report_target_type,
            report_target_id,
            category,
            description,
            status,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'submitted', NOW(), NOW())
        `,
        [randomUUID(), req.authUser.id, targetType, targetId, category, description]
      );

      const adminIds = await fetchAdminUserIds(connection);

      for (const adminId of adminIds) {
        await writeNotification(
          {
            userId: adminId,
            type: 'security',
            title: 'New abuse report',
            message: `${req.authUser.displayName} submitted a ${category.replaceAll('_', ' ')} report for review.`,
            relatedGameId: targetType === 'game' ? targetId : null,
            relatedUserId: req.authUser.id,
          },
          connection
        );
      }

      await connection.commit();

      await writeAuditLog({
        actorUserId: req.authUser.id,
        actionType: 'report_submitted',
        targetType,
        targetId,
        metadata: { category },
        req,
      });

      res.status(201).json({ message: 'Report submitted for admin review.' });
    } catch (error) {
      if (transactionStarted) {
        try {
          await connection.rollback();
        } catch {
        }
      }
      console.error('Submit report failed:', error);
      res.status(500).json({ message: 'Unable to submit the report.' });
    } finally {
      connection.release();
    }
  });

  return app;
};

const isDirectRun = process.argv[1] === fileURLToPath(import.meta.url);

if (isDirectRun) {
  const app = createServer();

  const hasTlsFiles = Boolean(serverConfig.tlsKeyPath && serverConfig.tlsCertPath);

  if (hasTlsFiles) {
    const key = fs.readFileSync(serverConfig.tlsKeyPath);
    const cert = fs.readFileSync(serverConfig.tlsCertPath);

    https.createServer({ key, cert }, app).listen(serverConfig.port, () => {
      console.log(`Tara Laro auth server listening on https://localhost:${serverConfig.port}`);
    });
  } else {
    http.createServer(app).listen(serverConfig.port, () => {
      console.log(`Tara Laro auth server listening on http://localhost:${serverConfig.port}`);
    });
  }
}
