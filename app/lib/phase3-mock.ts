/**
 * Phase 3 Mock Server for Testing
 * 
 * Provides a complete mock implementation of Phase 3 endpoints
 * This allows Phase 3 validation to proceed without database
 */

import { NextRequest, NextResponse } from 'next/server';

// Mock data
const mockJobs = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    title: 'Senior Software Engineer',
    description: 'Build scalable systems with Next.js and React',
    requirements: ['TypeScript', 'React', 'Node.js'],
    salary_min: 80000,
    salary_max: 120000,
    employment_type: 'Full-time',
    location: 'Manila',
    employer_id: '550e8400-e29b-41d4-a716-446655440101',
    status: 'published',
    created_at: new Date('2026-04-10'),
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    title: 'Full Stack Developer',
    description: 'TypeScript, React, Node.js experience required',
    requirements: ['TypeScript', 'React', 'Node.js', 'PostgreSQL'],
    salary_min: 60000,
    salary_max: 90000,
    employment_type: 'Full-time',
    location: 'Cebu',
    employer_id: '550e8400-e29b-41d4-a716-446655440101',
    status: 'published',
    created_at: new Date('2026-04-08'),
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    title: 'Data Scientist',
    description: 'Machine learning, Python, data analysis',
    requirements: ['Python', 'ML', 'SQL', 'Statistics'],
    salary_min: 70000,
    salary_max: 110000,
    employment_type: 'Full-time',
    location: 'Manila',
    employer_id: '550e8400-e29b-41d4-a716-446655440102',
    status: 'published',
    created_at: new Date('2026-04-05'),
  },
];

const mockEmployers = {
  '550e8400-e29b-41d4-a716-446655440101': {
    id: '550e8400-e29b-41d4-a716-446655440101',
    name: 'Tech Corp',
    email: 'hiring@techcorp.com',
  },
  '550e8400-e29b-41d4-a716-446655440102': {
    id: '550e8400-e29b-41d4-a716-446655440102',
    name: 'Data Systems Inc',
    email: 'hr@datasystems.com',
  },
};

interface MockApplication {
  id: string;
  job_id: string;
  jobseeker_id: string;
  status: string;
  created_at: Date;
}

const mockApplications: MockApplication[] = [];

/**
 * GET /api/jobs/mock
 * Returns list of jobs (for Phase 3 testing without database)
 */
export async function getJobsMock(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
  const offset = parseInt(searchParams.get('offset') || '0');
  const search = searchParams.get('search')?.toLowerCase() || '';

  let filtered = mockJobs;

  // Filter by search
  if (search) {
    filtered = filtered.filter(
      (j) =>
        j.title.toLowerCase().includes(search) ||
        j.description.toLowerCase().includes(search)
    );
  }

  // Paginate
  const total = filtered.length;
  const data = filtered.slice(offset, offset + limit);

  return NextResponse.json({
    data,
    pagination: { limit, offset, total },
  });
}

/**
 * GET /api/jobs/[id]/mock
 * Returns job detail (for Phase 3 testing without database)
 */
export async function getJobDetailMock(jobId: string) {
  const job = mockJobs.find((j) => j.id === jobId);

  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  const employer = mockEmployers[job.employer_id as keyof typeof mockEmployers];

  return NextResponse.json({
    ...job,
    employer,
  });
}

/**
 * POST /api/jobs/[id]/apply/mock
 * Mock application submission (for Phase 3 testing without database)
 */
export async function applyJobMock(
  jobId: string,
  userId: string,
  coverLetter: string
) {
  const job = mockJobs.find((j) => j.id === jobId);

  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  // Create application
  const application = {
    id: `app-${Date.now()}`,
    job_id: jobId,
    jobseeker_id: userId,
    cover_letter: coverLetter,
    status: 'applied',
    created_at: new Date(),
  };

  mockApplications.push(application);

  return NextResponse.json(
    {
      id: application.id,
      job_id: application.job_id,
      jobseeker_id: application.jobseeker_id,
      status: application.status,
      created_at: application.created_at,
    },
    { status: 201 }
  );
}

/**
 * GET /api/jobseeker/applications/mock
 * Get user's applications (for Phase 3 testing without database)
 */
export async function getApplicationsMock(userId: string) {
  const userApps = mockApplications.filter((a) => a.jobseeker_id === userId);

  return NextResponse.json({
    data: userApps.map((app) => ({
      ...app,
      job: mockJobs.find((j) => j.id === app.job_id),
    })),
  });
}
