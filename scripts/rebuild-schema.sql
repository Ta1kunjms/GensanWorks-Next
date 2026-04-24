DROP TABLE IF EXISTS referrals CASCADE;
DROP TABLE IF EXISTS applications CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS jobseeker_experience CASCADE;
DROP TABLE IF EXISTS jobseeker_licenses CASCADE;
DROP TABLE IF EXISTS jobseeker_trainings CASCADE;
DROP TABLE IF EXISTS jobseeker_education CASCADE;
DROP TABLE IF EXISTS jobseeker_languages CASCADE;
DROP TABLE IF EXISTS jobseekers CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS employers CASCADE;

CREATE TABLE jobseekers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  middle_name TEXT,
  suffix TEXT,
  birth_date DATE,
  gender TEXT,
  religion TEXT,
  civil_status TEXT, 
  tin TEXT,
  height TEXT,
  is_pwd BOOLEAN DEFAULT false,
  pwd_type TEXT, 
  pwd_type_others TEXT,
  phone TEXT,
  
  house_number TEXT,
  barangay TEXT,
  city TEXT,
  province TEXT,
  zip_code TEXT,
  
  employment_status TEXT, 
  employment_type TEXT, 
  self_employed_type TEXT, 
  self_employed_type_others TEXT,
  unemployed_reason TEXT, 
  unemployed_months INTEGER,
  terminated_country TEXT, 
  terminated_reason TEXT, 
  
  is_ofw BOOLEAN DEFAULT false,
  ofw_country TEXT,
  is_former_ofw BOOLEAN DEFAULT false,
  former_ofw_country TEXT,
  former_ofw_return_month_year TEXT,
  
  is_four_ps BOOLEAN DEFAULT false,
  household_id_no TEXT,
  
  preference_part_time BOOLEAN DEFAULT false,
  preference_full_time BOOLEAN DEFAULT false,
  preferred_occupation_1 TEXT,
  preferred_occupation_2 TEXT,
  preferred_occupation_3 TEXT,
  preferred_work_location_local TEXT, 
  preferred_work_location_overseas TEXT, 
  
  other_skills JSONB, 
  
  nsrp_id TEXT,
  profile_complete BOOLEAN DEFAULT false,
  profile_completeness INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE jobseeker_languages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jobseeker_id UUID REFERENCES jobseekers(id) ON DELETE CASCADE,
  language TEXT NOT NULL, 
  read BOOLEAN DEFAULT false,
  write BOOLEAN DEFAULT false,
  speak BOOLEAN DEFAULT false,
  understand BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE jobseeker_education (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jobseeker_id UUID REFERENCES jobseekers(id) ON DELETE CASCADE,
  currently_in_school BOOLEAN DEFAULT false,
  level TEXT, 
  course TEXT,
  year_graduated TEXT,
  level_reached TEXT, 
  year_last_attended TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE jobseeker_trainings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jobseeker_id UUID REFERENCES jobseekers(id) ON DELETE CASCADE,
  course TEXT,
  hours_of_training INTEGER,
  training_institution TEXT,
  skills_acquired TEXT,
  certificates_received TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE jobseeker_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jobseeker_id UUID REFERENCES jobseekers(id) ON DELETE CASCADE,
  eligibility TEXT, 
  date_taken DATE,
  professional_license TEXT, 
  valid_until DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE jobseeker_experience (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jobseeker_id UUID REFERENCES jobseekers(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  address TEXT,
  position TEXT NOT NULL,
  number_of_months INTEGER,
  status TEXT, 
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE employers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  establishment_name TEXT NOT NULL,
  
  province TEXT,
  city TEXT,
  barangay TEXT,
  address TEXT, 
  
  total_paid_employees INTEGER,
  total_vacant_positions INTEGER,
  industry TEXT,
  industry_code TEXT, 
  
  contact_person TEXT,
  contact_phone TEXT,
  designation TEXT,
  company_tax_id TEXT,
  
  srs_form_file TEXT,
  business_permit_file TEXT,
  bir_2303_file TEXT,
  company_profile_file TEXT,
  dole_certification_file TEXT, 
  
  account_status TEXT DEFAULT 'pending', 
  verified_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID REFERENCES employers(id) ON DELETE CASCADE,
  position_title TEXT NOT NULL,
  
  minimum_education_required TEXT,
  main_skill_desired TEXT,
  years_of_experience_required INTEGER,
  age_preference_min INTEGER,
  age_preference_max INTEGER,
  starting_salary TEXT,
  job_status TEXT, 
  
  vacancies INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  archived BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  jobseeker_id UUID REFERENCES jobseekers(id) ON DELETE CASCADE,
  employer_id UUID REFERENCES employers(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  match_score NUMERIC,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  interview_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  jobseeker_id UUID REFERENCES jobseekers(id) ON DELETE CASCADE,
  employer_id UUID REFERENCES employers(id) ON DELETE CASCADE,
  application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'referred',
  date_referred TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
