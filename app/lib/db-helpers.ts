/**
 * Database Utilities & Helper Functions
 * Provides common database operations with error handling and best practices
 */

import { eq, and, or, ilike, desc, sql, type SQL } from "drizzle-orm";
import { db } from "./db";
import { usersTable, employersTable, jobsTable, applicationsTable, adminAccessRequestsTable } from "@/db/schema";
import { safeDatabaseOperation } from "./api-errors";

// ============================================================================
// USER QUERIES
// ============================================================================

/**
 * Find user by ID
 */
export async function findUserById(userId: string) {
  return safeDatabaseOperation(
    async () => {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
      return user || null;
    },
    `findUserById(${userId})`
  );
}

/**
 * Find user by email
 */
export async function findUserByEmail(email: string) {
  return safeDatabaseOperation(
    async () => {
      const [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, email.toLowerCase()));
      return user || null;
    },
    `findUserByEmail(${email})`
  );
}

/**
 * Check if email exists
 */
export async function emailExists(email: string): Promise<boolean> {
  const result = await findUserByEmail(email);
  return result.success && result.data !== null;
}

/**
 * Find employer by ID
 */
export async function findEmployerById(employerId: string) {
  return safeDatabaseOperation(
    async () => {
      const [employer] = await db
        .select()
        .from(employersTable)
        .where(eq(employersTable.id, employerId));
      return employer || null;
    },
    `findEmployerById(${employerId})`
  );
}

/**
 * Find employer by email
 */
export async function findEmployerByEmail(email: string) {
  return safeDatabaseOperation(
    async () => {
      const [employer] = await db
        .select()
        .from(employersTable)
        .where(eq(employersTable.email, email.toLowerCase()));
      return employer || null;
    },
    `findEmployerByEmail(${email})`
  );
}

// ============================================================================
// JOB QUERIES
// ============================================================================

/**
 * Find published job by ID with employer details
 */
export async function findPublishedJobById(jobId: string) {
  return safeDatabaseOperation(
    async () => {
      const [job] = await db
        .select()
        .from(jobsTable)
        .innerJoin(employersTable, eq(jobsTable.employerId, employersTable.id))
        .where(and(
          eq(jobsTable.id, jobId),
          eq(jobsTable.isPublished, true)
        ));
      return job || null;
    },
    `findPublishedJobById(${jobId})`
  );
}

/**
 * List published jobs with search and pagination
 */
export async function listPublishedJobs(filters: {
  limit: number;
  offset: number;
  search?: string;
  location?: string;
  city?: string;
  employmentType?: string;
  salaryMin?: number;
  salaryMax?: number;
  sortBy?: "recent" | "salary_high" | "salary_low";
}) {
  return safeDatabaseOperation(
    async () => {
      const whereConditions: SQL<unknown>[] = [eq(jobsTable.isPublished, true)];

      if (filters.search) {
        const searchCondition = or(
          ilike(jobsTable.positionTitle, `%${filters.search}%`),
          ilike(jobsTable.description, `%${filters.search}%`),
          ilike(jobsTable.qualifications, `%${filters.search}%`)
        );
        if (searchCondition) {
          whereConditions.push(searchCondition);
        }
      }

      if (filters.location) {
        whereConditions.push(ilike(jobsTable.location, `%${filters.location}%`));
      }

      if (filters.city) {
        whereConditions.push(ilike(jobsTable.city, `%${filters.city}%`));
      }

      if (filters.employmentType) {
        whereConditions.push(
          eq(
            jobsTable.employmentType,
            filters.employmentType as "Full-time" | "Part-time" | "Contract" | "Temporary" | "Freelance" | "Internship"
          )
        );
      }

      if (filters.salaryMin !== undefined) {
        whereConditions.push(sql`${jobsTable.salaryMax} >= ${filters.salaryMin}`);
      }

      if (filters.salaryMax !== undefined) {
        whereConditions.push(sql`${jobsTable.salaryMin} <= ${filters.salaryMax}`);
      }

      // Get total count
      const countResult = await db
        .select({ count: sql`count(*)` })
        .from(jobsTable)
        .where(and(...whereConditions));

      const total = Number(countResult[0]?.count || 0);

      // Query base
      const query = db
        .select()
        .from(jobsTable)
        .innerJoin(employersTable, eq(jobsTable.employerId, employersTable.id))
        .where(and(...whereConditions))
        .orderBy(desc(jobsTable.publishedAt));

      // Fetch jobs with pagination
      const jobs = await query.limit(filters.limit).offset(filters.offset);

      // Apply salary sorting in-memory if needed (simpler than complex Drizzle ordering)
      if (filters.sortBy === "salary_high") {
        jobs.sort((a, b) => Number(b.jobs.salaryMax || 0) - Number(a.jobs.salaryMax || 0));
      } else if (filters.sortBy === "salary_low") {
        jobs.sort((a, b) => Number(a.jobs.salaryMin || 0) - Number(b.jobs.salaryMin || 0));
      }

      return {
        jobs,
        total,
        limit: filters.limit,
        offset: filters.offset,
      };
    },
    "listPublishedJobs"
  );
}

/**
 * Find job by ID (for employer/admin)
 */
export async function findJobById(jobId: string) {
  return safeDatabaseOperation(
    async () => {
      const [job] = await db
        .select()
        .from(jobsTable)
        .where(eq(jobsTable.id, jobId));
      return job || null;
    },
    `findJobById(${jobId})`
  );
}

// ============================================================================
// APPLICATION QUERIES
// ============================================================================

/**
 * Find application by ID
 */
export async function findApplicationById(applicationId: string) {
  return safeDatabaseOperation(
    async () => {
      const [application] = await db
        .select()
        .from(applicationsTable)
        .where(eq(applicationsTable.id, applicationId));
      return application || null;
    },
    `findApplicationById(${applicationId})`
  );
}

/**
 * Find user applications with pagination
 */
export async function findUserApplications(
  userId: string,
  filters: { limit: number; offset: number; status?: string }
) {
  return safeDatabaseOperation(
    async () => {
      const whereConditions: SQL<unknown>[] = [eq(applicationsTable.applicantId, userId)];

      if (filters.status) {
        whereConditions.push(
          eq(
            applicationsTable.status,
            filters.status as "pending" | "reviewed" | "shortlisted" | "interview" | "hired" | "rejected" | "withdrawn"
          )
        );
      }

      const query = db
        .select()
        .from(applicationsTable)
        .where(and(...whereConditions))
        .orderBy(desc(applicationsTable.createdAt))
        .limit(filters.limit)
        .offset(filters.offset);

      // Get total count
      const countResult = await db
        .select({ count: sql`count(*)` })
        .from(applicationsTable)
        .where(and(...whereConditions));

      const total = Number(countResult[0]?.count || 0);
      const applications = await query;

      return {
        applications,
        total,
        limit: filters.limit,
        offset: filters.offset,
      };
    },
    `findUserApplications(${userId})`
  );
}

/**
 * Find job applications with pagination
 */
export async function findJobApplications(
  jobId: string,
  filters: { limit: number; offset: number; status?: string }
) {
  return safeDatabaseOperation(
    async () => {
      const whereConditions: SQL<unknown>[] = [eq(applicationsTable.jobId, jobId)];

      if (filters.status) {
        whereConditions.push(
          eq(
            applicationsTable.status,
            filters.status as "pending" | "reviewed" | "shortlisted" | "interview" | "hired" | "rejected" | "withdrawn"
          )
        );
      }

      const query = db
        .select()
        .from(applicationsTable)
        .where(and(...whereConditions))
        .orderBy(desc(applicationsTable.createdAt))
        .limit(filters.limit)
        .offset(filters.offset);

      // Get total count
      const countResult = await db
        .select({ count: sql`count(*)` })
        .from(applicationsTable)
        .where(and(...whereConditions));

      const total = Number(countResult[0]?.count || 0);
      const applications = await query;

      return {
        applications,
        total,
        limit: filters.limit,
        offset: filters.offset,
      };
    },
    `findJobApplications(${jobId})`
  );
}

/**
 * Check if user already applied for job
 */
export async function hasUserApplied(userId: string, jobId: string): Promise<boolean> {
  const result = await safeDatabaseOperation(
    async () => {
      const [application] = await db
        .select()
        .from(applicationsTable)
        .where(
          and(
            eq(applicationsTable.applicantId, userId),
            eq(applicationsTable.jobId, jobId)
          )
        );
      return !!application;
    },
    `hasUserApplied(${userId}, ${jobId})`
  );

  return result.success ? result.data : false;
}

// ============================================================================
// ACCESS REQUEST QUERIES
// ============================================================================

/**
 * Find pending employer access requests
 */
export async function findPendingAccessRequests(filters: {
  limit: number;
  offset: number;
}) {
  return safeDatabaseOperation(
    async () => {
      const query = db
        .select()
        .from(adminAccessRequestsTable)
        .where(eq(adminAccessRequestsTable.status, "pending"))
        .orderBy(desc(adminAccessRequestsTable.createdAt))
        .limit(filters.limit)
        .offset(filters.offset);

      // Get total count
      const countResult = await db
        .select({ count: sql`count(*)` })
        .from(adminAccessRequestsTable)
        .where(eq(adminAccessRequestsTable.status, "pending"));

      const total = Number(countResult[0]?.count || 0);
      const requests = await query;

      return {
        requests,
        total,
        limit: filters.limit,
        offset: filters.offset,
      };
    },
    "findPendingAccessRequests"
  );
}

// ============================================================================
// DATA AGGREGATION QUERIES
// ============================================================================

/**
 * Get job statistics for dashboard
 */
export async function getJobStatistics() {
  return safeDatabaseOperation(
    async () => {
      const stats = await db
        .select({
          totalJobs: sql`count(*)`.mapWith(Number),
          publishedJobs: sql`count(case when ${jobsTable.isPublished} = true then 1 end)`.mapWith(Number),
          totalApplications: sql`count(${applicationsTable.id})`.mapWith(Number),
        })
        .from(jobsTable)
        .leftJoin(applicationsTable, eq(jobsTable.id, applicationsTable.jobId));

      return stats[0] || { totalJobs: 0, publishedJobs: 0, totalApplications: 0 };
    },
    "getJobStatistics"
  );
}

/**
 * Get employer statistics
 */
export async function getEmployerStatistics(employerId: string) {
  return safeDatabaseOperation(
    async () => {
      const result = await db
        .select({
          totalJobs: sql`count(distinct ${jobsTable.id})`.mapWith(Number),
          totalApplications: sql`count(distinct ${applicationsTable.id})`.mapWith(Number),
          hiredApplicants: sql`count(distinct case when ${applicationsTable.status} = 'hired' then ${applicationsTable.id} end)`.mapWith(Number),
        })
        .from(jobsTable)
        .leftJoin(applicationsTable, eq(jobsTable.id, applicationsTable.jobId))
        .where(eq(jobsTable.employerId, employerId));

      return result[0] || { totalJobs: 0, totalApplications: 0, hiredApplicants: 0 };
    },
    `getEmployerStatistics(${employerId})`
  );
}

// ============================================================================
// EMPLOYER JOB QUERIES
// ============================================================================

/**
/**
 * List jobs for employer with filters
 * Uses inline query building to avoid Drizzle ORM type issues with conditional chaining
 */
export async function listEmployerJobs(
  employerId: string,
  filters?: {
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }
) {
  return safeDatabaseOperation(
    async () => {
      const whereConditions: SQL<unknown>[] = [eq(jobsTable.employerId, employerId)];

      if (filters?.status) {
        whereConditions.push(
          eq(jobsTable.status, filters.status as "draft" | "pending" | "active" | "closed" | "archived")
        );
      }

      if (filters?.search) {
        whereConditions.push(ilike(jobsTable.positionTitle, `%${filters.search}%`));
      }

      // Build the full query inline with all clauses in one chain
      const query = db
        .select({
          id: jobsTable.id,
          positionTitle: jobsTable.positionTitle,
          description: jobsTable.description,
          location: jobsTable.location,
          employmentType: jobsTable.employmentType,
          salaryMin: jobsTable.salaryMin,
          salaryMax: jobsTable.salaryMax,
          status: jobsTable.status,
          isPublished: jobsTable.isPublished,
          archived: jobsTable.archived,
          createdAt: jobsTable.createdAt,
          updatedAt: jobsTable.updatedAt,
        })
        .from(jobsTable)
        .where(and(...whereConditions))
        .orderBy(desc(jobsTable.createdAt))
        .limit(filters?.limit || 100)
        .offset(filters?.offset || 0);

      return await query;
    },
    `listEmployerJobs(${employerId})`
  );
}

/**
 * Get employer job by ID (owner check)
 */
export async function getEmployerJobById(employerId: string, jobId: string) {
  return safeDatabaseOperation(
    async () => {
      const [job] = await db
        .select()
        .from(jobsTable)
        .where(
          and(
            eq(jobsTable.id, jobId),
            eq(jobsTable.employerId, employerId)
          )
        )
        .limit(1);
      return job || null;
    },
    `getEmployerJobById(${employerId}, ${jobId})`
  );
}

/**
/**
 * Update job status (published/archived)
 */
export async function updateJobStatus(
  employerId: string,
  jobId: string,
  updates: {
    isPublished?: boolean;
    archived?: boolean;
    status?: "pending" | "draft" | "active" | "closed" | "archived";
  }
) {
  return safeDatabaseOperation(
    async () => {
      const [updated] = await db
        .update(jobsTable)
        .set({
          isPublished: updates.isPublished,
          archived: updates.archived,
          status: updates.status,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(jobsTable.id, jobId),
            eq(jobsTable.employerId, employerId)
          )
        )
        .returning({ id: jobsTable.id });
      return updated || null;
    },
    `updateJobStatus(${employerId}, ${jobId})`
  );
}

/**
 * Update employer-owned job workflow status with visibility side effects.
 */
export async function updateEmployerJobWorkflowStatus(
  employerId: string,
  jobId: string,
  status: "draft" | "pending" | "active" | "closed" | "archived"
) {
  return safeDatabaseOperation(
    async () => {
      const [updated] = await db
        .update(jobsTable)
        .set({
          status,
          archived: status === "archived",
          isPublished: status === "active",
          publishedAt: status === "active" ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(and(eq(jobsTable.id, jobId), eq(jobsTable.employerId, employerId)))
        .returning({
          id: jobsTable.id,
          status: jobsTable.status,
          isPublished: jobsTable.isPublished,
          archived: jobsTable.archived,
        });

      return updated || null;
    },
    `updateEmployerJobWorkflowStatus(${employerId}, ${jobId})`
  );
}

/**
 * Delete job (soft delete by archiving)
 */
export async function deleteEmployerJob(employerId: string, jobId: string) {
  return safeDatabaseOperation(
    async () => {
      const [updated] = await db
        .update(jobsTable)
        .set({
          archived: true,
          isPublished: false,
          status: "archived",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(jobsTable.id, jobId),
            eq(jobsTable.employerId, employerId)
          )
        )
        .returning({ id: jobsTable.id });

      if (!updated) {
        return {
          success: false,
          data: null,
          error: { message: "Job not found" },
        };
      }

      return { success: true, data: updated };
    },
    `deleteEmployerJob(${employerId}, ${jobId})`
  );
}

// ============================================================================
// EMPLOYER APPLICATION QUERIES
// ============================================================================

/**
 * List applications for a specific employer-owned job.
 */
export async function listEmployerJobApplications(employerId: string, jobId: string) {
  return safeDatabaseOperation(
    async () => {
      const [job] = await db
        .select({
          id: jobsTable.id,
          positionTitle: jobsTable.positionTitle,
        })
        .from(jobsTable)
        .where(and(eq(jobsTable.id, jobId), eq(jobsTable.employerId, employerId)))
        .limit(1);

      if (!job) {
        return null;
      }

      const applications = await db
        .select({
          id: applicationsTable.id,
          applicantId: applicationsTable.applicantId,
          applicantName: applicationsTable.applicantName,
          applicantEmail: applicationsTable.applicantEmail,
          status: applicationsTable.status,
          submittedAt: applicationsTable.submittedAt,
          coverLetter: applicationsTable.coverLetter,
          resumeUrl: applicationsTable.resumeUrl,
          feedback: applicationsTable.feedback,
          userName: usersTable.name,
          userEmail: usersTable.email,
          userPhone: usersTable.phone,
          userCity: usersTable.city,
          userProvince: usersTable.province,
          userCurrentOccupation: usersTable.currentOccupation,
          userEducationLevel: usersTable.educationLevel,
          userSkills: usersTable.skills,
          userPreferredLocations: usersTable.preferredLocations,
        })
        .from(applicationsTable)
        .leftJoin(usersTable, eq(usersTable.id, applicationsTable.applicantId))
        .where(
          and(
            eq(applicationsTable.jobId, jobId),
            eq(applicationsTable.employerId, employerId)
          )
        )
        .orderBy(desc(applicationsTable.submittedAt));

      return { job, applications };
    },
    `listEmployerJobApplications(${employerId}, ${jobId})`
  );
}

/**
 * Get a single application owned by an employer.
 */
export async function getEmployerApplicationById(
  employerId: string,
  applicationId: string
) {
  return safeDatabaseOperation(
    async () => {
      const [application] = await db
        .select({
          id: applicationsTable.id,
          applicantId: applicationsTable.applicantId,
        })
        .from(applicationsTable)
        .where(
          and(
            eq(applicationsTable.id, applicationId),
            eq(applicationsTable.employerId, employerId)
          )
        )
        .limit(1);

      return application || null;
    },
    `getEmployerApplicationById(${employerId}, ${applicationId})`
  );
}

/**
 * Update an employer-owned application status and feedback.
 */
export async function updateEmployerApplicationStatus(
  employerId: string,
  applicationId: string,
  updates: {
    status:
      | "pending"
      | "reviewed"
      | "shortlisted"
      | "interview"
      | "hired"
      | "rejected"
      | "withdrawn";
    feedback?: string;
  }
) {
  return safeDatabaseOperation(
    async () => {
      const [updated] = await db
        .update(applicationsTable)
        .set({
          status: updates.status,
          feedback: updates.feedback?.trim() || null,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(applicationsTable.id, applicationId),
            eq(applicationsTable.employerId, employerId)
          )
        )
        .returning({
          id: applicationsTable.id,
          status: applicationsTable.status,
          applicantId: applicationsTable.applicantId,
          reviewedAt: applicationsTable.reviewedAt,
        });

      return updated || null;
    },
    `updateEmployerApplicationStatus(${employerId}, ${applicationId})`
  );
}

/**
 * Fetch employer profile by employer ID.
 */
export async function getEmployerProfileById(employerId: string) {
  return safeDatabaseOperation(
    async () => {
      const [profile] = await db
        .select({
          id: employersTable.id,
          email: employersTable.email,
          contactPerson: employersTable.contactPerson,
          contactPhone: employersTable.contactPhone,
          establishmentName: employersTable.establishmentName,
          industry: employersTable.industry,
          companyType: employersTable.companyType,
          companySize: employersTable.companySize,
          businessNature: employersTable.businessNature,
          address: employersTable.address,
          city: employersTable.city,
          province: employersTable.province,
          zipCode: employersTable.zipCode,
          website: employersTable.website,
          description: employersTable.description,
          yearsInOperation: employersTable.yearsInOperation,
          logoUrl: employersTable.logoUrl,
          srsFormFile: employersTable.srsFormFile,
          businessPermitFile: employersTable.businessPermitFile,
          bir2303File: employersTable.bir2303File,
          doleCertificationFile: employersTable.doleCertificationFile,
          companyProfileFile: employersTable.companyProfileFile,
          accountStatus: employersTable.accountStatus,
        })
        .from(employersTable)
        .where(eq(employersTable.id, employerId))
        .limit(1);

      return profile || null;
    },
    `getEmployerProfileById(${employerId})`
  );
}

/**
 * Update employer profile by employer ID.
 */
export async function updateEmployerProfileById(
  employerId: string,
  updates: Record<string, unknown>
) {
  return safeDatabaseOperation(
    async () => {
      const [updated] = await db
        .update(employersTable)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(employersTable.id, employerId))
        .returning({
          id: employersTable.id,
          email: employersTable.email,
          contactPerson: employersTable.contactPerson,
          contactPhone: employersTable.contactPhone,
          establishmentName: employersTable.establishmentName,
          industry: employersTable.industry,
          companyType: employersTable.companyType,
          companySize: employersTable.companySize,
          businessNature: employersTable.businessNature,
          address: employersTable.address,
          city: employersTable.city,
          province: employersTable.province,
          zipCode: employersTable.zipCode,
          website: employersTable.website,
          description: employersTable.description,
          yearsInOperation: employersTable.yearsInOperation,
          logoUrl: employersTable.logoUrl,
          srsFormFile: employersTable.srsFormFile,
          businessPermitFile: employersTable.businessPermitFile,
          bir2303File: employersTable.bir2303File,
          doleCertificationFile: employersTable.doleCertificationFile,
          companyProfileFile: employersTable.companyProfileFile,
          accountStatus: employersTable.accountStatus,
        });

      return updated || null;
    },
    `updateEmployerProfileById(${employerId})`
  );
}

/**
 * Get employer dashboard summary counters.
 */
export async function getEmployerSummary(employerId: string) {
  return safeDatabaseOperation(
    async () => {
      const [jobsCount, activeJobsCount, applicationsCount, pendingApplicationsCount] =
        await Promise.all([
          db
            .select({ count: sql<number>`count(*)` })
            .from(jobsTable)
            .where(eq(jobsTable.employerId, employerId))
            .then((rows) => Number(rows[0]?.count ?? 0)),
          db
            .select({ count: sql<number>`count(*)` })
            .from(jobsTable)
            .where(and(eq(jobsTable.employerId, employerId), eq(jobsTable.status, "active")))
            .then((rows) => Number(rows[0]?.count ?? 0)),
          db
            .select({ count: sql<number>`count(*)` })
            .from(applicationsTable)
            .where(eq(applicationsTable.employerId, employerId))
            .then((rows) => Number(rows[0]?.count ?? 0)),
          db
            .select({ count: sql<number>`count(*)` })
            .from(applicationsTable)
            .where(
              and(
                eq(applicationsTable.employerId, employerId),
                eq(applicationsTable.status, "pending")
              )
            )
            .then((rows) => Number(rows[0]?.count ?? 0)),
        ]);

      return {
        jobsCount,
        activeJobsCount,
        applicationsCount,
        pendingApplicationsCount,
      };
    },
    `getEmployerSummary(${employerId})`
  );
}
