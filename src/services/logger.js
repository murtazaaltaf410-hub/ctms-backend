import { query } from '../config/database.js';

export async function logActivity(userId, action, entityType = null, entityId = null, details = null, req = null) {
  try {
    await query(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        action,
        entityType,
        entityId,
        details ? JSON.stringify(details) : null,
        req?.ip || null,
        req?.get?.('User-Agent') || null,
      ]
    );
  } catch (err) {
    console.error('Activity log error:', err.message);
  }
}

export async function logAudit(adminId, action, tableName, recordId, oldValues, newValues, req = null) {
  try {
    await query(
      `INSERT INTO audit_trail (admin_id, action, table_name, record_id, old_values, new_values, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        adminId,
        action,
        tableName,
        recordId,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        req?.ip || null,
      ]
    );
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
}

export async function createNotification(userId, title, message, type = 'info', referenceId = null, referenceType = null) {
  const result = await query(
    `INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, title, message, type, referenceId, referenceType]
  );
  return result.insertId;
}

export async function notifyAllStudents(title, message, type = 'info', referenceId = null, referenceType = null) {
  const students = await query(
    `SELECT u.id FROM users u WHERE u.role = 'student' AND u.is_active = TRUE`
  );
  for (const student of students) {
    await createNotification(student.id, title, message, type, referenceId, referenceType);
  }
  return students.length;
}
