const fs = require('fs');
const crypto = require('crypto');

function uuid() {
  return crypto.randomUUID();
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function escapeSql(str) {
  if (str === null || str === undefined) return 'NULL';
  return "'" + str.replace(/'/g, "''") + "'";
}

const firstNames = ['Juan', 'Maria', 'Pedro', 'Jose', 'Ana', 'Luis', 'Carmen', 'Francisco', 'Teresa', 'Antonio', 'Rosa', 'Miguel', 'Lourdes', 'Carlos', 'Elena', 'Manuel', 'Marta', 'Javier', 'Lucia', 'David', 'Laura', 'Daniel', 'Cristina', 'Alejandro', 'Raquel', 'Rafael', 'Isabel', 'Pablo', 'Paula', 'Jorge', 'Sofia', 'Alvaro', 'Julia', 'Adrian', 'Sara', 'Diego', 'Alba', 'Mario', 'Nerea', 'Sergio'];
const lastNames = ['Garcia', 'Fernandez', 'Gonzalez', 'Rodriguez', 'Lopez', 'Martinez', 'Sanchez', 'Perez', 'Gomez', 'Martin', 'Jimenez', 'Ruiz', 'Hernandez', 'Diaz', 'Moreno', 'Alvarez', 'Munoz', 'Romero', 'Alonso', 'Gutierrez', 'Navarro', 'Torres', 'Dominguez', 'Vazquez', 'Ramos', 'Gil', 'Ramirez', 'Serrano', 'Blanco', 'Suarez'];
const barangays = ['Apopong', 'Baluan', 'Batomelong', 'Buayan', 'Bula', 'Calumpang', 'City Heights', 'Conel', 'Dadiangas East', 'Dadiangas North', 'Dadiangas South', 'Dadiangas West', 'Fatima', 'Katangawan', 'Labangal', 'Lagao', 'Ligaya', 'Mabuhay', 'Olympog', 'San Isidro', 'San Jose', 'Siguel', 'Sinawal', 'Tambler', 'Tinagacan', 'Upper Labay'];
const industries = ['Agriculture', 'Manufacturing', 'Retail', 'IT/BPO', 'Healthcare', 'Education', 'Construction', 'Logistics', 'Finance', 'Hospitality', 'Real Estate', 'Fishing'];
const jobTitles = ['Software Engineer', 'Accountant', 'Nurse', 'Teacher', 'Sales Representative', 'Customer Service Representative', 'Security Guard', 'Cashier', 'Driver', 'Warehouse Worker', 'Manager', 'Chef', 'Waitress', 'Mechanic', 'Electrician', 'Plumber', 'Carpenter', 'Data Analyst', 'Marketing Specialist', 'HR Officer', 'Administrative Assistant', 'Receptionist', 'Janitor', 'Tuna Grader', 'Quality Control Inspector', 'Fishery Worker', 'Deckhand', 'Captain'];
const employerSuffix = ['Corp', 'Inc.', 'Enterprise', 'Company', 'LLC', 'Group'];
const workSetups = ['onsite', 'remote', 'hybrid', 'any'];
const employmentTypes = ['P', 'T', 'C'];
const jobseekingStatuses = ['actively_looking', 'open', 'not_looking'];

let sql = `-- Seed generated for GensanWorks
-- Create tables (based on user request)

create table if not exists public.employers (
  id uuid not null default gen_random_uuid (),
  email text not null,
  password_hash text null,
  establishment_name text null,
  province text null,
  city text null,
  barangay text null,
  address text null,
  total_paid_employees integer null,
  total_vacant_positions integer null,
  industry text null,
  industry_code text[] null,
  contact_person text null,
  contact_phone text null,
  designation text null,
  company_tax_id text null,
  srs_form_file text null,
  business_permit_file text null,
  bir_2303_file text null,
  company_profile_file text null,
  dole_certification_file text null,
  account_status text null default 'pending'::text,
  verified_at timestamp with time zone null,
  is_active boolean null default true,
  last_login timestamp with time zone null,
  created_at timestamp with time zone null default timezone ('utc'::text, now()),
  updated_at timestamp with time zone null default timezone ('utc'::text, now()),
  srs_status text not null default 'pending'::text,
  srs_rejection_reason text null,
  srs_submitted_at timestamp with time zone null,
  srs_approved_at timestamp with time zone null,
  srs_version integer not null default 1,
  profile_image text null,
  geographic_code text null,
  barangay_chairperson text null,
  barangay_secretary text null,
  srs_subscriber_intent boolean null default true,
  srs_prepared_by text null,
  srs_prepared_designation text null,
  srs_prepared_date date null,
  srs_prepared_contact text null,
  description text null,
  website text null,
  zip_code text null,
  acronym_abbreviation text null,
  type_of_establishment text null,
  is_archived boolean null default false,
  constraint employers_pkey primary key (id),
  constraint employers_email_key unique (email),
  constraint employers_srs_status_check check (
    (
      srs_status = any (
        array[
          'pending'::text,
          'approved'::text,
          'rejected'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;


create table if not exists public.jobs (
  id uuid not null default gen_random_uuid (),
  employer_id uuid null,
  position_title text not null,
  minimum_education_required text null,
  main_skill_desired text null,
  years_of_experience_required integer null,
  age_preference_min integer null,
  age_preference_max integer null,
  starting_salary text null,
  job_status text null,
  vacancies integer null default 1,
  is_active boolean null default true,
  archived boolean null default false,
  created_at timestamp with time zone null default timezone ('utc'::text, now()),
  updated_at timestamp with time zone null default timezone ('utc'::text, now()),
  category text null,
  work_setup text null default 'onsite'::text,
  psoc_code text null,
  featured boolean not null default false,
  slots_remaining integer null,
  employment_contract_type text null,
  industry_code text null,
  rejection_reason text null,
  description text null,
  location text null,
  salary_min numeric null,
  salary_max numeric null,
  salary_period text null default 'monthly'::text,
  published_at timestamp with time zone null,
  work_type text null,
  constraint jobs_pkey primary key (id),
  constraint jobs_employer_id_fkey foreign KEY (employer_id) references employers (id) on delete CASCADE,
  constraint jobs_employment_contract_type_check check (
    (
      employment_contract_type = any (array['P'::text, 'T'::text, 'C'::text])
    )
  ),
  constraint jobs_work_setup_check check (
    (
      work_setup = any (
        array['onsite'::text, 'remote'::text, 'hybrid'::text]
      )
    )
  )
) TABLESPACE pg_default;


create table if not exists public.jobseekers (
  id uuid not null default gen_random_uuid (),
  email text not null,
  password_hash text null,
  first_name text null,
  last_name text null,
  middle_name text null,
  suffix text null,
  birth_date date null,
  gender text null,
  religion text null,
  civil_status text null,
  tin text null,
  height text null,
  is_pwd boolean null default false,
  pwd_type text null,
  pwd_type_others text null,
  phone text null,
  house_number text null,
  barangay text null,
  city text null,
  province text null,
  zip_code text null,
  employment_status text null,
  employment_type text null,
  self_employed_type text null,
  self_employed_type_others text null,
  unemployed_reason text null,
  unemployed_months integer null,
  terminated_country text null,
  terminated_reason text null,
  is_ofw boolean null default false,
  ofw_country text null,
  is_former_ofw boolean null default false,
  former_ofw_country text null,
  former_ofw_return_month_year text null,
  is_four_ps boolean null default false,
  household_id_no text null,
  preference_part_time boolean null default false,
  preference_full_time boolean null default false,
  preferred_occupation_1 text null,
  preferred_occupation_2 text null,
  preferred_occupation_3 text null,
  preferred_work_location_local text null,
  preferred_work_location_overseas text null,
  other_skills jsonb null,
  nsrp_id text null,
  profile_complete boolean null default false,
  profile_completeness integer null default 0,
  is_active boolean null default true,
  last_login timestamp with time zone null,
  created_at timestamp with time zone null default timezone ('utc'::text, now()),
  updated_at timestamp with time zone null default timezone ('utc'::text, now()),
  job_seeking_status text not null default 'not_looking'::text,
  profile_image text null,
  other_skills_others text null,
  disability_visual boolean null default false,
  disability_speech boolean null default false,
  disability_mental boolean null default false,
  disability_hearing boolean null default false,
  disability_physical boolean null default false,
  disability_others text null,
  preferred_work_location_local_1 text null,
  preferred_work_location_local_2 text null,
  preferred_work_location_local_3 text null,
  preferred_work_location_overseas_1 text null,
  preferred_work_location_overseas_2 text null,
  preferred_work_location_overseas_3 text null,
  unemployed_due_to_calamity boolean null default false,
  work_setup_preference text null default 'any'::text,
  expected_salary_min numeric null,
  expected_salary_max numeric null,
  constraint jobseekers_pkey primary key (id),
  constraint jobseekers_email_key unique (email),
  constraint jobseekers_job_seeking_status_check check (
    (
      job_seeking_status = any (
        array[
          'actively_looking'::text,
          'open'::text,
          'not_looking'::text
        ]
      )
    )
  ),
  constraint jobseekers_work_setup_preference_check check (
    (
      work_setup_preference = any (
        array[
          'onsite'::text,
          'remote'::text,
          'hybrid'::text,
          'any'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

-- Triggers and Functions
create or replace function supabase_functions.http_request() returns trigger as $$
begin
  return new;
end;
$$ language plpgsql;

drop trigger if exists "rescore-on-status-change" on jobseekers;
create trigger "rescore-on-status-change"
after
update on jobseekers for EACH row
execute FUNCTION supabase_functions.http_request (
  'https://tsvioxrlmcsqdricdgkd.supabase.co/functions/v1/rescore-on-status-change',
  'POST',
  '{"Content-type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzdmlveHJsbWNzcWRyaWNkZ2tkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDU0MzU5MiwiZXhwIjoyMDkwMTE5NTkyfQ.xELdcrmfJ30d6YNa64SFEKjyX6U-k6FkZ4K5W8zzG0A"}',
  '{}',
  '5000'
);

create table if not exists public.jobseeker_trainings (
  id uuid not null default gen_random_uuid (),
  jobseeker_id uuid null,
  course text null,
  hours_of_training integer null,
  training_institution text null,
  skills_acquired text null,
  certificates_received text null,
  created_at timestamp with time zone null default timezone ('utc'::text, now()),
  constraint jobseeker_trainings_pkey primary key (id),
  constraint jobseeker_trainings_jobseeker_id_fkey foreign KEY (jobseeker_id) references jobseekers (id) on delete CASCADE
) TABLESPACE pg_default;

create table if not exists public.jobseeker_licenses (
  id uuid not null default gen_random_uuid (),
  jobseeker_id uuid null,
  eligibility text null,
  date_taken date null,
  professional_license text null,
  valid_until date null,
  created_at timestamp with time zone null default timezone ('utc'::text, now()),
  constraint jobseeker_licenses_pkey primary key (id),
  constraint jobseeker_licenses_jobseeker_id_fkey foreign KEY (jobseeker_id) references jobseekers (id) on delete CASCADE
) TABLESPACE pg_default;

create table if not exists public.jobseeker_languages (
  id uuid not null default gen_random_uuid (),
  jobseeker_id uuid null,
  language text not null,
  read boolean null default false,
  write boolean null default false,
  speak boolean null default false,
  understand boolean null default false,
  created_at timestamp with time zone null default timezone ('utc'::text, now()),
  constraint jobseeker_languages_pkey primary key (id),
  constraint jobseeker_languages_jobseeker_id_fkey foreign KEY (jobseeker_id) references jobseekers (id) on delete CASCADE
) TABLESPACE pg_default;

create table if not exists public.jobseeker_experience (
  id uuid not null default gen_random_uuid (),
  jobseeker_id uuid null,
  company_name text not null,
  address text null,
  position text not null,
  number_of_months integer null,
  status text null,
  created_at timestamp with time zone null default timezone ('utc'::text, now()),
  constraint jobseeker_experience_pkey primary key (id),
  constraint jobseeker_experience_jobseeker_id_fkey foreign KEY (jobseeker_id) references jobseekers (id) on delete CASCADE
) TABLESPACE pg_default;

create table if not exists public.jobseeker_education (
  id uuid not null default gen_random_uuid (),
  jobseeker_id uuid null,
  currently_in_school boolean null default false,
  level text null,
  course text null,
  year_graduated text null,
  level_reached text null,
  year_last_attended text null,
  created_at timestamp with time zone null default timezone ('utc'::text, now()),
  school_name text null,
  constraint jobseeker_education_pkey primary key (id),
  constraint jobseeker_education_jobseeker_id_fkey foreign KEY (jobseeker_id) references jobseekers (id) on delete CASCADE
) TABLESPACE pg_default;

`;

const gensanEmployers = [
  'RD Corporation',
  'Citra Mina Seafood Corp.',
  'KCC Mall of Gensan',
  'SM City General Santos',
  'Gaisano Mall of Gensan',
  'Alliance Select Foods International',
  'General Santos City Water District',
  'SOCOTECO II',
  'Mindanao State University - Gensan',
  'Notre Dame of Dadiangas University',
  'St. Elizabeth Hospital',
  'General Santos Doctors Hospital',
  'Sarangani Highlands Garden',
  'Greenleaf Hotel Gensan',
  'Philbest Canning Corporation',
  'San Miguel Brewery - Mindanao',
  'Dole Philippines, Inc.',
  'SFI Fresh Canning Corporation',
  'RDEX Food International',
  'Veranza Mall',
  'Fitmart Gensan',
  'Robinsons Place General Santos',
  'Pioneer Hi-Bred Philippines',
  'Tuna Republic',
  'Nautilus Deep Sea Fishing',
  'Safi Port',
  'Gensan Shipyard',
  'Ten Point Manufacturing',
  'East Asia Royale Hotel',
  'RMMC (Ramon Magsaysay Memorial Colleges)',
  'Goldenstate College',
  'Holy Trinity College',
  'STI College General Santos'
];

let employers = [];
sql += '\n-- Inserting Employers\n';
for (let i=0; i<30; i++) {
  let id = uuid();
  employers.push(id);
  let email = 'employer' + i + '@example.com';
  let name = gensanEmployers[i % gensanEmployers.length];
  let prov = 'South Cotabato';
  let city = 'General Santos City';
  let brgy = randChoice(barangays);
  let addr = randInt(1, 1000) + ' Main St, ' + brgy;
  let ind = randChoice(industries);
  
  sql += `INSERT INTO public.employers (id, email, establishment_name, province, city, barangay, address, total_paid_employees, total_vacant_positions, industry, contact_person, contact_phone, account_status, is_active, srs_status, srs_version, description, is_archived) VALUES (${escapeSql(id)}, ${escapeSql(email)}, ${escapeSql(name)}, ${escapeSql(prov)}, ${escapeSql(city)}, ${escapeSql(brgy)}, ${escapeSql(addr)}, ${randInt(10, 500)}, ${randInt(1, 50)}, ${escapeSql(ind)}, ${escapeSql(randChoice(firstNames) + ' ' + randChoice(lastNames))}, ${escapeSql('09'+randInt(100000000, 999999999))}, 'approved', true, 'approved', 1, ${escapeSql('A leading company in ' + ind)}, false);\n`;
}

sql += '\n-- Inserting Jobs\n';
for(let i=0; i<99; i++) {
  let id = uuid();
  let emp_id = randChoice(employers);
  let title = randChoice(jobTitles);
  let ws = randChoice(workSetups);
  let contract = randChoice(employmentTypes);
  let minSal = randInt(10000, 30000);
  let maxSal = minSal + randInt(5000, 15000);
  
  sql += `INSERT INTO public.jobs (id, employer_id, position_title, minimum_education_required, main_skill_desired, years_of_experience_required, age_preference_min, age_preference_max, starting_salary, job_status, vacancies, is_active, archived, category, work_setup, featured, slots_remaining, employment_contract_type, description, location, salary_min, salary_max, salary_period, work_type) VALUES (${escapeSql(id)}, ${escapeSql(emp_id)}, ${escapeSql(title)}, ${escapeSql('College Graduate')}, ${escapeSql('General Skill')}, ${randInt(0, 5)}, 18, 50, ${escapeSql(minSal.toString())}, 'active', ${randInt(1, 10)}, true, false, ${escapeSql(randChoice(industries))}, ${escapeSql(ws === 'any' ? 'onsite' : ws)}, ${Math.random() > 0.8}, ${randInt(1, 10)}, ${escapeSql(contract)}, ${escapeSql('We are looking for a ' + title)}, ${escapeSql('General Santos City')}, ${minSal}, ${maxSal}, 'monthly', 'Full-time');\n`;
}

sql += '\n-- Inserting Jobseekers\n';
let jobseekers = [];
for(let i=0; i<118; i++) {
  let id = uuid();
  jobseekers.push(id);
  let email = 'jobseeker' + i + '@example.com';
  let fname = randChoice(firstNames);
  let lname = randChoice(lastNames);
  let brgy = randChoice(barangays);
  let gender = Math.random() > 0.5 ? 'Male' : 'Female';
  let workSetupPref = randChoice(workSetups);
  let prefLoc1 = randChoice(barangays) + ', General Santos City';
  let prefLoc2 = randChoice(barangays) + ', General Santos City';
  let prefOcc1 = randChoice(jobTitles);
  let prefOcc2 = randChoice(jobTitles);
  
  sql += `INSERT INTO public.jobseekers (id, email, first_name, last_name, birth_date, gender, civil_status, is_pwd, phone, barangay, city, province, employment_status, is_active, job_seeking_status, profile_complete, profile_completeness, work_setup_preference, expected_salary_min, preferred_occupation_1, preferred_occupation_2, preferred_work_location_local_1, preferred_work_location_local_2, preference_full_time, preference_part_time) VALUES (${escapeSql(id)}, ${escapeSql(email)}, ${escapeSql(fname)}, ${escapeSql(lname)}, ${escapeSql('1990-01-01')}, ${escapeSql(gender)}, 'Single', false, ${escapeSql('09'+randInt(100000000, 999999999))}, ${escapeSql(brgy)}, 'General Santos City', 'South Cotabato', 'Unemployed', true, ${escapeSql(randChoice(jobseekingStatuses))}, true, 100, ${escapeSql(workSetupPref)}, ${randInt(15000, 25000)}, ${escapeSql(prefOcc1)}, ${escapeSql(prefOcc2)}, ${escapeSql(prefLoc1)}, ${escapeSql(prefLoc2)}, true, false);\n`;
  
  // Random 2 to 5 backgrounds
  let numEdu = randInt(2, 5);
  for(let j=0; j<numEdu; j++) {
    let ed_id = uuid();
    sql += `INSERT INTO public.jobseeker_education (id, jobseeker_id, currently_in_school, level, course, year_graduated, school_name) VALUES (${escapeSql(ed_id)}, ${escapeSql(id)}, false, 'College Graduate', ${escapeSql('BS ' + randChoice(['IT', 'Nursing', 'Education', 'Business Administration', 'Engineering']))}, '${randInt(2010, 2023)}', 'Mindanao State University');\n`;
  }
  
  let numExp = randInt(2, 5);
  for(let j=0; j<numExp; j++) {
    let exp_id = uuid();
    sql += `INSERT INTO public.jobseeker_experience (id, jobseeker_id, company_name, position, number_of_months, status) VALUES (${escapeSql(exp_id)}, ${escapeSql(id)}, ${escapeSql(randChoice(lastNames) + ' Corp')}, ${escapeSql(randChoice(jobTitles))}, ${randInt(6, 60)}, 'Completed');\n`;
  }

  let numTrain = randInt(1, 3);
  for(let j=0; j<numTrain; j++) {
    let tr_id = uuid();
    sql += `INSERT INTO public.jobseeker_trainings (id, jobseeker_id, course, hours_of_training, training_institution) VALUES (${escapeSql(tr_id)}, ${escapeSql(id)}, ${escapeSql(randChoice(['TESDA NC II', 'Leadership Training', 'First Aid', 'Customer Service Excellence', 'Web Development']))}, ${randInt(8, 120)}, 'TESDA Gensan');\n`;
  }
}

fs.writeFileSync('d:/My Studies/GensanWorks-Next/seed_generated.sql', sql);
console.log('Successfully generated seed_generated.sql with enhanced background details');
