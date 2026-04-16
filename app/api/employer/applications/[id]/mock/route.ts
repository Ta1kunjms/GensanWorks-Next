/**
 * GET/PATCH /api/employer/applications/[id]/mock
 * Mock application detail and status update
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getApplicationDetailMock,
  updateApplicationStatusMock,
} from '@/lib/phase4-mock';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: appId } = await params;
  return getApplicationDetailMock(appId);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: appId } = await params;
  try {
    const body = await req.json();
    const { status } = body;

    if (!['shortlisted', 'rejected', 'offered', 'hired'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status' },
        { status: 400 }
      );
    }

    return updateApplicationStatusMock(appId, status);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to update application' },
      { status: 500 }
    );
  }
}
