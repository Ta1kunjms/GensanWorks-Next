/**
 * POST/GET /api/messages/mock
 * Mock messaging endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendMessageMock, getMessagesMock } from '@/lib/phase5-mock';

export async function GET(): Promise<Response> {
  // In production, extract from auth session
  const userId = 'user-001';
  return getMessagesMock(userId);
}

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const body = await req.json();
    const { recipient_id, content } = body;

    if (!recipient_id || !content) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // In production, extract from auth session
    const senderId = 'user-001';

    return sendMessageMock(senderId, recipient_id, content);
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
