import bcrypt from 'bcryptjs';
import config from '../config/index.js';

export async function hashPassword(password) {
  return bcrypt.hash(password, config.bcryptRounds);
}

export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function generateResetToken() {
  return bcrypt.hashSync(Date.now().toString(), 10).replace(/[^a-zA-Z0-9]/g, '').slice(0, 64);
}
