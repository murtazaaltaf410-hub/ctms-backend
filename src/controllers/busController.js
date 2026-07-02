import { query, queryOne } from '../config/database.js';
import { logAudit } from '../services/logger.js';

export async function getBuses(req, res) {
  const buses = await query(
    `SELECT b.*, r.name as route_name, u.full_name as driver_name, d.id as driver_table_id,
            ll.latitude, ll.longitude, ll.driver_status, ll.is_sharing, ll.journey_status
     FROM buses b
     LEFT JOIN routes r ON b.route_id = r.id
     LEFT JOIN drivers d ON b.driver_id = d.id
     LEFT JOIN users u ON d.user_id = u.id
     LEFT JOIN live_locations ll ON ll.bus_id = b.id
     ORDER BY b.bus_number`
  );
  res.json({ success: true, data: buses });
}

export async function getBus(req, res) {
  const bus = await queryOne(
    `SELECT b.*, r.name as route_name, r.distance_km, r.estimated_time_min,
            u.full_name as driver_name, d.rating as driver_rating,
            ll.latitude, ll.longitude, ll.driver_status, ll.is_sharing, ll.speed, ll.heading
     FROM buses b
     LEFT JOIN routes r ON b.route_id = r.id
     LEFT JOIN drivers d ON b.driver_id = d.id
     LEFT JOIN users u ON d.user_id = u.id
     LEFT JOIN live_locations ll ON ll.bus_id = b.id
     WHERE b.id = ?`,
    [req.params.id]
  );
  if (!bus) return res.status(404).json({ success: false, message: 'Bus not found' });

  const stops = bus.route_id
    ? await query('SELECT * FROM stops WHERE route_id = ? ORDER BY stop_order', [bus.route_id])
    : [];

  res.json({ success: true, data: { ...bus, stops } });
}

export async function getBusByNumber(req, res) {
  const bus = await queryOne(
    `SELECT b.*, r.name as route_name, u.full_name as driver_name,
            ll.latitude, ll.longitude, ll.driver_status, ll.is_sharing
     FROM buses b
     LEFT JOIN routes r ON b.route_id = r.id
     LEFT JOIN drivers d ON b.driver_id = d.id
     LEFT JOIN users u ON d.user_id = u.id
     LEFT JOIN live_locations ll ON ll.bus_id = b.id
     WHERE b.bus_number = ?`,
    [req.params.number]
  );
  if (!bus) return res.status(404).json({ success: false, message: 'Bus not found' });
  res.json({ success: true, data: bus });
}

export async function createBus(req, res) {
  const { busNumber, capacity, routeId, driverId, status } = req.body;
  const qrCode = `${busNumber}-QR-${Date.now()}`;
  const result = await query(
    'INSERT INTO buses (bus_number, capacity, route_id, driver_id, qr_code, status) VALUES (?, ?, ?, ?, ?, ?)',
    [busNumber, capacity, routeId || null, driverId || null, qrCode, status || 'idle']
  );
  if (driverId) {
    await query('UPDATE drivers SET is_on_duty = TRUE WHERE id = ?', [driverId]);
  }
  await logAudit(req.user.id, 'CREATE', 'buses', result.insertId, null, req.body, req);
  res.status(201).json({ success: true, data: { id: result.insertId, qrCode } });
}

export async function updateBus(req, res) {
  const { id } = req.params;
  const old = await queryOne('SELECT * FROM buses WHERE id = ?', [id]);
  const { busNumber, capacity, routeId, driverId, status, occupancy } = req.body;

  await query(
    `UPDATE buses SET bus_number = COALESCE(?, bus_number), capacity = COALESCE(?, capacity),
     route_id = COALESCE(?, route_id), driver_id = COALESCE(?, driver_id),
     status = COALESCE(?, status), occupancy = COALESCE(?, occupancy) WHERE id = ?`,
    [busNumber, capacity, routeId, driverId, status, occupancy, id]
  );
  await logAudit(req.user.id, 'UPDATE', 'buses', id, old, req.body, req);
  res.json({ success: true, message: 'Bus updated' });
}

export async function deleteBus(req, res) {
  const { id } = req.params;
  const old = await queryOne('SELECT * FROM buses WHERE id = ?', [id]);
  await query('DELETE FROM buses WHERE id = ?', [id]);
  await logAudit(req.user.id, 'DELETE', 'buses', id, old, null, req);
  res.json({ success: true, message: 'Bus deleted' });
}

export async function searchBuses(req, res) {
  const { q } = req.query;
  const buses = await query(
    `SELECT b.id, b.bus_number, r.name as route_name, b.status
     FROM buses b LEFT JOIN routes r ON b.route_id = r.id
     WHERE b.bus_number LIKE ? OR r.name LIKE ?
     LIMIT 20`,
    [`%${q}%`, `%${q}%`]
  );
  res.json({ success: true, data: buses });
}

export async function setFavoriteBus(req, res) {
  const { busId } = req.body;
  const student = await queryOne('SELECT id FROM students WHERE user_id = ?', [req.user.id]);
  if (!student) return res.status(404).json({ success: false, message: 'Student profile not found' });
  await query('UPDATE students SET favorite_bus_id = ? WHERE id = ?', [busId, student.id]);
  res.json({ success: true, message: 'Favorite bus updated' });
}

export async function getPublicStats(req, res) {
  const [buses, routes, students, activeTrips] = await Promise.all([
    queryOne("SELECT COUNT(*) as count FROM buses WHERE status = 'active'"),
    queryOne('SELECT COUNT(*) as count FROM routes WHERE is_active = TRUE'),
    queryOne("SELECT COUNT(*) as count FROM users WHERE role = 'student'"),
    queryOne("SELECT COUNT(*) as count FROM live_locations WHERE is_sharing = TRUE"),
  ]);
  res.json({
    success: true,
    data: {
      activeBuses: buses.count,
      totalRoutes: routes.count,
      registeredStudents: students.count,
      liveTrips: activeTrips.count,
    },
  });
}
