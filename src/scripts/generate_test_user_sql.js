import fs from 'fs';
import bcrypt from 'bcryptjs';

// New test users (passwords chosen by the assistant)
const newUsers = [
  { email: 'test.admin@uoknorth.edu.in', role: 'admin', fullName: 'Test Admin', phone: '+91-9000000001', password: 'Admin@1234' },
  { email: 'test.driver@uoknorth.edu.in', role: 'driver', fullName: 'Test Driver', phone: '+91-9000000002', password: 'Driver@1234' },
  { email: 'test.student@uoknorth.edu.in', role: 'student', fullName: 'Test Student', phone: '+91-9000000003', password: 'Student@1234' },
];

const seededEmails = [
  'admin@uoknorth.edu.in',
  'driver1@uoknorth.edu.in',
  'driver2@uoknorth.edu.in',
  'driver3@uoknorth.edu.in',
  'student1@uoknorth.edu.in',
  'student2@uoknorth.edu.in',
  'student3@uoknorth.edu.in',
];

async function gen() {
  const lines = [];
  lines.push('-- Generated SQL: remove seeded users and add test users');
  lines.push('USE ctms_db;');

  // Remove existing drivers/students for seeded emails
  lines.push('\n-- Delete existing driver/student records for seeded users');
  for (const e of seededEmails) {
    lines.push(`DELETE d FROM drivers d JOIN users u ON d.user_id = u.id WHERE u.email = '${e}';`);
    lines.push(`DELETE s FROM students s JOIN users u ON s.user_id = u.id WHERE u.email = '${e}';`);
  }

  lines.push('\n-- Delete seeded users');
  const seedsList = seededEmails.map((e) => `'${e}'`).join(', ');
  lines.push(`DELETE FROM users WHERE email IN (${seedsList});`);

  lines.push('\n-- Insert new test users');
  for (const u of newUsers) {
    const saltRounds = 12;
    const hash = bcrypt.hashSync(u.password, saltRounds);
    const safeFullName = u.fullName.replace(/'/g, "''");
    lines.push(
      `INSERT INTO users (email, password_hash, role, full_name, phone, created_at, updated_at) VALUES ('${u.email}', '${hash}', '${u.role}', '${safeFullName}', '${u.phone}', NOW(), NOW());`
    );
  }

  lines.push('\n-- Create driver/student profiles referencing inserted users');
  // Driver
  lines.push("INSERT INTO drivers (user_id, license_number, experience_years, rating, total_trips) VALUES ((SELECT id FROM users WHERE email = 'test.driver@uoknorth.edu.in'), 'DL-GEN-001', 2, 4.5, 0););");
  // Student
  lines.push("INSERT INTO students (user_id, student_id, department, semester) VALUES ((SELECT id FROM users WHERE email = 'test.student@uoknorth.edu.in'), 'TST-GEN-001', 'Testing', 1);");

  const out = lines.join('\n');
  const outPath = 'src/scripts/generated_test_users.sql';
  fs.writeFileSync(outPath, out, 'utf8');
  console.log('Generated SQL written to', outPath);
  console.log('\nNew test credentials:');
  for (const u of newUsers) {
    console.log(`${u.role.toUpperCase()}: ${u.email}  |  ${u.password}`);
  }
}

gen();
