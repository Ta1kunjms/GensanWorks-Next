/**
 * GET /api/jobs/mock
 * Mock public job list (test endpoint when database unavailable)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getJobsMock } from '@/lib/phase3-mock';

export async function GET(request: NextRequest) {
  return getJobsMock(request);
}
