import assert from "node:assert/strict";
import { test } from "node:test";
import { resetJobseekerPassword } from "@/lib/admin-jobseeker-password-reset";

type JobseekerQueryResult = {
  data: { id: string; email: string; first_name: string; last_name: string } | null;
  error: null;
};

type UpdateUserResult = {
  data: { user: { id: string } } | null;
  error: null;
};

test("resetJobseekerPassword updates password for an existing jobseeker", async () => {
  let updateCalled = 0;

  const result = await resetJobseekerPassword(
    { jobseekerId: "user-1", newPassword: "TempPass123" },
    {
      getJobseekerById: async (): Promise<JobseekerQueryResult> => ({
        data: { id: "user-1", email: "user@example.com", first_name: "Test", last_name: "User" },
        error: null,
      }),
      updateUserPassword: async (): Promise<UpdateUserResult> => {
        updateCalled += 1;
        return { data: { user: { id: "user-1" } }, error: null };
      },
    }
  );

  assert.equal(result.ok, true);
  assert.equal(updateCalled, 1);
});
