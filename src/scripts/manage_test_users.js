import dotenv from 'dotenv';
import pool, { query } from '../config/database.js';
import { hashPassword } from '../utils/password.js';

dotenv.config();

async function run() {
  console.log('Starting user management script...');

  const deleteEmails = [
    'admin@uoknorth.edu.in',
    'driver1@uoknorth.edu.in',
    'driver2@uoknorth.edu.in',
    'driver3@uoknorth.edu.in',
    'student1@uoknorth.edu.in',
    'student2@uoknorth.edu.in',
    'student3@uoknorth.edu.in',
  ];

  // Delete existing seeded users
  const placeholders = deleteEmails.map(() => '?').join(',');
  try {
    await query(`DELETE FROM users WHERE email IN (${placeholders})`, deleteEmails);
    console.log('Deleted seeded users (if present).');
  } catch (e) {
    console.error('Error deleting seeded users:', e.message);
  }

  // New test users to create
  const newUsers = [
    { email: 'test.admin@uoknorth.edu.in', role: 'admin', fullName: 'Test Admin', phone: '+91-9000000001', password: 'Admin@1234' },
    { email: 'test.driver@uoknorth.edu.in', role: 'driver', fullName: 'Test Driver', phone: '+91-9000000002', password: 'Driver@1234' },
    { email: 'test.student@uoknorth.edu.in', role: 'student', fullName: 'Test Student', phone: '+91-9000000003', password: 'Student@1234' },
  ];

  for (const u of newUsers) {
    try {
      const existing = await query('SELECT id FROM users WHERE email = ?', [u.email]);
      if (existing.length) {
        console.log(`User already exists: ${u.email}`);
        continue;
      }
      const pwHash = await hashPassword(u.password);
      const res = await query(
        'INSERT INTO users (email, password_hash, role, full_name, phone) VALUES (?, ?, ?, ?, ?)',
        [u.email, pwHash, u.role, u.fullName, u.phone]
      );
      const userId = res.insertId;
      if (u.role === 'driver') {
        await query('INSERT INTO drivers (user_id, license_number, experience_years, rating, total_trips) VALUES (?, ?, ?, ?, ?)', [userId, `DL-${Date.now() % 100000}`, 3, 4.5, 0]);
      }
      if (u.role === 'student') {
        await query('INSERT INTO students (user_id, student_id, department, semester) VALUES (?, ?, ?, ?)', [userId, `TST-${Date.now() % 100000}`, 'Testing', 1]);
      }
      console.log(`Created ${u.role}: ${u.email}`);
    } catch (e) {
      console.error('Error creating user', u.email, e.message);
    }
  }

  console.log('\nNew test credentials:');
  for (const u of newUsers) {
    console.log(`${u.role.toUpperCase()}: ${u.email}  |  ${u.password}`);
  }

  // Close pool
  try { await pool.end(); } catch {}
  process.exit(0);
}

run().catch((e) => {
  console.error('Script failed:', e.message);
  process.exit(1);
});
