-- ============================================================
-- GensanWorks Realistic Mock Data Seed (General Santos City)
-- 119 Jobseekers, 20 Employers, 50 Jobs
-- All NSRP fields filled with realistic/randomized data.
-- ============================================================

BEGIN;

-- ---------------------------------------------------------
-- 0. SCHEMA FIX: Ensure users and admins tables exist
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id          UUID PRIMARY KEY,
  name        TEXT,
  email       TEXT UNIQUE,
  role        TEXT,
  city        TEXT,
  province    TEXT,
  employment_status TEXT,
  registration_date TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admins (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------
-- 1. INSERT EMPLOYERS (20 Real Gensan Employers)
-- ---------------------------------------------------------
INSERT INTO employers (id, email, password_hash, establishment_name, city, province, barangay, address, industry, total_paid_employees, account_status)
VALUES
(gen_random_uuid(), 'hr@smgensan.com', '$2b$10$dummyhash', 'SM City General Santos', 'General Santos City', 'South Cotabato', 'Lagao', 'San Isidro Street', 'Retail/Malls', 500, 'approved'),
(gen_random_uuid(), 'careers@kccmalls.com', '$2b$10$dummyhash', 'KCC Mall of Gensan', 'General Santos City', 'South Cotabato', 'Dadiangas North', 'J. Catolico Ave', 'Retail/Malls', 800, 'approved'),
(gen_random_uuid(), 'recruitment@gaisano.com', '$2b$10$dummyhash', 'Gaisano Mall of Gensan', 'General Santos City', 'South Cotabato', 'Dadiangas North', 'J. Catolico Ave', 'Retail/Malls', 400, 'approved'),
(gen_random_uuid(), 'jobs@robinsons.com', '$2b$10$dummyhash', 'Robinsons Place Gensan', 'General Santos City', 'South Cotabato', 'Lagao', 'J. Catolico Ave', 'Retail/Malls', 300, 'approved'),
(gen_random_uuid(), 'hr@allianceselect.com', '$2b$10$dummyhash', 'Alliance Select Foods International', 'General Santos City', 'South Cotabato', 'Tambler', 'Tuna Canning Road', 'Manufacturing/Tuna', 1200, 'approved'),
(gen_random_uuid(), 'hr@celebes.com', '$2b$10$dummyhash', 'Celebes Canning Corporation', 'General Santos City', 'South Cotabato', 'Tambler', 'Tuna Canning Road', 'Manufacturing/Tuna', 1000, 'approved'),
(gen_random_uuid(), 'hr@gentuna.com', '$2b$10$dummyhash', 'General Tuna Corporation', 'General Santos City', 'South Cotabato', 'Tambler', 'Tuna Canning Road', 'Manufacturing/Tuna', 2000, 'approved'),
(gen_random_uuid(), 'hr@philbest.com', '$2b$10$dummyhash', 'Philbest Canning Corporation', 'General Santos City', 'South Cotabato', 'Tambler', 'Tuna Canning Road', 'Manufacturing/Tuna', 1500, 'approved'),
(gen_random_uuid(), 'hr@oceancanning.com', '$2b$10$dummyhash', 'Ocean Canning Corporation', 'General Santos City', 'South Cotabato', 'Tambler', 'Tuna Canning Road', 'Manufacturing/Tuna', 800, 'approved'),
(gen_random_uuid(), 'admin@stelizabeth.ph', '$2b$10$dummyhash', 'St. Elizabeth Hospital', 'General Santos City', 'South Cotabato', 'Dadiangas West', 'Santiago Blvd', 'Healthcare', 400, 'approved'),
(gen_random_uuid(), 'hr@nddu.edu.ph', '$2b$10$dummyhash', 'Notre Dame of Dadiangas University', 'General Santos City', 'South Cotabato', 'Dadiangas West', 'Marist Ave', 'Education', 300, 'approved'),
(gen_random_uuid(), 'hr@msugensan.edu.ph', '$2b$10$dummyhash', 'Mindanao State University - Gensan', 'General Santos City', 'South Cotabato', 'Fatima', 'MSU Road', 'Education', 500, 'approved'),
(gen_random_uuid(), 'hr@gensancity.gov.ph', '$2b$10$dummyhash', 'LGU General Santos City', 'General Santos City', 'South Cotabato', 'Dadiangas South', 'City Hall Drive', 'Government', 2000, 'approved'),
(gen_random_uuid(), 'hr@rdrealty.com', '$2b$10$dummyhash', 'RD Realty Development Corp', 'General Santos City', 'South Cotabato', 'Calumpang', 'RD Building', 'Real Estate', 150, 'approved'),
(gen_random_uuid(), 'hr@alsons.com', '$2b$10$dummyhash', 'Alsons Aquaculture Corp', 'General Santos City', 'South Cotabato', 'Alabel', 'Alsons Road', 'Agriculture/Fisheries', 600, 'approved'),
(gen_random_uuid(), 'hr@smb.com.ph', '$2b$10$dummyhash', 'San Miguel Brewery - Gensan', 'General Santos City', 'South Cotabato', 'Dadiangas North', 'Makar Junction', 'Manufacturing/Beverage', 300, 'approved'),
(gen_random_uuid(), 'hr@coca-cola.com.ph', '$2b$10$dummyhash', 'Coca-Cola Beverages Philippines - Gensan', 'General Santos City', 'South Cotabato', 'Bula', 'Bula Road', 'Manufacturing/Beverage', 250, 'approved'),
(gen_random_uuid(), 'careers@shell.ph', '$2b$10$dummyhash', 'Shell North Wharf', 'General Santos City', 'South Cotabato', 'Labangal', 'Makar Wharf', 'Logistics/Energy', 100, 'approved'),
(gen_random_uuid(), 'hr@phoenix.ph', '$2b$10$dummyhash', 'Phoenix Petroleum Philippines', 'General Santos City', 'South Cotabato', 'Labangal', 'Makar Wharf', 'Logistics/Energy', 80, 'approved'),
(gen_random_uuid(), 'hr@petron.ph', '$2b$10$dummyhash', 'Petron Gensan Depot', 'General Santos City', 'South Cotabato', 'Labangal', 'Makar Wharf', 'Logistics/Energy', 90, 'approved');

-- ---------------------------------------------------------
-- 2. INSERT JOBS (50 Realistic Gensan Jobs)
-- ---------------------------------------------------------
INSERT INTO jobs (id, employer_id, position_title, minimum_education_required, years_of_experience_required, starting_salary, job_status, vacancies, work_setup, psoc_code)
SELECT 
  gen_random_uuid(), 
  id, 
  (ARRAY['Cashier', 'Sales Associate', 'Stock Clerk', 'Fish Processing Worker', 'QA Inspector', 'Production Supervisor', 'Registered Nurse', 'Admin Assistant', 'Security Guard', 'Delivery Driver', 'Heavy Equipment Operator', 'Customer Service Representative', 'Accounting Clerk', 'IT Support Technician', 'Civil Engineer', 'Marketing Officer', 'Forklift Operator', 'Lab Technician', 'Maintenance Worker', 'Janitorial Staff'])[floor(random() * 20 + 1)],
  (ARRAY['High School Graduate', 'College Graduate', 'Vocational Course', 'No Minimum Requirement'])[floor(random() * 4 + 1)],
  floor(random() * 5),
  (ARRAY['PHP 12,000 - 15,000', 'PHP 18,000 - 25,000', 'PHP 30,000 - 45,000', 'PHP 10,000 - 12,000', 'Negotiable'])[floor(random() * 5 + 1)],
  'open',
  floor(random() * 10 + 1),
  (ARRAY['onsite', 'remote', 'hybrid'])[floor(random() * 3 + 1)],
  'PSOC-' || floor(random() * 9000 + 1000)
FROM (SELECT id FROM employers CROSS JOIN generate_series(1, 3)) AS sub
LIMIT 50;

-- ---------------------------------------------------------
-- 3. INSERT JOBSEEKERS (119 Realistic Gensan Jobseekers)
-- ---------------------------------------------------------
INSERT INTO jobseekers (
  id, email, password_hash, first_name, last_name, middle_name, 
  birth_date, gender, barangay, city, province, 
  employment_status, is_pwd, is_ofw, job_seeking_status, 
  nsrp_id, profile_complete, profile_completeness
)
SELECT 
  gen_random_uuid(),
  'jobseeker' || i || '@example.com',
  '$2b$10$dummyhash',
  (ARRAY['Juan', 'Maria', 'Jose', 'Elena', 'Ricardo', 'Liza', 'Antonio', 'Teresita', 'Roberto', 'Imelda', 'Gabriel', 'Fatima', 'Paolo', 'Angela', 'Dante', 'Cynthia', 'Ferdinand', 'Lourdes', 'Gregorio', 'Pilar'])[floor(random() * 20 + 1)],
  (ARRAY['Dela Cruz', 'Santos', 'Reyes', 'Gonzales', 'Bautista', 'Garcia', 'Lopez', 'Rodriguez', 'Martinez', 'Perez', 'Aquino', 'Magsaysay', 'Ramos', 'Estrada', 'Arroyo', 'Duterte', 'Marcos', 'Robredo', 'Pascua', 'Dumlao'])[floor(random() * 20 + 1)],
  (ARRAY['A.', 'B.', 'C.', 'D.', 'E.', 'F.', 'G.', 'H.', 'I.', 'J.'])[floor(random() * 10 + 1)],
  (CURRENT_DATE - (INTERVAL '18 years' + (random() * 25 * INTERVAL '1 year')))::DATE,
  (ARRAY['Male', 'Female'])[floor(random() * 2 + 1)],
  (ARRAY['Apopong', 'Baluan', 'Batomelong', 'Buayan', 'Bula', 'Calumpang', 'City Heights', 'Conel', 'Dadiangas East', 'Dadiangas North', 'Dadiangas South', 'Dadiangas West', 'Fatima', 'Katangawan', 'Labangal', 'Lagao', 'Mabuhay', 'San Isidro', 'San Jose', 'Siguel', 'Sinawal', 'Tambler', 'Tinagacan', 'Upper Labay'])[floor(random() * 24 + 1)],
  'General Santos City',
  'South Cotabato',
  (ARRAY['unemployed', 'employed', 'self-employed'])[floor(random() * 3 + 1)],
  (random() < 0.05),
  (random() < 0.1),
  (ARRAY['actively_looking', 'open', 'not_looking'])[floor(random() * 3 + 1)],
  'NSRP-' || (20250000 + i),
  true,
  floor(80 + random() * 20)
FROM generate_series(1, 119) AS i;

-- ---------------------------------------------------------
-- 4. INSERT INTO USERS (Mirroring Jobseekers & Employers for Auth)
-- ---------------------------------------------------------
-- Add Jobseekers to Users
INSERT INTO users (id, name, email, role, city, province, employment_status, registration_date, created_at)
SELECT id, first_name || ' ' || last_name, email, 'jobseeker', city, province, employment_status, barangay, created_at
FROM jobseekers;

-- Add Employers to Users
INSERT INTO users (id, name, email, role, city, province, created_at)
SELECT id, establishment_name, email, 'employer', city, province, created_at
FROM employers;

COMMIT;
