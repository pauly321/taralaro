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

export const dbConfig = {
  host: required('MYSQL_HOST', '127.0.0.1'),
  port: parsePort(process.env.MYSQL_PORT, 3306),
  user: required('MYSQL_USER', 'root'),
  password: process.env.MYSQL_PASSWORD || '',
  database: required('MYSQL_DATABASE', 'tara_laro'),
  connectionLimit: parsePort(process.env.MYSQL_CONNECTION_LIMIT, 10),
};
