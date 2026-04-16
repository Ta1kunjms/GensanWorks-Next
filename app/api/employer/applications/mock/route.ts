/**
 * GET /api/employer/applications/mock
 * Mock applications list for employer
 */

import { getEmployerApplicationsMock } from '@/lib/phase4-mock';

export async function GET() {
  // In production, extract from auth session
  const employerId = 'emp-001';
  return getEmployerApplicationsMock(employerId);
}
