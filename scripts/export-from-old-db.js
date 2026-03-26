#!/usr/bin/env node

/**
 * Export Script: GensanWorks Data Export from Old Database
 * 
 * This script exports data from the current Express + SQLite/PostgreSQL
 * database to CSV files for migration to Supabase.
 * 
 * Usage: npm run migrate:export
 */

const fs = require("fs");
const path = require("path");
const { stringify } = require("csv-stringify/sync");

// This would connect to the old database
// For now, this is a template that shows how to structure the export

const EXPORT_DIR = path.join(__dirname, "../exports");

// Ensure export directory exists
if (!fs.existsSync(EXPORT_DIR)) {
  fs.mkdirSync(EXPORT_DIR, { recursive: true });
}

/**
 * Example export function
 * In real implementation, connect to old Express server database
 */
async function exportData() {
  console.log("🚀 Starting data export from old GensanWorks database...");
  console.log(`📁 Export directory: ${EXPORT_DIR}\n`);

  try {
    // Mock data for demonstration
    // Replace with actual database queries from old system

    const applicants = [
      {
        id: "1",
        email: "john@example.com",
        name: "John Doe",
        phone: "09123456789",
        birthDate: "1990-01-15",
        gender: "male",
        address: "123 Main St",
        city: "General Santos",
        province: "South Cotabato",
        employmentStatus: "Unemployed",
        educationLevel: "Bachelor",
        skills: JSON.stringify(["JavaScript", "React", "Node.js"]),
        isFourPS: false,
        isOFW: false,
        nsrpId: "NSRP-2024-001",
        registrationDate: new Date().toISOString(),
        profileComplete: true,
        profileCompleteness: 85,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const employers = [
      {
        id: "1",
        email: "employer@company.com",
        contactPerson: "Jane Smith",
        contactPhone: "09111223344",
        establishmentName: "Tech Company Philippines",
        industry: "Information Technology",
        companyType: "Private",
        companySize: "Medium",
        address: "456 Business Park",
        city: "General Santos",
        province: "South Cotabato",
        accountStatus: "approved",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const jobs = [
      {
        id: "1",
        employerId: "1",
        positionTitle: "Senior Developer",
        description: "We are looking for a senior developer...",
        salaryMin: "50000",
        salaryMax: "70000",
        salaryPeriod: "monthly",
        employmentType: "Full-time",
        location: "General Santos",
        city: "General Santos",
        province: "South Cotabato",
        requiredSkills: JSON.stringify(["JavaScript", "React"]),
        educationLevel: "Bachelor",
        status: "active",
        isPublished: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const applications = [
      {
        id: "1",
        jobId: "1",
        applicantId: "1",
        employerId: "1",
        applicantName: "John Doe",
        applicantEmail: "john@example.com",
        status: "pending",
        submittedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const referrals = [
      {
        id: "1",
        applicantId: "1",
        employerId: "1",
        jobId: "1",
        applicant: "John Doe",
        employer: "Tech Company Philippines",
        vacancy: "Senior Developer",
        status: "Pending",
        referralSlipNumber: "REFERRAL-2024-001",
        pesoOfficerName: "Maria Rodriguez",
        dateReferred: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    // Write CSVs
    console.log("📝 Exporting applicants...");
    fs.writeFileSync(
      path.join(EXPORT_DIR, "applicants.csv"),
      stringify(applicants, { header: true })
    );
    console.log(`✅ Exported ${applicants.length} applicants`);

    console.log("📝 Exporting employers...");
    fs.writeFileSync(
      path.join(EXPORT_DIR, "employers.csv"),
      stringify(employers, { header: true })
    );
    console.log(`✅ Exported ${employers.length} employers`);

    console.log("📝 Exporting jobs...");
    fs.writeFileSync(
      path.join(EXPORT_DIR, "jobs.csv"),
      stringify(jobs, { header: true })
    );
    console.log(`✅ Exported ${jobs.length} jobs`);

    console.log("📝 Exporting applications...");
    fs.writeFileSync(
      path.join(EXPORT_DIR, "applications.csv"),
      stringify(applications, { header: true })
    );
    console.log(`✅ Exported ${applications.length} applications`);

    console.log("📝 Exporting referrals...");
    fs.writeFileSync(
      path.join(EXPORT_DIR, "referrals.csv"),
      stringify(referrals, { header: true })
    );
    console.log(`✅ Exported ${referrals.length} referrals`);

    // Create summary
    const summary = {
      exportedAt: new Date().toISOString(),
      totals: {
        applicants: applicants.length,
        employers: employers.length,
        jobs: jobs.length,
        applications: applications.length,
        referrals: referrals.length,
      },
      files: [
        "applicants.csv",
        "employers.csv",
        "jobs.csv",
        "applications.csv",
        "referrals.csv",
      ],
    };

    fs.writeFileSync(
      path.join(EXPORT_DIR, "EXPORT_SUMMARY.json"),
      JSON.stringify(summary, null, 2)
    );

    console.log("\n✨ Export complete!");
    console.log(`📁 Files saved to: ${EXPORT_DIR}`);
    console.log("\n📊 Summary:");
    console.log(JSON.stringify(summary, null, 2));

    console.log("\n🚀 Next step: Run 'npm run migrate:import' to import to Supabase");
  } catch (error) {
    console.error("❌ Export failed:", error);
    process.exit(1);
  }
}

// Run export
exportData();
