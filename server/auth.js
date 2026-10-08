import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const appSecret = process.env.APP_SECRET;
const jwtSecret = process.env.JWT_SECRET;

if (!appSecret || !jwtSecret) throw new Error('APP_SECRET dan JWT_SECRET wajib diatur di .env');

export function createToken(secret) {
  if (secret !== appSecret) return null;
  return jwt.sign({ role: 'owner', jti: crypto.randomBytes(32).toString('hex') }, jwtSecret, { expiresIn: '7d' });
}

export function verifyToken(request) {
  const value = request.headers.get('authorization') || '';
  const token = value.startsWith('Bearer ') ? value.slice(7) : '';
  return token ? jwt.verify(token, jwtSecret) : null;
}
