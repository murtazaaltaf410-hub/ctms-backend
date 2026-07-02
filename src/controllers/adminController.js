import { query, queryOne } from '../config/database.js';
import { hashPassword } from '../utils/password.js';
import { logAudit } from '../services/logger.js';

export async function getStats(req, res) {
  const [students, drivers, activeBuses, delayedBuses] = await Promise.all([
    queryOne("SELECT COUNT(*) as count FROM users WHERE role = 'student' AND is_active = TRUE"),
    queryOne("SELECT COUNT(*) as count FROM users WHERE role = 'driver' AND is_active = TRUE"),
    queryOne("SELECT COUNT(*) as count FROM buses WHERE status = 'active'"),
    queryOne("SELECT COUNT(*) as count FROM live_locations WHERE driver_status = 'delayed' AND is_sharing = TRUE"),
  ]);

  const dailyUsage = await query(
    `SELECT DATE(created_at) as date, COUNT(*) as logins
     FROM activity_logs WHERE action = 'LOGIN' AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
     GROUP BY DATE(created_at) ORDER BY date`
  );

  const routeStats = await query(
    `SELECT r.name, COUNT(b.id) as bus_count, r.distance_km, r.estimated_time_min
     FROM routes r LEFT JOIN buses b ON b.route_id = r.id
     WHERE r.is_active = TRUE GROUP BY r.id`
  );

  const busPerformance = await query(
    `SELECT b.bus_number, d.rating, d.total_trips, ll.driver_status
     FROM buses b
     LEFT JOIN drivers d ON b.driver_id = d.id
     LEFT JOIN live_locations ll ON ll.bus_id = b.id
     ORDER BY d.rating DESC LIMIT 10`
  );

  res.json({
    success: true,
    data: {
      totalStudents: students.count,
      totalDrivers: drivers.count,
      activeBuses: activeBuses.count,
      delayedBuses: delayedBuses.count,
      dailyUsage,
      routeStats,
      busPerformance,
    },
  });
}

export async function getStudents(req, res) {
  const students = await query(
    `SELECT u.id, u.email, u.full_name, u.phone, u.is_active, u.last_login, u.created_at,
            s.student_id, s.department, s.semester
     FROM users u JOIN students s ON s.user_id = u.id
     WHERE u.role = 'student' ORDER BY u.created_at DESC`
  );
  res.json({ success: true, data: students });
}

export async function createStudent(req, res) {
  const { email, password, fullName, phone, studentId, department, semester } = req.body;
  const existing = await queryOne('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) return res.status(409).json({ success: false, message: 'Email exists' });

  const hash = await hashPassword(password);
  const result = await query(
    'INSERT INTO users (email, password_hash, role, full_name, phone) VALUES (?, ?, ?, ?, ?)',
    [email, hash, 'student', fullName, phone]
  );
  await query(
    'INSERT INTO students (user_id, student_id, department, semester) VALUES (?, ?, ?, ?)',
    [result.insertId, studentId, department, semester]
  );
  await logAudit(req.user.id, 'CREATE', 'students', result.insertId, null, req.body, req);
  res.status(201).json({ success: true, message: 'Student created', data: { id: result.insertId } });
}

export async function updateStudent(req, res) {
  const { id } = req.params;
  const { fullName, phone, department, semester, isActive } = req.body;
  await query(
    'UPDATE users SET full_name = COALESCE(?, full_name), phone = COALESCE(?, phone), is_active = COALESCE(?, is_active) WHERE id = ?',
    [fullName, phone, isActive, id]
  );
  await query(
    'UPDATE students SET department = COALESCE(?, department), semester = COALESCE(?, semester) WHERE user_id = ?',
    [department, semester, id]
  );
  await logAudit(req.user.id, 'UPDATE', 'students', id, null, req.body, req);
  res.json({ success: true, message: 'Student updated' });
}

export async function deleteStudent(req, res) {
  const { id } = req.params;
  await query('DELETE FROM users WHERE id = ? AND role = ?', [id, 'student']);
  await logAudit(req.user.id, 'DELETE', 'students', id, null, null, req);
  res.json({ success: true, message: 'Student deleted' });
}

export async function getDrivers(req, res) {
  const drivers = await query(
    `SELECT u.id, u.email, u.full_name, u.phone, u.is_active, d.license_number, d.experience_years,
            d.rating, d.total_trips, d.is_on_duty, b.bus_number, b.id as bus_id
     FROM users u JOIN drivers d ON d.user_id = u.id
     LEFT JOIN buses b ON b.driver_id = d.id
     WHERE u.role = 'driver' ORDER BY u.full_name`
  );
  res.json({ success: true, data: drivers });
}

export async function createDriver(req, res) {
  const { email, password, fullName, phone, licenseNumber, experienceYears } = req.body;
  const existing = await queryOne('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) return res.status(409).json({ success: false, message: 'Email exists' });

  const hash = await hashPassword(password);
  const result = await query(
    'INSERT INTO users (email, password_hash, role, full_name, phone) VALUES (?, ?, ?, ?, ?)',
    [email, hash, 'driver', fullName, phone]
  );
  await query(
    'INSERT INTO drivers (user_id, license_number, experience_years) VALUES (?, ?, ?)',
    [result.insertId, licenseNumber, experienceYears || 0]
  );
  await logAudit(req.user.id, 'CREATE', 'drivers', result.insertId, null, req.body, req);
  res.status(201).json({ success: true, message: 'Driver created' });
}

export async function updateDriver(req, res) {
  const { id } = req.params;
  const { fullName, phone, licenseNumber, experienceYears, isActive } = req.body;
  await query(
    'UPDATE users SET full_name = COALESCE(?, full_name), phone = COALESCE(?, phone), is_active = COALESCE(?, is_active) WHERE id = ?',
    [fullName, phone, isActive, id]
  );
  await query(
    'UPDATE drivers SET license_number = COALESCE(?, license_number), experience_years = COALESCE(?, experience_years) WHERE user_id = ?',
    [licenseNumber, experienceYears, id]
  );
  await logAudit(req.user.id, 'UPDATE', 'drivers', id, null, req.body, req);
  res.json({ success: true, message: 'Driver updated' });
}

export async function deleteDriver(req, res) {
  const { id } = req.params;
  await query('DELETE FROM users WHERE id = ? AND role = ?', [id, 'driver']);
  await logAudit(req.user.id, 'DELETE', 'drivers', id, null, null, req);
  res.json({ success: true, message: 'Driver deleted' });
}

export async function getReports(req, res) {
  const { type = 'usage', from, to } = req.query;
  let data;

  if (type === 'usage') {
    data = await query(
      `SELECT al.created_at, u.full_name, u.role, al.action
       FROM activity_logs al JOIN users u ON u.id = al.user_id
       WHERE al.created_at >= COALESCE(?, DATE_SUB(NOW(), INTERVAL 30 DAY))
       AND al.created_at <= COALESCE(?, NOW())
       ORDER BY al.created_at DESC LIMIT 500`,
      [from || null, to || null]
    );
  } else if (type === 'audit') {
    data = await query(
      `SELECT at.*, u.full_name as admin_name
       FROM audit_trail at JOIN users u ON u.id = at.admin_id
       ORDER BY at.created_at DESC LIMIT 500`
    );
  } else {
    data = await query(
      `SELECT b.bus_number, d.rating, d.total_trips, ll.driver_status, r.name as route_name
       FROM buses b
       LEFT JOIN drivers d ON b.driver_id = d.id
       LEFT JOIN live_locations ll ON ll.bus_id = b.id
       LEFT JOIN routes r ON b.route_id = r.id`
    );
  }

  res.json({ success: true, data });
}

export async function getSettings(req, res) {
  res.json({
    success: true,
    data: {
      systemName: 'CTMS - University of Kashmir North Campus',
      contactEmail: 'transport@uoknorth.edu.in',
      contactPhone: '+91-1954-XXX-XXX',
      operatingHours: '7:00 AM - 6:00 PM',
      emergencyContact: '+91-9900000000',
    },
  });
}

export async function getLiveStats(req, res) {
  const buses = await query(
    `SELECT b.id, b.bus_number, b.status, b.occupancy, ll.latitude, ll.longitude,
            ll.driver_status, ll.is_sharing, ll.journey_status, ll.updated_at,
            u.full_name as driver_name, r.name as route_name
     FROM buses b
     LEFT JOIN live_locations ll ON ll.bus_id = b.id
     LEFT JOIN drivers d ON b.driver_id = d.id
     LEFT JOIN users u ON d.user_id = u.id
     LEFT JOIN routes r ON b.route_id = r.id
     WHERE b.status != 'inactive'`
  );
  res.json({ success: true, data: buses });
}
