/**
 * GET /api/jobs/[id]/mock
 * Mock job detail endpoint (test endpoint when database unavailable)
 */

import { NextRequest } from 'next/server';
import { getJobDetailMock } from '@/lib/phase3-mock';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return getJobDetailMock(id);
}
