// Offline static checks for the Option C migration (no profile for OAuth users
// before consent). The SQL is not executed here; the owner applies it manually.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";

const MIGRATION = "supabase/migrations/20261020120000_option_c_skip_oauth_profile_before_consent.sql";
const raw = readFileSync(path.join(process.cwd(), MIGRATION), "utf8").replace(/\r\n/g, "\n");
// Executable SQL only (comment lines removed, so the rollback block is ignored).
const sql = raw
  .split("\n")
  .filter((line) => !/^\s*--/.test(line))
  .join("\n");

describe("Option C migration — handle_new_user()", () => {
  it("replaces only public.handle_new_user(), with search_path pinned", () => {
    assert.equal((sql.match(/CREATE OR REPLACE FUNCTION/g) ?? []).length, 1);
    assert.match(sql, /CREATE OR REPLACE FUNCTION public\.handle_new_user\(\)/);
    assert.match(sql, /SECURITY DEFINER\s+SET search_path = public/);
  });

  it("returns early for any non-email provider before touching profile tables", () => {
    const guard = sql.indexOf("IF COALESCE(NEW.raw_app_meta_data->>'provider', 'email') <> 'email' THEN");
    const firstInsert = sql.indexOf("INSERT INTO");
    assert.ok(guard > 0, "OAuth guard missing");
    assert.ok(guard < firstInsert, "guard must run before any insert");
    assert.match(sql.slice(guard, firstInsert), /RETURN NEW;/);
  });

  it("keeps the email signup jobseeker and employer branches", () => {
    assert.match(sql, /INSERT INTO public\.jobseekers \(id, email, first_name, last_name, password_hash\)/);
    assert.match(sql, /INSERT INTO public\.employers \(id, email, establishment_name, contact_person, password_hash\)/);
    assert.ok(!/INSERT INTO public\.admins/.test(sql), "trigger must never create admins");
  });

  it("changes no tables, data, policies, or grants", () => {
    assert.ok(!/\b(ALTER TABLE|DROP|GRANT|REVOKE|CREATE POLICY|UPDATE public\.|DELETE FROM|TRUNCATE)\b/i.test(sql));
  });

  it("documents a rollback to the previous definition", () => {
    assert.match(raw, /ROLLBACK \(previous live definition/);
    assert.match(raw, /-- CREATE OR REPLACE FUNCTION public\.handle_new_user\(\)/);
  });

  it("the consent API creates the profile for OAuth users who have none", () => {
    const consent = readFileSync(path.join(process.cwd(), "app/lib/google-consent.ts"), "utf8");
    // With no existing profile, accept inserts a jobseeker or (pending) employer row.
    assert.match(consent, /if \(existingRole\) \{[\s\S]*?store\.insertEmployer\([\s\S]*?store\.insertJobseeker\(/);
  });
});
