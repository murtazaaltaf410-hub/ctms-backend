import { query, queryOne } from '../config/database.js';
import { hashPassword, comparePassword, generateResetToken } from '../utils/password.js';
import { generateToken, generateRefreshToken } from '../utils/jwt.js';
import { logActivity } from '../services/logger.js';
import config from '../config/index.js';

function setTokenCookies(res, token, refreshToken, remember = false) {
  const maxAge = remember ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const cookieOpts = {
    httpOnly: true,
    secure: config.secureCookies,
    sameSite: 'strict',
    maxAge,
  };
  res.cookie('token', token, cookieOpts);
  if (remember) {
    res.cookie('refreshToken', refreshToken, { ...cookieOpts, maxAge: 7 * 24 * 60 * 60 * 1000 });
  }
}

function clearTokenCookies(res) {
  res.clearCookie('token');
  res.clearCookie('refreshToken');
}

export async function login(req, res) {
  const { email, password, remember = false, role } = req.body;

  const user = await queryOne(
    'SELECT id, email, password_hash, role, full_name, phone, avatar_url, is_active FROM users WHERE email = ?',
    [email]
  );

  if (!user || !user.is_active) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  if (role && user.role !== role) {
    return res.status(403).json({ success: false, message: `Please use ${user.role} login portal` });
  }

  const valid = await comparePassword(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  await query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

  const tokenPayload = { userId: user.id, role: user.role, email: user.email };
  const token = generateToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  setTokenCookies(res, token, refreshToken, remember);
  await logActivity(user.id, 'LOGIN', 'user', user.id, null, req);

  let profile = null;
  if (user.role === 'student') {
    profile = await queryOne('SELECT * FROM students WHERE user_id = ?', [user.id]);
  } else if (user.role === 'driver') {
    profile = await queryOne(
      `SELECT d.*, b.bus_number, b.id as bus_id, r.name as route_name
       FROM drivers d
       LEFT JOIN buses b ON b.driver_id = d.id
       LEFT JOIN routes r ON b.route_id = r.id
       WHERE d.user_id = ?`,
      [user.id]
    );
  }

  res.json({
    success: true,
    data: {
      token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.full_name,
        phone: user.phone,
        avatarUrl: user.avatar_url,
        profile,
      },
    },
  });
}

export async function logout(req, res) {
  clearTokenCookies(res);
  if (req.user) {
    await logActivity(req.user.id, 'LOGOUT', 'user', req.user.id, null, req);
  }
  res.json({ success: true, message: 'Logged out successfully' });
}

export async function getMe(req, res) {
  const user = req.user;
  let profile = null;

  if (user.role === 'student') {
    profile = await queryOne(
      `SELECT s.*, b.bus_number as favorite_bus_number
       FROM students s LEFT JOIN buses b ON s.favorite_bus_id = b.id
       WHERE s.user_id = ?`,
      [user.id]
    );
  } else if (user.role === 'driver') {
    profile = await queryOne(
      `SELECT d.*, b.bus_number, b.id as bus_id, r.name as route_name, r.id as route_id
       FROM drivers d
       LEFT JOIN buses b ON b.driver_id = d.id
       LEFT JOIN routes r ON b.route_id = r.id
       WHERE d.user_id = ?`,
      [user.id]
    );
  }

  res.json({
    success: true,
    data: {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.full_name,
      phone: user.phone,
      avatarUrl: user.avatar_url,
      profile,
    },
  });
}

export async function forgotPassword(req, res) {
  const { email } = req.body;
  const user = await queryOne('SELECT id FROM users WHERE email = ?', [email]);

  if (user) {
    const token = generateResetToken();
    const expires = new Date(Date.now() + 3600000);
    await query(
      'UPDATE users SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?',
      [token, expires, user.id]
    );
    await logActivity(user.id, 'PASSWORD_RESET_REQUEST', 'user', user.id, null, req);
  }

  res.json({
    success: true,
    message: 'If an account exists with this email, a reset link has been sent.',
    ...(process.env.NODE_ENV === 'development' && user && { devToken: 'check server logs' }),
  });
}

export async function resetPassword(req, res) {
  const { token, password } = req.body;
  const user = await queryOne(
    'SELECT id FROM users WHERE password_reset_token = ? AND password_reset_expires > NOW()',
    [token]
  );

  if (!user) {
    return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
  }

  const hash = await hashPassword(password);
  await query(
    'UPDATE users SET password_hash = ?, password_reset_token = NULL, password_reset_expires = NULL WHERE id = ?',
    [hash, user.id]
  );
  await logActivity(user.id, 'PASSWORD_RESET', 'user', user.id, null, req);

  res.json({ success: true, message: 'Password reset successfully' });
}

export async function refreshToken(req, res) {
  const refresh = req.cookies?.refreshToken || req.body.refreshToken;
  if (!refresh) {
    return res.status(401).json({ success: false, message: 'Refresh token required' });
  }

  try {
    const { verifyToken } = await import('../utils/jwt.js');
    const decoded = verifyToken(refresh);
    const token = generateToken({ userId: decoded.userId, role: decoded.role, email: decoded.email });
    setTokenCookies(res, token, refresh, true);
    res.json({ success: true, data: { token } });
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
}

export async function registerStudent(req, res) {
  const { email, password, fullName, phone, studentId, department, semester } = req.body;

  const existing = await queryOne('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) {
    return res.status(409).json({ success: false, message: 'Email already registered' });
  }

  const hash = await hashPassword(password);
  const result = await query(
    'INSERT INTO users (email, password_hash, role, full_name, phone) VALUES (?, ?, ?, ?, ?)',
    [email, hash, 'student', fullName, phone || null]
  );

  await query(
    'INSERT INTO students (user_id, student_id, department, semester) VALUES (?, ?, ?, ?)',
    [result.insertId, studentId, department || null, semester || null]
  );

  res.status(201).json({ success: true, message: 'Student registered successfully' });
}
