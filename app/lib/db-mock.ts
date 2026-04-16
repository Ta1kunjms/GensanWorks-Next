/**
 * Database Mock for Phase 3-9 Testing
 * 
 * This provides in-memory mock data when Supabase is unreachable.
 * Allows Phase 3-9 testing to proceed while actual database is being fixed.
 * 
 * Usage: npm run dev (automatically uses mocks if DB unreachable)
 */

// Mock data
const mockJobs = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    title: 'Senior Software Engineer',
    description: 'Build scalable systems with Next.js and React',
    employer_id: '550e8400-e29b-41d4-a716-446655440101',
    status: 'published',
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    title: 'Full Stack Developer',
    description: 'TypeScript, React, Node.js experience required',
    employer_id: '550e8400-e29b-41d4-a716-446655440101',
    status: 'published',
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    title: 'Data Scientist',
    description: 'Machine learning, Python, data analysis',
    employer_id: '550e8400-e29b-41d4-a716-446655440102',
    status: 'published',
    created_at: new Date(),
    updated_at: new Date(),
  },
];

const mockApplications = [
  {
    id: '550e8400-e29b-41d4-a716-446655440201',
    job_id: '550e8400-e29b-41d4-a716-446655440001',
    jobseeker_id: '550e8400-e29b-41d4-a716-446655440301',
    status: 'applied',
    created_at: new Date(),
  },
];

const mockUsers = [
  {
    id: '550e8400-e29b-41d4-a716-446655440301',
    email: 'jobseeker@example.com',
    name: 'John Jobseeker',
    role: 'jobseeker',
    created_at: new Date(),
  },
];

const mockEmployers = [
  {
    id: '550e8400-e29b-41d4-a716-446655440101',
    name: 'Tech Corp',
    email: 'hiring@techcorp.com',
    created_at: new Date(),
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440102',
    name: 'Data Systems Inc',
    email: 'hr@datasystems.com',
    created_at: new Date(),
  },
];

// In-memory storage
let jobsStorage = [...mockJobs];
let applicationsStorage = [...mockApplications];
let usersStorage = [...mockUsers];
let employersStorage = [...mockEmployers];

// Query options interface
interface QueryOptions {
  limit?: number;
  offset?: number;
  where?: Record<string, unknown>;
}

// Mock adapter
export class MockDB {
  query = {
    jobs: {
      findMany: async (opts?: QueryOptions) => {
        let filtered = [...jobsStorage];
        if (opts?.limit) {
          filtered = filtered.slice(0, opts.limit);
        }
        if (opts?.offset) {
          filtered = filtered.slice(opts.offset);
        }
        return filtered;
      },
      findFirst: async (opts?: QueryOptions) => {
        if (opts?.where?.id) {
          return jobsStorage.find((j) => j.id === (opts.where?.id as string));
        }
        return jobsStorage[0];
      },
    },
    applications: {
      findMany: async (opts?: QueryOptions) => {
        let filtered = [...applicationsStorage];
        if (opts?.where?.jobseeker_id) {
          filtered = filtered.filter(
            (a) => a.jobseeker_id === (opts.where?.jobseeker_id as string)
          );
        }
        return filtered;
      },
      findFirst: async (opts?: QueryOptions) => {
        if (opts?.where?.id) {
          return applicationsStorage.find((a) => a.id === (opts.where?.id as string));
        }
        return applicationsStorage[0];
      },
    },
    users: {
      findFirst: async (opts?: QueryOptions) => {
        if (opts?.where?.id) {
          return usersStorage.find((u) => u.id === (opts.where?.id as string));
        }
        return usersStorage[0];
      },
    },
    employers: {
      findFirst: async (opts?: QueryOptions) => {
        if (opts?.where?.id) {
          return employersStorage.find((e) => e.id === (opts.where?.id as string));
        }
        return employersStorage[0];
      },
    },
  };

  insert = (table: string) => ({
    values: async (data: Record<string, unknown>) => {
      if (table === 'jobs') {
        jobsStorage.push(data as typeof mockJobs[0]);
        return [data];
      }
      if (table === 'applications') {
        applicationsStorage.push(data as typeof mockApplications[0]);
        return [data];
      }
      return [];
    },
  });

  // Helpers
  reset = () => {
    jobsStorage = [...mockJobs];
    applicationsStorage = [...mockApplications];
    usersStorage = [...mockUsers];
    employersStorage = [...mockEmployers];
  };

  addJob = (job: typeof mockJobs[0]) => {
    jobsStorage.push(job);
  };

  addApplication = (app: typeof mockApplications[0]) => {
    applicationsStorage.push(app);
  };
}

export const mockDb = new MockDB();
