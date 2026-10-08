import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const appSecret = process.env.APP_SECRET || 'dev-app-secret-placeholder';
const jwtSecret = process.env.JWT_SECRET || 'dev-jwt-secret-placeholder';

export function createToken(secret) {
  if (secret !== appSecret) return null;
  return jwt.sign({ role: 'owner', jti: crypto.randomBytes(32).toString('hex') }, jwtSecret, { expiresIn: '7d' });
}

export function verifyToken(request) {
  const value = request.headers.get('authorization') || '';
  const token = value.startsWith('Bearer ') ? value.slice(7) : '';
  return token ? jwt.verify(token, jwtSecret) : null;
}
