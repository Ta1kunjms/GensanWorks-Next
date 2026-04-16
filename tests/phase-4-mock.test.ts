/**
 * Phase 4 Mock API Tests (Employer Workflows)
 * Database-independent testing of employer job and application management
 */

import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import {
  getEmployerJobsMock,
  createEmployerJobMock,
  updateEmployerJobMock,
  publishEmployerJobMock,
  deleteEmployerJobMock,
  getEmployerApplicationsMock,
  updateApplicationStatusMock,
  getApplicationDetailMock,
  getEmployerProfileMock,
  updateEmployerProfileMock,
  getEmployerSummaryMock,
  resetEmployerMocks,
  mockEmployerJobs,
  mockEmployerApplications,
} from '@/lib/phase4-mock';

describe('Phase 4 Mock API Tests', () => {
  beforeEach(() => {
    resetEmployerMocks();
  });

  describe('Job Management', () => {
    it('GET /api/employer/jobs/mock returns jobs for employer', async () => {
      const response = await getEmployerJobsMock('emp-001');
      const json = await response.json();
      assert.equal(json.success, true);
      assert(json.data.length > 0);
      assert(json.count > 0);
    });

    it('GET /api/employer/jobs/mock returns empty for non-existent employer', async () => {
      const response = await getEmployerJobsMock('non-existent');
      const json = await response.json();
      assert.equal(json.success, true);
      assert.equal(json.data.length, 0);
    });

    it('POST /api/employer/jobs/mock creates new job posting', async () => {
      const jobData = {
        title: 'Test Job',
        description: 'Test description',
        requirements: ['TypeScript', 'React'],
        salary_min: 50000,
        salary_max: 70000,
        employment_type: 'Full-time',
        location: 'Manila',
      };

      const response = await createEmployerJobMock('emp-001', jobData);
      const json = await response.json();
      assert.equal(json.success, true);
      assert.equal(json.data.title, 'Test Job');
      assert.equal(json.data.status, 'draft');
    });

    it('PATCH /api/employer/jobs/[id]/mock updates draft job', async () => {
      const draftJob = mockEmployerJobs.find((j) => j.status === 'draft');
      if (!draftJob) return;

      const response = await updateEmployerJobMock(draftJob.id, {
        title: 'Updated Job Title',
      });
      const json = await response.json();
      assert.equal(json.success, true);
      assert.equal(json.data.title, 'Updated Job Title');
    });

    it('PATCH /api/employer/jobs/[id]/mock rejects update to published job', async () => {
      const publishedJob = mockEmployerJobs.find((j) => j.status === 'published');
      if (!publishedJob) return;

      const response = await updateEmployerJobMock(publishedJob.id, {
        title: 'Should fail',
      });
      const json = await response.json();
      assert.equal(json.success, false);
      assert(json.error.includes('published'));
    });

    it('PATCH /api/employer/jobs/[id]/publish/mock publishes draft job', async () => {
      const draftJob = mockEmployerJobs.find((j) => j.status === 'draft');
      if (!draftJob) return;

      const response = await publishEmployerJobMock(draftJob.id);
      const json = await response.json();
      assert.equal(json.success, true);
      assert.equal(json.data.status, 'published');
    });

    it('DELETE /api/employer/jobs/[id]/mock deletes job', async () => {
      const jobToDelete = mockEmployerJobs[0];
      if (!jobToDelete) return;
      const response = await deleteEmployerJobMock(jobToDelete.id);
      const json = await response.json();
      assert.equal(json.success, true);
      assert.equal(json.data.id, jobToDelete.id);
    });

    it('DELETE /api/employer/jobs/[id]/mock returns 404 for non-existent job', async () => {
      const response = await deleteEmployerJobMock('non-existent-job');
      const json = await response.json();
      assert.equal(json.success, false);
      assert(json.error.includes('not found'));
    });
  });

  describe('Application Management', () => {
    it('GET /api/employer/applications/mock returns applications', async () => {
      const response = await getEmployerApplicationsMock('emp-001');
      const json = await response.json();
      assert.equal(json.success, true);
      assert(json.data.length > 0);
    });

    it('GET /api/employer/applications/[id]/mock returns application detail', async () => {
      if (!mockEmployerApplications[0]) return;
      const appId = mockEmployerApplications[0].id;
      const response = await getApplicationDetailMock(appId);
      const json = await response.json();
      assert.equal(json.success, true);
      assert.equal(json.data.id, appId);
    });

    it('GET /api/employer/applications/[id]/mock returns 404 for non-existent app', async () => {
      const response = await getApplicationDetailMock('non-existent-app');
      const json = await response.json();
      assert.equal(json.success, false);
      assert(json.error.includes('not found'));
    });

    it('PATCH /api/employer/applications/[id]/mock updates status to shortlisted', async () => {
      if (!mockEmployerApplications[0]) return;
      const appId = mockEmployerApplications[0].id;
      const response = await updateApplicationStatusMock(appId, 'shortlisted');
      const json = await response.json();
      assert.equal(json.success, true);
      assert.equal(json.data.status, 'shortlisted');
    });

    it('PATCH /api/employer/applications/[id]/mock updates status to rejected', async () => {
      if (!mockEmployerApplications[0]) return;
      const appId = mockEmployerApplications[0].id;
      const response = await updateApplicationStatusMock(appId, 'rejected');
      const json = await response.json();
      assert.equal(json.success, true);
      assert.equal(json.data.status, 'rejected');
    });

    it('PATCH /api/employer/applications/[id]/mock updates status to offered', async () => {
      if (!mockEmployerApplications[0]) return;
      const appId = mockEmployerApplications[0].id;
      const response = await updateApplicationStatusMock(appId, 'offered');
      const json = await response.json();
      assert.equal(json.success, true);
      assert.equal(json.data.status, 'offered');
    });
  });

  describe('Employer Profile', () => {
    it('GET /api/employer/profile/mock returns profile', async () => {
      const response = await getEmployerProfileMock();
      const json = await response.json();
      assert.equal(json.success, true);
      assert(json.data.id.includes('emp'));
      assert(json.data.name);
    });

    it('PATCH /api/employer/profile/mock updates profile', async () => {
      const response = await updateEmployerProfileMock({
        phone: '+63-2-9999-9999',
        description: 'Updated description',
      });
      const json = await response.json();
      assert.equal(json.success, true);
      assert.equal(json.data.phone, '+63-2-9999-9999');
      assert.equal(json.data.description, 'Updated description');
    });
  });

  describe('Employer Summary Analytics', () => {
    it('GET /api/employer/summary/mock returns analytics', async () => {
      const response = await getEmployerSummaryMock('emp-001');
      const json = await response.json();
      assert.equal(json.success, true);
      assert(json.data.jobs_posted > 0);
      assert(json.data.total_applications > 0);
      assert(json.data.hire_rate >= 0);
    });

    it('GET /api/employer/summary/mock counts correct applications', async () => {
      const response = await getEmployerSummaryMock('emp-001');
      const json = await response.json();
      const shortlisted = mockEmployerApplications.filter(
        (a) => a.employer_id === 'emp-001' && a.status === 'shortlisted'
      ).length;
      assert.equal(json.data.shortlisted_count, shortlisted);
    });
  });
});
