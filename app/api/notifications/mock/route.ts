/**
 * GET/POST /api/notifications/mock
 * Mock notifications endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getNotificationsMock,
  createNotificationMock,
  markAllNotificationsAsReadMock,
} from '@/lib/phase5-mock';

export async function GET(): Promise<Response> {
  // In production, extract from auth session
  const userId = 'user-001';
  return getNotificationsMock(userId);
}

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const body = await req.json();
    const { type, title, message, data } = body;

    if (!type || !title || !message) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // In production, extract from auth session or use admin context
    const userId = 'user-001';

    return createNotificationMock(userId, type, title, message, data || {});
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}

export async function PATCH(): Promise<Response> {
  // Mark all notifications as read
  const userId = 'user-001';
  return markAllNotificationsAsReadMock(userId);
}
