/**
 * GET /api/jobseeker/applications/mock
 * Mock applications list endpoint (test endpoint when database unavailable)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getApplicationsMock } from '@/lib/phase3-mock';

export async function GET(request: NextRequest) {
  // Extract user ID from auth header (in test, use placeholder)
  const userId = 'test-user-123';
  return getApplicationsMock(userId);
}
