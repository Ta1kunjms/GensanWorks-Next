import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import fs from "fs";
import path from "path";

// Load environment variables from .env.local
try {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split(/\r?\n/);
    lines.forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        if (key) {
          let value = match[2] || '';
          if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
          if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
          process.env[key] = value;
        }
      }
    });
  }
} catch (err) {
  console.warn("Could not load .env.local:", err);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !serviceKey) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

const firstNames = ["Juan", "Maria", "Jose", "Andres", "Apolinario", "Emilio", "Manuel", "Sergio", "Ramon", "Diosdado", "Ferdinand", "Corazon", "Fidel", "Joseph", "Gloria", "Benigno", "Rodrigo", "Bongbong", "Sara", "Leni", "Isko", "Manny", "Ping", "Leila", "Risa", "Loren", "Grace", "Nancy", "Cynthia", "Bam", "Kiko", "Antonio", "Alan", "Pia", "Francis", "Richard", "Joel", "Jinggoy", "Bong", "JV", "Win", "Sherwin", "Migz", "Koko", "Ralph", "Tito", "Gringo", "Bato", "Go", "Tol"];
const lastNames = ["Dela Cruz", "Santos", "Reyes", "Perez", "Bautista", "Garcia", "Lopez", "Rodriguez", "Fernandez", "Gonzales", "Enriquez", "Cortez", "Villanueva", "Santiago", "Ramos", "Arroyo", "Aquino", "Duterte", "Marcos", "Robredo", "Domagoso", "Pacquiao", "Lacson", "De Lima", "Hontiveros", "Legarda", "Poe", "Binay", "Villar", "Aquino", "Pangilinan", "Trillanes", "Cayetano", "Gordon", "Villanueva", "Lapid", "Estrada", "Revilla", "Ejercito", "Gatchalian", "Zubiri", "Pimentel", "Recto", "Sotto", "Honasan", "Dela Rosa", "Go", "Tolentino", "Angara", "Escudero"];

const barangays = ["Apopong", "Baluan", "Batomelong", "Buayan", "Bula", "Calumpang", "City Heights", "Conel", "Dadiangas East", "Dadiangas North", "Dadiangas South", "Dadiangas West", "Fatima", "Katangawan", "Labangal", "Lagao", "Mabuhay", "San Isidro", "San Jose", "Siguel", "Sinawal", "Tambler", "Tinagacan", "Upper Labay"];
const religions = ["Roman Catholic", "Islam", "Iglesia ni Cristo", "Seventh-day Adventist", "Born Again Christian", "Jehovah's Witnesses"];
const civilStatuses = ["Single", "Married", "Widowed", "Separated"];
const genders = ["Male", "Female"];
const employmentStatuses = ["Employed", "Unemployed", "Self-Employed"];
const industries = ["Fishing & Aquaculture", "Agriculture", "Manufacturing", "Retail", "Services", "Tourism", "Construction", "Information Technology"];
const occupations = ["Software Developer", "Accountant", "Nurse", "Teacher", "Engineer", "Fisherman", "Farmer", "Sales Associate", "Customer Service Representative", "Driver", "Security Guard", "Cook", "Waiter", "Mason", "Electrician"];

async function generateData() {
  console.log("🚀 Starting test data generation...");

  const passwordHash = await bcrypt.hash("password123", 10);

  // Cleanup existing test data
  console.log("🧹 Cleaning up existing test data...");
  await supabase.from("admins").delete().ilike("email", "%@example.com");
  await supabase.from("jobs").delete().neq("id", "00000000-0000-0000-0000-000000000000"); // Broad cleanup for test jobs
  await supabase.from("employers").delete().ilike("email", "%@example.com");
  await supabase.from("employers").delete().ilike("email", "hr@%Co.com"); // Cleanup old test emails
  await supabase.from("jobseekers").delete().ilike("email", "%@example.com");

  // ... (Test users creation remains the same)
  // 1. Create Test Users
  console.log("👥 Creating test users...");
  
  // Jobseeker Test User
  const jobseekerId = crypto.randomUUID();
  await supabase.from("jobseekers").insert({
    id: jobseekerId,
    email: "test.jobseeker@example.com",
    password_hash: passwordHash,
    first_name: "Test",
    last_name: "Jobseeker",
    phone: "09123456789",
    city: "General Santos City",
    province: "South Cotabato",
    is_active: true,
    profile_complete: true,
    profile_completeness: 100,
    nsrp_id: `NSRP-${Math.floor(100000 + Math.random() * 900000)}`
  });

  // Employer Test User
  const testEmployerId = crypto.randomUUID();
  await supabase.from("employers").insert({
    id: testEmployerId,
    email: "test.employer@example.com",
    password_hash: passwordHash,
    establishment_name: "Test Enterprise GenSan",
    city: "General Santos City",
    province: "South Cotabato",
    industry: "Services",
    is_active: true,
    account_status: "verified"
  });

  // Admin Test User
  await supabase.from("admins").insert({
    email: "test.admin@example.com",
    password_hash: passwordHash,
    name: "System Admin"
  });

  // ... (Jobseeker generation remains the same)
  // 2. Generate 50 Jobseekers
  console.log("🏃 Generating 50 jobseekers...");
  // ... (omitting for brevity in this thought, but I'll keep it in the tool call)
  const jobseekers = [];
  for (let i = 0; i < 50; i++) {
    const fName = firstNames[i % firstNames.length] || "User";
    const lName = lastNames[i % lastNames.length] || "Name";
    const email = `${fName.toLowerCase()}.${lName.toLowerCase().replace(' ', '')}.${i}@example.com`;
    
    jobseekers.push({
      first_name: fName,
      last_name: lName,
      middle_name: "Santos",
      suffix: Math.random() > 0.9 ? "Jr." : "",
      email: email,
      password_hash: passwordHash,
      birth_date: new Date(1980 + Math.floor(Math.random() * 25), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28)).toISOString().split('T')[0],
      gender: genders[Math.floor(Math.random() * genders.length)],
      religion: religions[Math.floor(Math.random() * religions.length)],
      civil_status: civilStatuses[Math.floor(Math.random() * civilStatuses.length)],
      tin: `${Math.floor(100 + Math.random() * 900)}-${Math.floor(100 + Math.random() * 900)}-${Math.floor(100 + Math.random() * 900)}`,
      height: `${150 + Math.floor(Math.random() * 40)} cm`,
      phone: `09${Math.floor(100000000 + Math.random() * 900000000)}`,
      house_number: `${Math.floor(1 + Math.random() * 500)}`,
      barangay: barangays[Math.floor(Math.random() * barangays.length)],
      city: "General Santos City",
      province: "South Cotabato",
      zip_code: "9500",
      employment_status: employmentStatuses[Math.floor(Math.random() * employmentStatuses.length)],
      employment_type: "Full-time",
      is_pwd: Math.random() > 0.9,
      pwd_type: Math.random() > 0.9 ? "Visual" : null,
      is_ofw: Math.random() > 0.9,
      ofw_country: Math.random() > 0.9 ? "Saudi Arabia" : null,
      is_four_ps: Math.random() > 0.8,
      household_id_no: Math.random() > 0.8 ? `HH-${Math.floor(100000 + Math.random() * 900000)}` : null,
      preference_full_time: true,
      preference_part_time: false,
      preferred_occupation_1: occupations[Math.floor(Math.random() * occupations.length)],
      preferred_occupation_2: occupations[Math.floor(Math.random() * occupations.length)],
      preferred_occupation_3: occupations[Math.floor(Math.random() * occupations.length)],
      preferred_work_location_local: "General Santos City",
      preferred_work_location_overseas: "None",
      other_skills: JSON.stringify(["Communication", "Teamwork", "Problem Solving"]),
      nsrp_id: `NSRP-${Math.floor(100000 + Math.random() * 900000)}`,
      profile_complete: true,
      profile_completeness: 100,
      is_active: true
    });
  }

  const { data: insertedJobseekers, error: jsError } = await supabase.from("jobseekers").insert(jobseekers).select("id");
  if (jsError) {
    console.error("Error inserting jobseekers:", jsError.message);
  } else {
    console.log("✅ 50 jobseekers inserted. Generating related records...");
    
    const education = [];
    const experience = [];
    const trainings = [];
    const licenses = [];
    const languages = [];

    const levels = ["Elementary", "High School", "College", "Vocational", "Master's Degree"];
    const positions = ["Worker", "Staff", "Lead", "Manager", "Assistant"];
    const langs = ["English", "Tagalog", "Cebuano", "Hiligaynon", "Ilocano"];

    for (const js of insertedJobseekers) {
      education.push({
        jobseeker_id: js.id,
        level: levels[Math.floor(Math.random() * levels.length)],
        course: "General Education",
        year_graduated: "201" + Math.floor(Math.random() * 9),
        currently_in_school: false
      });
      experience.push({
        jobseeker_id: js.id,
        company_name: "Local Business " + Math.floor(Math.random() * 100),
        position: positions[Math.floor(Math.random() * positions.length)],
        number_of_months: Math.floor(6 + Math.random() * 60),
        status: "Resigned"
      });
      trainings.push({
        jobseeker_id: js.id,
        course: "Skills Training " + Math.floor(Math.random() * 10),
        hours_of_training: Math.floor(16 + Math.random() * 80),
        training_institution: "TESDA Partner",
        skills_acquired: "Technical Skills"
      });
      if (Math.random() > 0.5) {
        licenses.push({
          jobseeker_id: js.id,
          eligibility: "Professional Regulation Commission",
          professional_license: "License " + Math.floor(100000 + Math.random() * 900000),
          date_taken: "2020-01-01",
          valid_until: "2028-01-01"
        });
      }
      for (let i = 0; i < 2; i++) {
        languages.push({
          jobseeker_id: js.id,
          language: langs[i % langs.length],
          read: true,
          write: true,
          speak: true,
          understand: true
        });
      }
    }

    await Promise.all([
      supabase.from("jobseeker_education").insert(education),
      supabase.from("jobseeker_experience").insert(experience),
      supabase.from("jobseeker_trainings").insert(trainings),
      supabase.from("jobseeker_licenses").insert(licenses),
      supabase.from("jobseeker_languages").insert(languages)
    ]);
    console.log("✅ Related records for jobseekers inserted.");
  }

  // 3. Generate 20 Employers
  console.log("🏢 Generating 20 employers...");
  const employers = [];
  for (let i = 0; i < 20; i++) {
    const estName = `${lastNames[i % lastNames.length]} ${industries[i % industries.length]} Co.`;
    const randomId = crypto.randomBytes(4).toString('hex');
    const email = `hr.${randomId}@example.com`;
    
    employers.push({
      establishment_name: estName,
      email: email,
      password_hash: passwordHash,
      barangay: barangays[Math.floor(Math.random() * barangays.length)],
      city: "General Santos City",
      province: "South Cotabato",
      address: `Purok ${Math.floor(1 + Math.random() * 10)}, ${barangays[Math.floor(Math.random() * barangays.length)]}`,
      industry: industries[Math.floor(Math.random() * industries.length)],
      contact_person: `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`,
      contact_phone: `09${Math.floor(100000000 + Math.random() * 900000000)}`,
      designation: "HR Manager",
      company_tax_id: `${Math.floor(100 + Math.random() * 900)}-${Math.floor(100 + Math.random() * 900)}-${Math.floor(100 + Math.random() * 900)}`,
      total_paid_employees: Math.floor(10 + Math.random() * 500),
      total_vacant_positions: Math.floor(1 + Math.random() * 20),
      account_status: "verified",
      is_active: true
    });
  }

  const { data: insertedEmployers, error: empError } = await supabase.from("employers").insert(employers).select("id, industry");
  if (empError) {
    console.error("Error inserting employers:", empError.message);
  } else {
    console.log("✅ 20 employers inserted.");
    
    // 4. Generate 100 Jobs
    console.log("💼 Generating 100 jobs connected to employers...");
    const jobs = [];
    const industryJobs: Record<string, string[]> = {
      "Fishing & Aquaculture": ["Master Fisherman", "Aquaculture Technician", "Fish Processing Supervisor", "Marine Engineer", "Fleet Manager"],
      "Agriculture": ["Farm Manager", "Agricultural Technologist", "Crop Specialist", "Irrigation Engineer", "Livestock Supervisor"],
      "Manufacturing": ["Production Supervisor", "Quality Control Inspector", "Machine Operator", "Factory Worker", "Maintenance Technician"],
      "Retail": ["Store Manager", "Sales Associate", "Inventory Clerk", "Cashier Supervisor", "Visual Merchandiser"],
      "Services": ["Customer Service Rep", "Account Manager", "Administrative Assistant", "Project Coordinator", "Operations Manager"],
      "Tourism": ["Hotel Manager", "Tour Guide", "Front Desk Officer", "Travel Consultant", "Events Coordinator"],
      "Construction": ["Project Engineer", "Site Supervisor", "Foreman", "Safety Officer", "Quantity Surveyor"],
      "Information Technology": ["Software Developer", "System Administrator", "IT Support Specialist", "Data Analyst", "Network Engineer"]
    };

    const allEmployers = [...insertedEmployers, { id: testEmployerId, industry: "Services" }];

    for (let i = 0; i < 100; i++) {
      const employer = allEmployers[i % allEmployers.length];
      if (!employer) continue;
      const possiblePositions = industryJobs[employer.industry as keyof typeof industryJobs] || ["General Staff"];
      const position = possiblePositions[Math.floor(Math.random() * (possiblePositions.length || 1))] || "General Staff";
      
      jobs.push({
        employer_id: employer.id,
        position_title: position,
        minimum_education_required: "College Graduate",
        main_skill_desired: "Technical Proficiency",
        years_of_experience_required: Math.floor(Math.random() * 5),
        starting_salary: `${15000 + Math.floor(Math.random() * 20000)} - ${35000 + Math.floor(Math.random() * 30000)}`,
        job_status: "Open",
        vacancies: Math.floor(1 + Math.random() * 5),
        is_active: true,
        archived: false
      });
    }

    const { error: jobsError } = await supabase.from("jobs").insert(jobs);
    if (jobsError) console.error("Error inserting jobs:", jobsError.message);
    else console.log("✅ 100 jobs inserted.");
  }

  console.log("\n✨ Test data generation complete!");
  console.log("Credentials for all test users:");
  console.log("- Password: password123");
  console.log("- Admin: test.admin@example.com");
  console.log("- Jobseeker: test.jobseeker@example.com");
  console.log("- Employer: test.employer@example.com");
}

generateData().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
