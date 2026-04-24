import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedAdmin() {
  console.log("Creating demo admin account...");

  const passwordHash = await bcrypt.hash("admin123", 10);

  const { data: existing } = await supabase
    .from("admins")
    .select("id")
    .eq("email", "admin@gensanworks.gov")
    .single();

  if (existing) {
    console.log("Admin already exists");
    return;
  }

  const { data, error } = await supabase.from("admins").insert({
    name: "Demo PESO Admin",
    email: "admin@gensanworks.gov",
    password_hash: passwordHash,
  });

  if (error) {
    console.error("Error creating admin:", error.message);
    process.exit(1);
  }

  console.log("Demo admin created successfully!");
  console.log("Email: admin@gensanworks.gov");
  console.log("Password: admin123");
}

seedAdmin();