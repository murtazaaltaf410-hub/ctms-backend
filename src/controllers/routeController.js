import { query, queryOne } from '../config/database.js';
import { logAudit } from '../services/logger.js';
import { haversineDistance, estimateETA } from '../utils/geo.js';

export async function getRoutes(req, res) {
  const routes = await query(
    `SELECT r.*, COUNT(s.id) as stop_count, COUNT(b.id) as bus_count
     FROM routes r
     LEFT JOIN stops s ON s.route_id = r.id
     LEFT JOIN buses b ON b.route_id = r.id
     WHERE r.is_active = TRUE
     GROUP BY r.id ORDER BY r.name`
  );
  res.json({ success: true, data: routes });
}

export async function getRoute(req, res) {
  const route = await queryOne('SELECT * FROM routes WHERE id = ?', [req.params.id]);
  if (!route) return res.status(404).json({ success: false, message: 'Route not found' });

  const stops = await query('SELECT * FROM stops WHERE route_id = ? ORDER BY stop_order', [route.id]);
  const buses = await query(
    `SELECT b.id, b.bus_number, b.status, u.full_name as driver_name
     FROM buses b LEFT JOIN drivers d ON b.driver_id = d.id
     LEFT JOIN users u ON d.user_id = u.id WHERE b.route_id = ?`,
    [route.id]
  );

  res.json({ success: true, data: { ...route, stops, buses } });
}

export async function createRoute(req, res) {
  const { name, description, distanceKm, estimatedTimeMin, startPoint, endPoint, stops } = req.body;
  const result = await query(
    'INSERT INTO routes (name, description, distance_km, estimated_time_min, start_point, end_point) VALUES (?, ?, ?, ?, ?, ?)',
    [name, description, distanceKm, estimatedTimeMin, startPoint, endPoint]
  );

  if (stops?.length) {
    for (let i = 0; i < stops.length; i++) {
      const s = stops[i];
      await query(
        'INSERT INTO stops (route_id, name, latitude, longitude, stop_order, estimated_arrival_offset_min) VALUES (?, ?, ?, ?, ?, ?)',
        [result.insertId, s.name, s.latitude, s.longitude, i + 1, s.estimatedArrivalOffsetMin || 0]
      );
    }
  }

  await logAudit(req.user.id, 'CREATE', 'routes', result.insertId, null, req.body, req);
  res.status(201).json({ success: true, data: { id: result.insertId } });
}

export async function updateRoute(req, res) {
  const { id } = req.params;
  const { name, description, distanceKm, estimatedTimeMin, startPoint, endPoint, isActive } = req.body;
  await query(
    `UPDATE routes SET name = COALESCE(?, name), description = COALESCE(?, description),
     distance_km = COALESCE(?, distance_km), estimated_time_min = COALESCE(?, estimated_time_min),
     start_point = COALESCE(?, start_point), end_point = COALESCE(?, end_point),
     is_active = COALESCE(?, is_active) WHERE id = ?`,
    [name, description, distanceKm, estimatedTimeMin, startPoint, endPoint, isActive, id]
  );
  await logAudit(req.user.id, 'UPDATE', 'routes', id, null, req.body, req);
  res.json({ success: true, message: 'Route updated' });
}

export async function deleteRoute(req, res) {
  const { id } = req.params;
  await query('UPDATE routes SET is_active = FALSE WHERE id = ?', [id]);
  await logAudit(req.user.id, 'DELETE', 'routes', id, null, null, req);
  res.json({ success: true, message: 'Route deactivated' });
}

export async function getStops(req, res) {
  const { routeId } = req.params;
  const stops = await query('SELECT * FROM stops WHERE route_id = ? ORDER BY stop_order', [routeId]);
  res.json({ success: true, data: stops });
}

export async function addStop(req, res) {
  const { routeId } = req.params;
  const { name, latitude, longitude, stopOrder, estimatedArrivalOffsetMin } = req.body;
  const result = await query(
    'INSERT INTO stops (route_id, name, latitude, longitude, stop_order, estimated_arrival_offset_min) VALUES (?, ?, ?, ?, ?, ?)',
    [routeId, name, latitude, longitude, stopOrder, estimatedArrivalOffsetMin || 0]
  );
  res.status(201).json({ success: true, data: { id: result.insertId } });
}

export async function getStopETA(req, res) {
  const { stopId, busId } = req.query;
  const stop = await queryOne('SELECT * FROM stops WHERE id = ?', [stopId]);
  if (!stop) return res.status(404).json({ success: false, message: 'Stop not found' });

  const location = await queryOne(
    'SELECT latitude, longitude, driver_status, speed FROM live_locations WHERE bus_id = ? AND is_sharing = TRUE',
    [busId]
  );

  if (!location) {
    return res.json({
      success: true,
      data: {
        stopName: stop.name,
        distanceKm: null,
        etaMinutes: null,
        message: 'Bus location not available',
      },
    });
  }

  const distance = haversineDistance(
    parseFloat(location.latitude),
    parseFloat(location.longitude),
    parseFloat(stop.latitude),
    parseFloat(stop.longitude)
  );
  const speed = parseFloat(location.speed) || 30;
  const etaMinutes = estimateETA(distance, speed);
  const delayFactor = location.driver_status === 'delayed' ? 1.3 : location.driver_status === 'breakdown' ? 999 : 1;

  res.json({
    success: true,
    data: {
      stopName: stop.name,
      distanceKm: Math.round(distance * 100) / 100,
      etaMinutes: Math.round(etaMinutes * delayFactor),
      driverStatus: location.driver_status,
      countdown: Math.round(etaMinutes * delayFactor),
    },
  });
}

export async function searchRoutes(req, res) {
  const { q } = req.query;
  const routes = await query(
    `SELECT r.*, COUNT(s.id) as stop_count FROM routes r
     LEFT JOIN stops s ON s.route_id = r.id
     WHERE r.is_active = TRUE AND (r.name LIKE ? OR r.start_point LIKE ? OR r.end_point LIKE ?)
     GROUP BY r.id LIMIT 20`,
    [`%${q}%`, `%${q}%`, `%${q}%`]
  );
  res.json({ success: true, data: routes });
}
