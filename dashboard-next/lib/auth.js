import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || '').trim();

export function getAuthCookieName() {
  return 'email_dashboard_auth';
}

export function getAuthCookieOptions(maxAge = 7 * 24 * 60 * 60) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    path: '/',
    maxAge
  };
}

export function signAuthToken(payload) {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyAuthToken(token) {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export async function validateAdminCredentials(email, password) {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    return false;
  }

  if (String(email || '').trim().toLowerCase() !== ADMIN_EMAIL) {
    return false;
  }

  if (ADMIN_PASSWORD.startsWith('$2a$') || ADMIN_PASSWORD.startsWith('$2b$') || ADMIN_PASSWORD.startsWith('$2y$')) {
    return bcrypt.compare(password || '', ADMIN_PASSWORD);
  }

  return String(password || '') === ADMIN_PASSWORD;
}
