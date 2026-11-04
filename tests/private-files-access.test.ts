// Private document buckets: path parsing and who may open a file
// (owner, admin, linked employer only).

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildPrivateFileUrl,
  canAccessPrivateFile,
  isPrivateFileBucket,
  parsePrivateFilePath,
} from "../app/lib/private-files";

const OWNER = "6215d99b-a2b1-4738-acf3-5890d239e1a8";
const OTHER = "11111111-2222-4333-8444-555555555555";

describe("parsePrivateFilePath", () => {
  it("accepts the upload path shapes and returns the owner id", () => {
    assert.deepEqual(parsePrivateFilePath([OWNER, "1793749123569-cv.pdf"]), {
      path: `${OWNER}/1793749123569-cv.pdf`,
      ownerId: OWNER,
    });
    assert.equal(parsePrivateFilePath([OWNER, "businessPermitFile", "1-permit.pdf"])?.ownerId, OWNER);
  });

  it("rejects traversal, bad owner ids and odd characters", () => {
    assert.equal(parsePrivateFilePath([OWNER, "..", "x.pdf"]), null);
    assert.equal(parsePrivateFilePath(["not-a-uuid", "x.pdf"]), null);
    assert.equal(parsePrivateFilePath([OWNER]), null);
    assert.equal(parsePrivateFilePath([OWNER, "a b.pdf"]), null);
    assert.equal(parsePrivateFilePath([OWNER, "%2e%2e"]), null);
    assert.equal(parsePrivateFilePath([OWNER, "a", "b", "c", "d.pdf"]), null);
  });
});

describe("isPrivateFileBucket", () => {
  it("only knows the private document buckets", () => {
    assert.equal(isPrivateFileBucket("resumes"), true);
    assert.equal(isPrivateFileBucket("jobseeker-documents"), true);
    assert.equal(isPrivateFileBucket("employer-documents"), true);
    assert.equal(isPrivateFileBucket("profile-images"), false);
    assert.equal(isPrivateFileBucket("__proto__"), false);
  });
});

describe("buildPrivateFileUrl", () => {
  it("points at the access-checked route", () => {
    assert.equal(
      buildPrivateFileUrl("https://gensanworks.vercel.app", "resumes", `${OWNER}/1-cv.pdf`),
      `https://gensanworks.vercel.app/api/files/resumes/${OWNER}/1-cv.pdf`
    );
  });
});

describe("canAccessPrivateFile", () => {
  const base = { ownerId: OWNER, employerLinkedToOwner: false } as const;

  it("lets the owner open their own file", () => {
    assert.equal(canAccessPrivateFile({ ...base, viewerId: OWNER, viewerRole: "jobseeker", bucket: "resumes" }), true);
  });

  it("lets admins open any file", () => {
    assert.equal(canAccessPrivateFile({ ...base, viewerId: OTHER, viewerRole: "admin", bucket: "employer-documents" }), true);
  });

  it("lets an employer open a jobseeker file only when linked", () => {
    const employer = { ...base, viewerId: OTHER, viewerRole: "employer", bucket: "resumes" } as const;
    assert.equal(canAccessPrivateFile(employer), false);
    assert.equal(canAccessPrivateFile({ ...employer, employerLinkedToOwner: true }), true);
    assert.equal(
      canAccessPrivateFile({ ...employer, bucket: "jobseeker-documents", employerLinkedToOwner: true }),
      true
    );
  });

  it("denies cross-account access everywhere else", () => {
    assert.equal(canAccessPrivateFile({ ...base, viewerId: OTHER, viewerRole: "jobseeker", bucket: "resumes" }), false);
    assert.equal(
      canAccessPrivateFile({ ...base, viewerId: OTHER, viewerRole: "jobseeker", bucket: "employer-documents" }),
      false
    );
    assert.equal(
      canAccessPrivateFile({ ...base, viewerId: OTHER, viewerRole: "employer", bucket: "employer-documents", employerLinkedToOwner: true }),
      false
    );
    assert.equal(canAccessPrivateFile({ ...base, viewerId: "", viewerRole: "admin", bucket: "resumes" }), false);
    assert.equal(canAccessPrivateFile({ ...base, viewerId: OTHER, viewerRole: undefined, bucket: "resumes" }), false);
  });
});
