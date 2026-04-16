/**
 * PATCH/DELETE /api/notifications/[id]/mock
 * Mock individual notification endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  markNotificationAsReadMock,
  deleteNotificationMock,
} from '@/lib/phase5-mock';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id: notifId } = await params;
    const body = await req.json();
    const { action } = body;

    if (action === 'read') {
      return markNotificationAsReadMock(notifId);
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to update notification' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id: notifId } = await params;
  return deleteNotificationMock(notifId);
}
