import 'dotenv/config';

const parsePort = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseBoolean = (value, fallback = false) => {
  if (typeof value === 'undefined') {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
};

const required = (name, fallback = '') => {
  const value = process.env[name] ?? fallback;

  if (value === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

export const serverConfig = {
  port: parsePort(process.env.PORT, 3001),
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  trustProxy: parsePort(process.env.TRUST_PROXY, 1),
  requireHttps: parseBoolean(process.env.REQUIRE_HTTPS, false),
  cookieSecure: parseBoolean(process.env.COOKIE_SECURE, false),
  cookieDomain: process.env.COOKIE_DOMAIN || undefined,
  tlsKeyPath: process.env.TLS_KEY_PATH || '',
  tlsCertPath: process.env.TLS_CERT_PATH || '',
};

export const jwtConfig = {
  secret: required('JWT_SECRET', 'change-this-jwt-secret'),
  expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  refreshExpiresDays: parsePort(process.env.JWT_REFRESH_EXPIRES_DAYS, 7),
};

export const otpConfig = {
  codeLength: parsePort(process.env.EMAIL_OTP_LENGTH, 6),
  expiryMinutes: parsePort(process.env.EMAIL_OTP_EXPIRY_MINUTES, 10),
  maxAttempts: parsePort(process.env.EMAIL_OTP_MAX_ATTEMPTS, 5),
  devMode: parseBoolean(process.env.EMAIL_OTP_DEV_MODE, process.env.NODE_ENV !== 'production'),
};

export const emailConfig = {
  host: process.env.SMTP_HOST || '',
  port: parsePort(process.env.SMTP_PORT, 587),
  secure: parseBoolean(process.env.SMTP_SECURE, false),
  user: process.env.SMTP_USER || '',
  password: process.env.SMTP_PASSWORD || '',
  fromEmail: process.env.SMTP_FROM_EMAIL || 'no-reply@taralaro.local',
  fromName: process.env.SMTP_FROM_NAME || 'Tara Laro',
};

export const dbConfig = {
  host: required('MYSQL_HOST', '127.0.0.1'),
  port: parsePort(process.env.MYSQL_PORT, 3306),
  user: required('MYSQL_USER', 'root'),
  password: process.env.MYSQL_PASSWORD || '',
  database: required('MYSQL_DATABASE', 'tara_laro'),
  connectionLimit: parsePort(process.env.MYSQL_CONNECTION_LIMIT, 10),
};
