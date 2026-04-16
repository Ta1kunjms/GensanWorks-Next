/**
 * POST /api/employer/jobs/mock
 * Mock create job posting endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { createEmployerJobMock } from '@/lib/phase4-mock';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate required fields
    const { title, description, requirements, salary_min, salary_max, employment_type, location } = body;
    if (!title || !description || !requirements) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // In production, extract from auth session
    const employerId = 'emp-001';

    return createEmployerJobMock(employerId, {
      title,
      description,
      requirements,
      salary_min: salary_min || 0,
      salary_max: salary_max || 0,
      employment_type: employment_type || 'Full-time',
      location: location || '',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to create job' },
      { status: 500 }
    );
  }
}
