import { desc } from "drizzle-orm";
import {
  accountDeletionRequestsTable,
  adminAccessRequestsTable,
  applicationsTable,
  employersTable,
  jobsTable,
  referralsTable,
} from "@/db/schema";
import { db } from "@/lib/db";

export type LegacyActivity = {
  id: string;
  type: string;
  action: string;
  resourceType: string;
  resourceId: string;
  userId: string | null;
  details: string;
  createdAt: string;
};

function iso(value: Date | string | null | undefined) {
  if (!value) return new Date().toISOString();
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

export async function buildLegacyActivities(limit: number) {
  const capped = Math.max(20, Math.min(500, limit));

  const [
    accessRequests,
    deletionRequests,
    jobs,
    applications,
    referrals,
    employers,
  ] = await Promise.all([
    db
      .select({
        id: adminAccessRequestsTable.id,
        email: adminAccessRequestsTable.email,
        status: adminAccessRequestsTable.status,
        createdAt: adminAccessRequestsTable.createdAt,
        reviewedAt: adminAccessRequestsTable.reviewedAt,
      })
      .from(adminAccessRequestsTable)
      .orderBy(desc(adminAccessRequestsTable.createdAt))
      .limit(capped),
    db
      .select({
        id: accountDeletionRequestsTable.id,
        userId: accountDeletionRequestsTable.userId,
        role: accountDeletionRequestsTable.role,
        email: accountDeletionRequestsTable.email,
        status: accountDeletionRequestsTable.status,
        requestedAt: accountDeletionRequestsTable.requestedAt,
        processedAt: accountDeletionRequestsTable.processedAt,
        cancelledAt: accountDeletionRequestsTable.cancelledAt,
      })
      .from(accountDeletionRequestsTable)
      .orderBy(desc(accountDeletionRequestsTable.requestedAt))
      .limit(capped),
    db
      .select({
        id: jobsTable.id,
        employerId: jobsTable.employerId,
        title: jobsTable.positionTitle,
        status: jobsTable.status,
        createdAt: jobsTable.createdAt,
        updatedAt: jobsTable.updatedAt,
      })
      .from(jobsTable)
      .orderBy(desc(jobsTable.updatedAt))
      .limit(capped),
    db
      .select({
        id: applicationsTable.id,
        applicantId: applicationsTable.applicantId,
        jobId: applicationsTable.jobId,
        status: applicationsTable.status,
        createdAt: applicationsTable.createdAt,
        updatedAt: applicationsTable.updatedAt,
      })
      .from(applicationsTable)
      .orderBy(desc(applicationsTable.updatedAt))
      .limit(capped),
    db
      .select({
        id: referralsTable.id,
        applicantId: referralsTable.applicantId,
        status: referralsTable.status,
        createdAt: referralsTable.createdAt,
        updatedAt: referralsTable.updatedAt,
      })
      .from(referralsTable)
      .orderBy(desc(referralsTable.updatedAt))
      .limit(capped),
    db
      .select({
        id: employersTable.id,
        createdAt: employersTable.createdAt,
        updatedAt: employersTable.updatedAt,
        accountStatus: employersTable.accountStatus,
      })
      .from(employersTable)
      .orderBy(desc(employersTable.updatedAt))
      .limit(capped),
  ]);

  const activities: LegacyActivity[] = [];

  accessRequests.forEach((item) => {
    activities.push({
      id: `access-create-${item.id}`,
      type: "admin_access_request_created",
      action: "create",
      resourceType: "admin_access_request",
      resourceId: item.id,
      userId: item.email,
      details: `Admin access request created (${item.status})`,
      createdAt: iso(item.createdAt),
    });

    if (item.reviewedAt) {
      activities.push({
        id: `access-review-${item.id}`,
        type: "admin_access_request_reviewed",
        action: "update",
        resourceType: "admin_access_request",
        resourceId: item.id,
        userId: item.email,
        details: `Admin access request reviewed (${item.status})`,
        createdAt: iso(item.reviewedAt),
      });
    }
  });

  deletionRequests.forEach((item) => {
    activities.push({
      id: `deletion-request-${item.id}`,
      type: "account_deletion_requested",
      action: "create",
      resourceType: "account_deletion_request",
      resourceId: item.id,
      userId: item.userId,
      details: `${item.role} account deletion requested (${item.status})`,
      createdAt: iso(item.requestedAt),
    });

    if (item.processedAt) {
      activities.push({
        id: `deletion-processed-${item.id}`,
        type: "account_deletion_processed",
        action: "update",
        resourceType: "account_deletion_request",
        resourceId: item.id,
        userId: item.userId,
        details: `Account deletion processed (${item.status})`,
        createdAt: iso(item.processedAt),
      });
    }

    if (item.cancelledAt) {
      activities.push({
        id: `deletion-cancelled-${item.id}`,
        type: "account_deletion_cancelled",
        action: "update",
        resourceType: "account_deletion_request",
        resourceId: item.id,
        userId: item.userId,
        details: "Account deletion cancelled",
        createdAt: iso(item.cancelledAt),
      });
    }
  });

  jobs.forEach((item) => {
    activities.push({
      id: `job-update-${item.id}`,
      type: "job_updated",
      action: "update",
      resourceType: "job",
      resourceId: item.id,
      userId: item.employerId,
      details: `Job ${item.title} status=${item.status}`,
      createdAt: iso(item.updatedAt),
    });
  });

  applications.forEach((item) => {
    activities.push({
      id: `application-update-${item.id}`,
      type: "application_updated",
      action: "update",
      resourceType: "application",
      resourceId: item.id,
      userId: item.applicantId,
      details: `Application status=${item.status}`,
      createdAt: iso(item.updatedAt),
    });
  });

  referrals.forEach((item) => {
    activities.push({
      id: `referral-update-${item.id}`,
      type: "referral_updated",
      action: "update",
      resourceType: "referral",
      resourceId: item.id,
      userId: item.applicantId,
      details: `Referral status=${item.status}`,
      createdAt: iso(item.updatedAt),
    });
  });

  employers.forEach((item) => {
    activities.push({
      id: `employer-update-${item.id}`,
      type: "employer_updated",
      action: "update",
      resourceType: "employer",
      resourceId: item.id,
      userId: item.id,
      details: `Employer account status=${item.accountStatus}`,
      createdAt: iso(item.updatedAt),
    });
  });

  activities.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return activities;
}
