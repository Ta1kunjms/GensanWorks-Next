/**
 * GET /api/employer/jobs/mock
 * Mock employer jobs list (test endpoint when database unavailable)
 */

import { getEmployerJobsMock } from '@/lib/phase4-mock';

export async function GET() {
  // In production, extract from auth session
  // For mock, use test employer ID
  const employerId = 'emp-001';
  return getEmployerJobsMock(employerId);
}
