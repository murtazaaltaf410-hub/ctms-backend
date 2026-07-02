-- Generated SQL: remove seeded users and add test users
USE ctms_db;

-- Delete existing driver/student records for seeded users
DELETE d FROM drivers d JOIN users u ON d.user_id = u.id WHERE u.email = 'admin@uoknorth.edu.in';
DELETE s FROM students s JOIN users u ON s.user_id = u.id WHERE u.email = 'admin@uoknorth.edu.in';
DELETE d FROM drivers d JOIN users u ON d.user_id = u.id WHERE u.email = 'driver1@uoknorth.edu.in';
DELETE s FROM students s JOIN users u ON s.user_id = u.id WHERE u.email = 'driver1@uoknorth.edu.in';
DELETE d FROM drivers d JOIN users u ON d.user_id = u.id WHERE u.email = 'driver2@uoknorth.edu.in';
DELETE s FROM students s JOIN users u ON s.user_id = u.id WHERE u.email = 'driver2@uoknorth.edu.in';
DELETE d FROM drivers d JOIN users u ON d.user_id = u.id WHERE u.email = 'driver3@uoknorth.edu.in';
DELETE s FROM students s JOIN users u ON s.user_id = u.id WHERE u.email = 'driver3@uoknorth.edu.in';
DELETE d FROM drivers d JOIN users u ON d.user_id = u.id WHERE u.email = 'student1@uoknorth.edu.in';
DELETE s FROM students s JOIN users u ON s.user_id = u.id WHERE u.email = 'student1@uoknorth.edu.in';
DELETE d FROM drivers d JOIN users u ON d.user_id = u.id WHERE u.email = 'student2@uoknorth.edu.in';
DELETE s FROM students s JOIN users u ON s.user_id = u.id WHERE u.email = 'student2@uoknorth.edu.in';
DELETE d FROM drivers d JOIN users u ON d.user_id = u.id WHERE u.email = 'student3@uoknorth.edu.in';
DELETE s FROM students s JOIN users u ON s.user_id = u.id WHERE u.email = 'student3@uoknorth.edu.in';

-- Delete seeded users
DELETE FROM users WHERE email IN ('admin@uoknorth.edu.in', 'driver1@uoknorth.edu.in', 'driver2@uoknorth.edu.in', 'driver3@uoknorth.edu.in', 'student1@uoknorth.edu.in', 'student2@uoknorth.edu.in', 'student3@uoknorth.edu.in');

-- Insert new test users
INSERT INTO users (email, password_hash, role, full_name, phone, created_at, updated_at) VALUES ('test.admin@uoknorth.edu.in', '$2a$12$WAMxL5pUOXfiP3YgFcKyI.zx8nermkW4kgrmp4Ik.zJinDcRKDMlK', 'admin', 'Test Admin', '+91-9000000001', NOW(), NOW());
INSERT INTO users (email, password_hash, role, full_name, phone, created_at, updated_at) VALUES ('test.driver@uoknorth.edu.in', '$2a$12$15XArh3Z2Ti3Rgl8TXIpK.m6G1olDZNEWEouTQZo173eRPGfCXbiO', 'driver', 'Test Driver', '+91-9000000002', NOW(), NOW());
INSERT INTO users (email, password_hash, role, full_name, phone, created_at, updated_at) VALUES ('test.student@uoknorth.edu.in', '$2a$12$WKAn6oizjqQ.lmL5PEjNNeI2gUasdHQ/RJ0jnjRRdyNiVFW4iq8GG', 'student', 'Test Student', '+91-9000000003', NOW(), NOW());

-- Create driver/student profiles referencing inserted users
INSERT INTO drivers (user_id, license_number, experience_years, rating, total_trips) VALUES ((SELECT id FROM users WHERE email = 'test.driver@uoknorth.edu.in'), 'DL-GEN-001', 2, 4.5, 0););
INSERT INTO students (user_id, student_id, department, semester) VALUES ((SELECT id FROM users WHERE email = 'test.student@uoknorth.edu.in'), 'TST-GEN-001', 'Testing', 1);