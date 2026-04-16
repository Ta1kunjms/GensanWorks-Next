/**
 * Database Mock for Phase 3-9 Testing
 * 
 * This provides in-memory mock data when Supabase is unreachable.
 * Allows Phase 3-9 testing to proceed while actual database is being fixed.
 * 
 * Usage: npm run dev (automatically uses mocks if DB unreachable)
 */

import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../db/schema';

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

// Mock adapter
export class MockDB {
  query = {
    jobs: {
      findMany: async (opts?: any) => {
        let filtered = [...jobsStorage];
        if (opts?.limit) {
          filtered = filtered.slice(0, opts.limit);
        }
        if (opts?.offset) {
          filtered = filtered.slice(opts.offset);
        }
        return filtered;
      },
      findFirst: async (opts?: any) => {
        if (opts?.where?.id) {
          return jobsStorage.find((j) => j.id === opts.where.id);
        }
        return jobsStorage[0];
      },
    },
    applications: {
      findMany: async (opts?: any) => {
        let filtered = [...applicationsStorage];
        if (opts?.where?.jobseeker_id) {
          filtered = filtered.filter(
            (a) => a.jobseeker_id === opts.where.jobseeker_id
          );
        }
        return filtered;
      },
    },
    users: {
      findFirst: async (opts?: any) => {
        if (opts?.where?.id) {
          return usersStorage.find((u) => u.id === opts.where.id);
        }
        return usersStorage[0];
      },
    },
    employers: {
      findFirst: async (opts?: any) => {
        if (opts?.where?.id) {
          return employersStorage.find((e) => e.id === opts.where.id);
        }
        return employersStorage[0];
      },
    },
  };

  insert = (table: any) => ({
    values: async (data: any) => {
      if (table === 'jobs') {
        jobsStorage.push(data);
        return [data];
      }
      if (table === 'applications') {
        applicationsStorage.push(data);
        return [data];
      }
      return [];
    },
  });

  update = (table: any) => ({
    set: async (data: any) => ({
      where: async (condition: any) => {
        if (table === 'applications') {
          const idx = applicationsStorage.findIndex(
            (a) => a.id === condition.id
          );
          if (idx >= 0) {
            applicationsStorage[idx] = {
              ...applicationsStorage[idx],
              ...data,
            };
          }
        }
      },
    }),
  });

  delete = (table: any) => ({
    where: async (condition: any) => {
      if (table === 'jobs') {
        const idx = jobsStorage.findIndex((j) => j.id === condition.id);
        if (idx >= 0) {
          jobsStorage.splice(idx, 1);
        }
      }
    },
  });

  // Helpers
  reset = () => {
    jobsStorage = [...mockJobs];
    applicationsStorage = [...mockApplications];
    usersStorage = [...mockUsers];
    employersStorage = [...mockEmployers];
  };

  addJob = (job: any) => {
    jobsStorage.push(job);
  };

  addApplication = (app: any) => {
    applicationsStorage.push(app);
  };
}

export const mockDb = new MockDB();
