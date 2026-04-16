/**
 * GET/PATCH /api/employer/profile/mock
 * Mock employer profile endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getEmployerProfileMock,
  updateEmployerProfileMock,
} from '@/lib/phase4-mock';

export async function GET() {
  return getEmployerProfileMock();
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    return updateEmployerProfileMock(body);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
