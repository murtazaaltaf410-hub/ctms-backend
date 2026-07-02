import { query, queryOne } from '../config/database.js';
import { logActivity } from '../services/logger.js';

export async function getDashboard(req, res) {
  const driver = await queryOne(
    `SELECT d.*, u.full_name, u.email, u.phone, b.id as bus_id, b.bus_number, b.capacity, b.occupancy,
            r.id as route_id, r.name as route_name, r.distance_km, r.estimated_time_min,
            ll.latitude, ll.longitude, ll.is_sharing, ll.journey_status, ll.driver_status
     FROM drivers d
     JOIN users u ON u.id = d.user_id
     LEFT JOIN buses b ON b.driver_id = d.id
     LEFT JOIN routes r ON b.route_id = r.id
     LEFT JOIN live_locations ll ON ll.bus_id = b.id
     WHERE d.user_id = ?`,
    [req.user.id]
  );

  if (!driver) return res.status(404).json({ success: false, message: 'Driver profile not found' });

  const stops = driver.route_id
    ? await query('SELECT * FROM stops WHERE route_id = ? ORDER BY stop_order', [driver.route_id])
    : [];

  res.json({ success: true, data: { ...driver, stops } });
}

export async function startJourney(req, res) {
  const driver = await queryOne('SELECT id FROM drivers WHERE user_id = ?', [req.user.id]);
  const bus = await queryOne('SELECT id, route_id FROM buses WHERE driver_id = ?', [driver.id]);
  if (!bus) return res.status(400).json({ success: false, message: 'No bus assigned' });

  await query(
    `INSERT INTO live_locations (bus_id, driver_id, latitude, longitude, journey_status, is_sharing)
     VALUES (?, ?, 34.23500000, 74.31000000, 'in_progress', FALSE)
     ON DUPLICATE KEY UPDATE journey_status = 'in_progress', driver_status = 'on_time'`,
    [bus.id, driver.id]
  );

  await query(
    'INSERT INTO journey_sessions (bus_id, driver_id, route_id, status) VALUES (?, ?, ?, ?)',
    [bus.id, driver.id, bus.route_id, 'active']
  );

  await query('UPDATE buses SET status = ? WHERE id = ?', ['active', bus.id]);
  await query('UPDATE drivers SET is_on_duty = TRUE WHERE id = ?', [driver.id]);
  await logActivity(req.user.id, 'START_JOURNEY', 'bus', bus.id, null, req);

  const io = req.app.get('io');
  io?.emit('journey:started', { busId: bus.id, driverId: driver.id });

  res.json({ success: true, message: 'Journey started' });
}

export async function shareLocation(req, res) {
  const { latitude, longitude, speed, heading } = req.body;
  const driver = await queryOne('SELECT id FROM drivers WHERE user_id = ?', [req.user.id]);
  const bus = await queryOne('SELECT id, route_id FROM buses WHERE driver_id = ?', [driver.id]);
  if (!bus) return res.status(400).json({ success: false, message: 'No bus assigned' });

  await query(
    `INSERT INTO live_locations (bus_id, driver_id, latitude, longitude, speed, heading, is_sharing, journey_status)
     VALUES (?, ?, ?, ?, ?, ?, TRUE, 'in_progress')
     ON DUPLICATE KEY UPDATE latitude = ?, longitude = ?, speed = ?, heading = ?, is_sharing = TRUE, updated_at = NOW()`,
    [bus.id, driver.id, latitude, longitude, speed || 0, heading || 0, latitude, longitude, speed || 0, heading || 0]
  );

  const io = req.app.get('io');
  const locationData = {
    busId: bus.id,
    latitude,
    longitude,
    speed: speed || 0,
    heading: heading || 0,
    timestamp: new Date().toISOString(),
  };
  io?.emit('bus:location', locationData);
  io?.to(`bus-${bus.id}`).emit('bus:location', locationData);

  res.json({ success: true, message: 'Location updated' });
}

export async function pauseJourney(req, res) {
  const driver = await queryOne('SELECT id FROM drivers WHERE user_id = ?', [req.user.id]);
  const bus = await queryOne('SELECT id FROM buses WHERE driver_id = ?', [driver.id]);
  if (!bus) return res.status(400).json({ success: false, message: 'No bus assigned' });

  await query(
    "UPDATE live_locations SET journey_status = 'paused', is_sharing = FALSE WHERE bus_id = ?",
    [bus.id]
  );
  await query("UPDATE journey_sessions SET status = 'paused' WHERE bus_id = ? AND status = 'active'", [bus.id]);

  req.app.get('io')?.emit('journey:paused', { busId: bus.id });
  res.json({ success: true, message: 'Journey paused' });
}

export async function endJourney(req, res) {
  const driver = await queryOne('SELECT id FROM drivers WHERE user_id = ?', [req.user.id]);
  const bus = await queryOne('SELECT id FROM buses WHERE driver_id = ?', [driver.id]);
  if (!bus) return res.status(400).json({ success: false, message: 'No bus assigned' });

  await query(
    "UPDATE live_locations SET journey_status = 'completed', driver_status = 'completed', is_sharing = FALSE WHERE bus_id = ?",
    [bus.id]
  );
  await query(
    "UPDATE journey_sessions SET status = 'completed', ended_at = NOW() WHERE bus_id = ? AND status IN ('active', 'paused')",
    [bus.id]
  );
  await query('UPDATE buses SET status = ? WHERE id = ?', ['idle', bus.id]);
  await query('UPDATE drivers SET is_on_duty = FALSE WHERE id = ?', [driver.id]);
  await query('UPDATE drivers SET total_trips = total_trips + 1 WHERE id = ?', [driver.id]);

  req.app.get('io')?.emit('journey:ended', { busId: bus.id });
  res.json({ success: true, message: 'Journey completed' });
}

export async function updateStatus(req, res) {
  const { driverStatus, occupancy } = req.body;
  const driver = await queryOne('SELECT id FROM drivers WHERE user_id = ?', [req.user.id]);
  const bus = await queryOne('SELECT id FROM buses WHERE driver_id = ?', [driver.id]);
  if (!bus) return res.status(400).json({ success: false, message: 'No bus assigned' });

  if (driverStatus) {
    await query('UPDATE live_locations SET driver_status = ? WHERE bus_id = ?', [driverStatus, bus.id]);
  }
  if (occupancy) {
    await query('UPDATE buses SET occupancy = ? WHERE id = ?', [occupancy, bus.id]);
  }

  req.app.get('io')?.emit('bus:status', { busId: bus.id, driverStatus, occupancy });
  res.json({ success: true, message: 'Status updated' });
}

export async function toggleSharing(req, res) {
  const { enabled } = req.body;
  const driver = await queryOne('SELECT id FROM drivers WHERE user_id = ?', [req.user.id]);
  const bus = await queryOne('SELECT id FROM buses WHERE driver_id = ?', [driver.id]);
  if (!bus) return res.status(400).json({ success: false, message: 'No bus assigned' });

  await query('UPDATE live_locations SET is_sharing = ? WHERE bus_id = ?', [enabled, bus.id]);
  res.json({ success: true, message: enabled ? 'Location sharing enabled' : 'Location sharing disabled' });
}
