/**
 * Phase 4 Mock Server for Employer Workflows
 * 
 * Provides complete mock implementation of employer job posting,
 * application management, and referral tracking
 */

import { NextResponse } from 'next/server';

// Mock data
export const mockEmployerJobs = [
  {
    id: 'job-001',
    employer_id: 'emp-001',
    title: 'Senior Software Engineer',
    description: 'Build scalable systems with Next.js and React',
    requirements: ['TypeScript', 'React', 'Node.js', '5+ years experience'],
    salary_min: 80000,
    salary_max: 120000,
    employment_type: 'Full-time',
    location: 'Manila',
    status: 'published',
    created_at: new Date('2026-03-15'),
    updated_at: new Date('2026-03-15'),
  },
  {
    id: 'job-002',
    employer_id: 'emp-001',
    title: 'DevOps Engineer',
    description: 'Manage cloud infrastructure and deployments',
    requirements: ['Kubernetes', 'Docker', 'AWS', '3+ years experience'],
    salary_min: 70000,
    salary_max: 100000,
    employment_type: 'Full-time',
    location: 'Makati',
    status: 'published',
    created_at: new Date('2026-03-10'),
    updated_at: new Date('2026-03-10'),
  },
  {
    id: 'job-003',
    employer_id: 'emp-001',
    title: 'Junior React Developer',
    description: 'Build web interfaces for our products',
    requirements: ['React', 'JavaScript', 'CSS'],
    salary_min: 40000,
    salary_max: 60000,
    employment_type: 'Full-time',
    location: 'BGC',
    status: 'draft',
    created_at: new Date('2026-03-20'),
    updated_at: new Date('2026-03-20'),
  },
];

export const mockEmployerApplications = [
  {
    id: 'app-001',
    job_id: 'job-001',
    jobseeker_id: 'job-seeker-001',
    employer_id: 'emp-001',
    status: 'applied',
    created_at: new Date('2026-03-18'),
    updated_at: new Date('2026-03-18'),
    resume_url: 'https://example.com/resume1.pdf',
  },
  {
    id: 'app-002',
    job_id: 'job-001',
    jobseeker_id: 'job-seeker-002',
    employer_id: 'emp-001',
    status: 'shortlisted',
    created_at: new Date('2026-03-17'),
    updated_at: new Date('2026-03-19'),
    resume_url: 'https://example.com/resume2.pdf',
  },
  {
    id: 'app-003',
    job_id: 'job-002',
    jobseeker_id: 'job-seeker-003',
    employer_id: 'emp-001',
    status: 'offered',
    created_at: new Date('2026-03-16'),
    updated_at: new Date('2026-03-18'),
    resume_url: 'https://example.com/resume3.pdf',
  },
];

export const mockEmployerProfile = {
  id: 'emp-001',
  name: 'Tech Corp',
  email: 'hiring@techcorp.com',
  phone: '+63-2-1234-5678',
  website: 'www.techcorp.com',
  description: 'Leading technology company in Southeast Asia',
  industry: 'Technology',
  company_size: '100-500',
  location: 'Manila',
  created_at: new Date('2025-01-01'),
  updated_at: new Date('2026-03-20'),
};

export const mockEmployerSummary = {
  jobs_posted: 2,
  jobs_active: 2,
  total_applications: 3,
  shortlisted_count: 1,
  offered_count: 1,
  hired_count: 0,
  hire_rate: 0,
  referral_conversions: 0,
};

// Storage for mock mutations
let jobsStorage = [...mockEmployerJobs];
let applicationsStorage = [...mockEmployerApplications];
let profileStorage = { ...mockEmployerProfile };

/**
 * GET /api/employer/jobs
 * Returns list of employer's jobs (draft + published)
 */
export async function getEmployerJobsMock(employerId: string) {
  const filtered = jobsStorage.filter((j) => j.employer_id === employerId);
  return NextResponse.json({
    success: true,
    data: filtered,
    count: filtered.length,
  });
}

/**
 * POST /api/employer/jobs
 * Create new job posting
 */
export async function createEmployerJobMock(
  employerId: string,
  jobData: {
    title: string;
    description: string;
    requirements: string[];
    salary_min: number;
    salary_max: number;
    employment_type: string;
    location: string;
  }
) {
  const newJob = {
    id: `job-${Date.now()}`,
    employer_id: employerId,
    ...jobData,
    status: 'draft',
    created_at: new Date(),
    updated_at: new Date(),
  };
  jobsStorage.push(newJob);
  return NextResponse.json({
    success: true,
    data: newJob,
  });
}

/**
 * PATCH /api/employer/jobs/[id]
 * Update job posting (only if draft)
 */
export async function updateEmployerJobMock(
  jobId: string,
  updates: Partial<typeof mockEmployerJobs[0]>
) {
  const index = jobsStorage.findIndex((j) => j.id === jobId);
  if (index === -1) {
    return NextResponse.json(
      { success: false, error: 'Job not found' },
      { status: 404 }
    );
  }

  const job = jobsStorage[index];
  if (job && job.status === 'published') {
    return NextResponse.json(
      { success: false, error: 'Cannot edit published job' },
      { status: 400 }
    );
  }

  jobsStorage[index] = {
    ...jobsStorage[index],
    ...updates,
    updated_at: new Date(),
  } as typeof mockEmployerJobs[0];

  return NextResponse.json({
    success: true,
    data: jobsStorage[index],
  });
}

/**
 * PATCH /api/employer/jobs/[id]/publish
 * Publish job (move from draft to published)
 */
export async function publishEmployerJobMock(jobId: string) {
  const index = jobsStorage.findIndex((j) => j.id === jobId);
  if (index === -1) {
    return NextResponse.json(
      { success: false, error: 'Job not found' },
      { status: 404 }
    );
  }

  jobsStorage[index] = {
    ...jobsStorage[index],
    status: 'published',
    updated_at: new Date(),
  } as typeof mockEmployerJobs[0];

  return NextResponse.json({
    success: true,
    data: jobsStorage[index],
  });
}

/**
 * DELETE /api/employer/jobs/[id]
 * Archive/delete job
 */
export async function deleteEmployerJobMock(jobId: string) {
  const index = jobsStorage.findIndex((j) => j.id === jobId);
  if (index === -1) {
    return NextResponse.json(
      { success: false, error: 'Job not found' },
      { status: 404 }
    );
  }

  const deleted = jobsStorage.splice(index, 1)[0];
  return NextResponse.json({
    success: true,
    data: deleted,
  });
}

/**
 * GET /api/employer/applications
 * Returns applications for all employer's jobs
 */
export async function getEmployerApplicationsMock(employerId: string) {
  const filtered = applicationsStorage.filter(
    (a) => a.employer_id === employerId
  );
  return NextResponse.json({
    success: true,
    data: filtered,
    count: filtered.length,
  });
}

/**
 * PATCH /api/employer/applications/[id]
 * Update application status (applied, shortlisted, rejected, offered)
 */
export async function updateApplicationStatusMock(
  appId: string,
  status: 'shortlisted' | 'rejected' | 'offered'
) {
  const index = applicationsStorage.findIndex((a) => a.id === appId);
  if (index === -1) {
    return NextResponse.json(
      { success: false, error: 'Application not found' },
      { status: 404 }
    );
  }

  applicationsStorage[index] = {
    ...applicationsStorage[index],
    status,
    updated_at: new Date(),
  } as typeof mockEmployerApplications[0];

  return NextResponse.json({
    success: true,
    data: applicationsStorage[index],
  });
}

/**
 * GET /api/employer/applications/[id]
 * Get application detail
 */
export async function getApplicationDetailMock(appId: string) {
  const app = applicationsStorage.find((a) => a.id === appId);
  if (!app) {
    return NextResponse.json(
      { success: false, error: 'Application not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: app,
  });
}

/**
 * GET /api/employer/profile
 * Get employer profile
 */
export async function getEmployerProfileMock() {
  return NextResponse.json({
    success: true,
    data: profileStorage,
  });
}

/**
 * PATCH /api/employer/profile
 * Update employer profile
 */
export async function updateEmployerProfileMock(
  updates: Partial<typeof mockEmployerProfile>
) {
  profileStorage = {
    ...profileStorage,
    ...updates,
    updated_at: new Date(),
  };

  return NextResponse.json({
    success: true,
    data: profileStorage,
  });
}

/**
 * GET /api/employer/summary
 * Analytics: jobs posted, applications, hire rate
 */
export async function getEmployerSummaryMock(employerId: string) {
  const employerJobs = jobsStorage.filter((j) => j.employer_id === employerId);
  const employerApps = applicationsStorage.filter(
    (a) => a.employer_id === employerId
  );
  const hiredCount = employerApps.filter((a) => a.status === 'hired').length;

  return NextResponse.json({
    success: true,
    data: {
      jobs_posted: employerJobs.length,
      jobs_active: employerJobs.filter((j) => j.status === 'published').length,
      total_applications: employerApps.length,
      shortlisted_count: employerApps.filter((a) => a.status === 'shortlisted')
        .length,
      offered_count: employerApps.filter((a) => a.status === 'offered').length,
      hired_count: hiredCount,
      hire_rate:
        employerApps.length > 0
          ? Math.round((hiredCount / employerApps.length) * 100)
          : 0,
      referral_conversions: 0,
    },
  });
}

// Helper to reset mock data
export function resetEmployerMocks() {
  jobsStorage = [...mockEmployerJobs];
  applicationsStorage = [...mockEmployerApplications];
  profileStorage = { ...mockEmployerProfile };
}
