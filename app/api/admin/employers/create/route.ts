export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  return role === "admin";
}

export async function POST(req: Request) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email, password, profile } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    // 1. Create Auth User
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: "employer", establishment_name: profile.establishmentName },
    });

    if (authError || !authData.user) {
      return NextResponse.json({ error: authError?.message || "Failed to create auth user" }, { status: 400 });
    }

    const userId = authData.user.id;

    // 2. Insert into employers table
    const employerPayload = {
      id: userId,
      email,
      establishment_name: profile.establishmentName,
      acronym_abbreviation: profile.acronymAbbreviation,
      industry_code: profile.industryCode,
      company_tax_id: profile.companyTaxId,
      type_of_establishment: profile.typeOfEstablishment,
      total_paid_employees: profile.totalPaidEmployees,
      total_vacant_positions: profile.totalVacantPositions,
      srs_subscriber_intent: profile.srsSubscriberIntent,
      
      province: profile.province,
      city: profile.city,
      barangay: profile.barangay,
      address: profile.address,
      zip_code: profile.zipCode,
      geographic_code: profile.geographicCode,
      barangay_chairperson: profile.barangayChairperson,
      barangay_secretary: profile.barangaySecretary,

      contact_person: profile.contactPerson,
      contact_phone: profile.contactPhone,
      designation: profile.designation,

      srs_prepared_by: profile.srsPreparedBy,
      srs_prepared_designation: profile.srsPreparedDesignation,
      srs_prepared_date: profile.srsPreparedDate ? new Date(profile.srsPreparedDate).toISOString() : null,
      srs_prepared_contact: profile.srsPreparedContact,

      business_permit_file: profile.businessPermitFile,
      bir_2303_file: profile.bir2303File,
      dole_certification_file: profile.doleCertificationFile,
      company_profile_file: profile.companyProfileFile,

      description: profile.description,
      website: profile.website,
      profile_image: profile.profileImage,
      tin: profile.companyTaxId, // Ensure tin matches companyTaxId if mapping requires it

      account_status: "approved", // Automatically approve since admin created it
      verified_at: new Date().toISOString(),
      is_active: true,
      
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: employerError } = await supabaseAdmin
      .from("employers")
      .insert(employerPayload);

    if (employerError) {
      console.error("Employer insert error:", employerError);
      // Rollback auth
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: "Failed to create employer profile" }, { status: 500 });
    }

    return NextResponse.json({ success: true, userId });
  } catch (error: any) {
    console.error("Admin employer creation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
