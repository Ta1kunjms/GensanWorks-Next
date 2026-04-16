/**
 * POST /api/jobs/[id]/apply/mock
 * Mock job application endpoint (test endpoint when database unavailable)
 */

import { NextRequest, NextResponse } from 'next/server';
import { applyJobMock } from '@/lib/phase3-mock';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params;
  const body = await request.json().catch(() => ({}));
  const userId = body.userId || 'test-user-123';
  const coverLetter = body.coverLetter || '';

  // Check auth
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return applyJobMock(jobId, userId, coverLetter);
}
