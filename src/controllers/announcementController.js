import { query, queryOne } from '../config/database.js';
import { logAudit, notifyAllStudents, createNotification } from '../services/logger.js';

export async function getAnnouncements(req, res) {
  const announcements = await query(
    `SELECT a.*, u.full_name as author_name, r.name as route_name, b.bus_number
     FROM announcements a
     JOIN users u ON u.id = a.created_by
     LEFT JOIN routes r ON r.id = a.route_id
     LEFT JOIN buses b ON b.id = a.bus_id
     WHERE a.is_active = TRUE AND (a.expires_at IS NULL OR a.expires_at > NOW())
     ORDER BY a.created_at DESC`
  );
  res.json({ success: true, data: announcements });
}

export async function getAnnouncement(req, res) {
  const announcement = await queryOne(
    `SELECT a.*, u.full_name as author_name FROM announcements a
     JOIN users u ON u.id = a.created_by WHERE a.id = ?`,
    [req.params.id]
  );
  if (!announcement) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, data: announcement });
}

export async function createAnnouncement(req, res) {
  const { title, message, type, priority, routeId, busId, expiresAt } = req.body;
  const result = await query(
    `INSERT INTO announcements (title, message, type, priority, route_id, bus_id, created_by, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [title, message, type || 'general', priority || 'medium', routeId || null, busId || null, req.user.id, expiresAt || null]
  );

  await logAudit(req.user.id, 'CREATE', 'announcements', result.insertId, null, req.body, req);
  const count = await notifyAllStudents(title, message, type || 'general', result.insertId, 'announcement');

  const io = req.app.get('io');
  io?.emit('announcement:new', {
    id: result.insertId,
    title,
    message,
    type: type || 'general',
    priority: priority || 'medium',
    createdAt: new Date().toISOString(),
  });

  res.status(201).json({ success: true, data: { id: result.insertId }, notified: count });
}

export async function updateAnnouncement(req, res) {
  const { id } = req.params;
  const { title, message, type, priority, isActive, expiresAt } = req.body;
  await query(
    `UPDATE announcements SET title = COALESCE(?, title), message = COALESCE(?, message),
     type = COALESCE(?, type), priority = COALESCE(?, priority), is_active = COALESCE(?, is_active),
     expires_at = COALESCE(?, expires_at) WHERE id = ?`,
    [title, message, type, priority, isActive, expiresAt, id]
  );
  await logAudit(req.user.id, 'UPDATE', 'announcements', id, null, req.body, req);
  res.json({ success: true, message: 'Announcement updated' });
}

export async function deleteAnnouncement(req, res) {
  const { id } = req.params;
  await query('UPDATE announcements SET is_active = FALSE WHERE id = ?', [id]);
  await logAudit(req.user.id, 'DELETE', 'announcements', id, null, null, req);
  res.json({ success: true, message: 'Announcement deleted' });
}

export async function getLatestNotice(req, res) {
  const notice = await queryOne(
    `SELECT * FROM announcements WHERE is_active = TRUE
     ORDER BY FIELD(priority, 'critical', 'high', 'medium', 'low'), created_at DESC LIMIT 1`
  );
  res.json({ success: true, data: notice });
}
