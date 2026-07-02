import jwt from 'jsonwebtoken';
import config from '../config/index.js';

export function generateToken(payload, expiresIn = config.jwt.expiresIn) {
  return jwt.sign(payload, config.jwt.secret, { expiresIn });
}

export function generateRefreshToken(payload) {
  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.refreshExpiresIn });
}

export function verifyToken(token) {
  return jwt.verify(token, config.jwt.secret);
}

export function decodeToken(token) {
  return jwt.decode(token);
}
