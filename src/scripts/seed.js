import dotenv from 'dotenv';
import pool, { query } from '../config/database.js';
import { hashPassword } from '../utils/password.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(__dirname, '../../../database/schema.sql');

async function seed() {
  console.log('Starting CTMS database seed...');

  const schema = fs.readFileSync(schemaPath, 'utf8');
  const statements = schema.split(';').filter((s) => s.trim());
  for (const stmt of statements) {
    if (stmt.trim()) {
      try {
        await pool.query(stmt);
      } catch (e) {
        if (!e.message.includes('already exists')) {
          console.warn('Schema warning:', e.message.slice(0, 80));
        }
      }
    }
  }

  const password = await hashPassword('Password@123');

  const users = [
    { email: 'admin@uoknorth.edu.in', role: 'admin', fullName: 'Dr. Admin Khan', phone: '+91-9900000001' },
    { email: 'driver1@uoknorth.edu.in', role: 'driver', fullName: 'Mohammad Ashraf', phone: '+91-9900000002' },
    { email: 'driver2@uoknorth.edu.in', role: 'driver', fullName: 'Abdul Rashid', phone: '+91-9900000003' },
    { email: 'driver3@uoknorth.edu.in', role: 'driver', fullName: 'Ghulam Hassan', phone: '+91-9900000004' },
    { email: 'student1@uoknorth.edu.in', role: 'student', fullName: 'Aisha Mir', phone: '+91-9900000010' },
    { email: 'student2@uoknorth.edu.in', role: 'student', fullName: 'Omar Bhat', phone: '+91-9900000011' },
    { email: 'student3@uoknorth.edu.in', role: 'student', fullName: 'Fatima Wani', phone: '+91-9900000012' },
  ];

  for (const u of users) {
    const existing = await query('SELECT id FROM users WHERE email = ?', [u.email]);
    if (existing.length) continue;
    const result = await query(
      'INSERT INTO users (email, password_hash, role, full_name, phone) VALUES (?, ?, ?, ?, ?)',
      [u.email, password, u.role, u.fullName, u.phone]
    );
    const userId = result.insertId;

    if (u.role === 'driver') {
      const licenses = ['JK-DL-2018-001', 'JK-DL-2019-002', 'JK-DL-2020-003'];
      const idx = users.filter((x) => x.role === 'driver').indexOf(u);
      await query(
        'INSERT INTO drivers (user_id, license_number, experience_years, rating, total_trips) VALUES (?, ?, ?, ?, ?)',
        [userId, licenses[idx], 5 + idx, 4.7 + idx * 0.1, 800 + idx * 200]
      );
    }
    if (u.role === 'student') {
      const ids = ['NCS-2021-001', 'NCS-2022-002', 'NCS-2023-003'];
      const depts = ['Computer Science', 'Information Technology', 'Electronics'];
      const idx = users.filter((x) => x.role === 'student').indexOf(u);
      await query(
        'INSERT INTO students (user_id, student_id, department, semester) VALUES (?, ?, ?, ?)',
        [userId, ids[idx], depts[idx], 6 - idx * 2]
      );
    }
  }

  const routeCount = await query('SELECT COUNT(*) as c FROM routes');
  if (routeCount[0].c === 0) {
    const routes = [
      { name: 'Route A - Baramulla to North Campus', dist: 18.5, time: 45, start: 'Baramulla Bus Stand', end: 'North Campus Gate' },
      { name: 'Route B - Sopore to North Campus', dist: 12.3, time: 30, start: 'Sopore Main Chowk', end: 'North Campus Gate' },
      { name: 'Route C - Handwara to North Campus', dist: 25.0, time: 60, start: 'Handwara Bus Stand', end: 'North Campus Gate' },
      { name: 'Route D - Campus Shuttle', dist: 3.2, time: 15, start: 'Admin Block', end: 'Library Block' },
    ];
    for (const r of routes) {
      await query(
        'INSERT INTO routes (name, distance_km, estimated_time_min, start_point, end_point) VALUES (?, ?, ?, ?, ?)',
        [r.name, r.dist, r.time, r.start, r.end]
      );
    }

    const stopsData = [
      [1, 'Baramulla Bus Stand', 34.1989, 74.3636, 0],
      [1, 'Main Market Baramulla', 34.2012, 74.358, 8],
      [1, 'Pattan Crossing', 34.215, 74.34, 18],
      [1, 'Sopore Bypass', 34.228, 74.32, 28],
      [1, 'North Campus Main Gate', 34.235, 74.31, 45],
      [2, 'Sopore Main Chowk', 34.286, 74.472, 0],
      [2, 'Dangerpora', 34.27, 74.42, 10],
      [2, 'Watergam', 34.255, 74.38, 20],
      [2, 'North Campus Gate', 34.235, 74.31, 30],
      [4, 'Admin Block', 34.2355, 74.3095, 0],
      [4, 'Science Block', 34.236, 74.31, 5],
      [4, 'Engineering Block', 34.2365, 74.3105, 10],
      [4, 'Library Block', 34.237, 74.311, 15],
    ];
    for (let i = 0; i < stopsData.length; i++) {
      const [routeId, name, lat, lng, offset] = stopsData[i];
      await query(
        'INSERT INTO stops (route_id, name, latitude, longitude, stop_order, estimated_arrival_offset_min) VALUES (?, ?, ?, ?, ?, ?)',
        [routeId, name, lat, lng, i + 1, offset]
      );
    }
  }

  const busCount = await query('SELECT COUNT(*) as c FROM buses');
  if (busCount[0].c === 0) {
    const buses = [
      { num: 'UOK-NC-01', cap: 45, route: 1, driver: 1 },
      { num: 'UOK-NC-02', cap: 40, route: 2, driver: 2 },
      { num: 'UOK-NC-03', cap: 35, route: 3, driver: 3 },
      { num: 'UOK-NC-04', cap: 30, route: 4, driver: 1 },
    ];
    for (const b of buses) {
      await query(
        'INSERT INTO buses (bus_number, capacity, route_id, driver_id, qr_code, status) VALUES (?, ?, ?, ?, ?, ?)',
        [b.num, b.cap, b.route, b.driver, `${b.num}-QR`, 'active']
      );
    }
  }

  const annCount = await query('SELECT COUNT(*) as c FROM announcements');
  if (annCount[0].c === 0) {
    const admin = await query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
    if (admin.length) {
      await query(
        'INSERT INTO announcements (title, message, type, priority, created_by) VALUES (?, ?, ?, ?, ?)',
        ['Welcome to CTMS', 'Campus Transport Management System is now live for University of Kashmir North Campus.', 'general', 'medium', admin[0].id]
      );
      await query(
        'INSERT INTO announcements (title, message, type, priority, created_by) VALUES (?, ?, ?, ?, ?)',
        ['Morning Schedule', 'Buses operate from 7:00 AM to 6:00 PM on weekdays.', 'general', 'low', admin[0].id]
      );
    }
  }

  console.log('Seed completed!');
  console.log('Demo credentials (all roles): Password@123');
  console.log('  Admin:   admin@uoknorth.edu.in');
  console.log('  Driver:  driver1@uoknorth.edu.in');
  console.log('  Student: student1@uoknorth.edu.in');
  process.exit(0);
}

seed().catch((e) => {
  console.error('Seed failed:', e.message);
  process.exit(1);
});
