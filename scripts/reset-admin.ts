import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(supabaseUrl, serviceKey);

async function main() {
  const passwordHash = await bcrypt.hash("Admin@123456", 10);
  console.log("Updating password to Admin@123456...");

  const { error: e1 } = await supabase.from("admins").update({ password_hash: passwordHash }).eq("email", "admin@gensanworks.gov");
  const { error: e2 } = await supabase.from("admins").update({ password_hash: passwordHash }).eq("email", "admin@gensanworks.com");

  if (e1) console.log("Error (gov):", e1.message);
  if (e2) console.log("Error (com):", e2.message);

  if (!e1 && !e2) console.log("Password updated to: Admin@123456");
}

main();