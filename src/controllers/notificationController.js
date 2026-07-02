import { query, queryOne } from '../config/database.js';

export async function getNotifications(req, res) {
  const notifications = await query(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
    [req.user.id]
  );
  const unread = await queryOne(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
    [req.user.id]
  );
  res.json({ success: true, data: notifications, unreadCount: unread.count });
}

export async function markAsRead(req, res) {
  const { id } = req.params;
  await query('UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?', [id, req.user.id]);
  res.json({ success: true, message: 'Marked as read' });
}

export async function markAllAsRead(req, res) {
  await query('UPDATE notifications SET is_read = TRUE WHERE user_id = ?', [req.user.id]);
  res.json({ success: true, message: 'All marked as read' });
}

export async function getUnreadCount(req, res) {
  const result = await queryOne(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
    [req.user.id]
  );
  res.json({ success: true, data: { count: result.count } });
}
