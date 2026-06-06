import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getLoginErrorMessage } from "@/lib/auth-login-errors";

describe("auth-login-errors", () => {
  it("returns a no account message when the email is unknown", () => {
    assert.equal(
      getLoginErrorMessage("Invalid login credentials", {
        accountExists: false,
        roleLabel: "jobseeker",
      }),
      "No jobseeker account found for this email."
    );
  });

  it("returns a role-aware incorrect password message when the account exists", () => {
    assert.equal(
      getLoginErrorMessage("Invalid login credentials", {
        accountExists: true,
        roleLabel: "admin",
      }),
      "Incorrect admin password."
    );
  });

  it("keeps confirmation and throttling errors readable", () => {
    assert.equal(
      getLoginErrorMessage("Email not confirmed", {
        accountExists: true,
        roleLabel: "employer",
      }),
      "Please verify your email before signing in."
    );

    assert.equal(
      getLoginErrorMessage("Too many requests", {
        accountExists: true,
        roleLabel: "employer",
      }),
      "Too many sign-in attempts. Please try again in a moment."
    );
  });
});
