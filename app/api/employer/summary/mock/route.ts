/**
 * GET /api/employer/summary/mock
 * Mock employer analytics summary endpoint
 */

import { getEmployerSummaryMock } from '@/lib/phase4-mock';

export async function GET() {
  // In production, extract from auth session
  const employerId = 'emp-001';
  return getEmployerSummaryMock(employerId);
}
