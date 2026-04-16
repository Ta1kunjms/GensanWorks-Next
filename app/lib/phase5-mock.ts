/**
 * Phase 5 Mock Server for Messaging & Notifications
 * 
 * Provides complete mock implementation of user messaging,
 * notification system, and real-time notification delivery
 */

import { NextResponse } from 'next/server';

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: Date;
  read_at: Date | null;
  thread_id: string;
}

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown>;
  read: boolean;
  created_at: Date;
}

// Mock data for messages
export const mockMessages: Message[] = [
  {
    id: 'msg-001',
    sender_id: 'user-001',
    recipient_id: 'user-002',
    content: 'Hi, I am interested in the Senior Developer role',
    created_at: new Date('2026-03-20T10:00:00'),
    read_at: null,
    thread_id: 'thread-001',
  },
  {
    id: 'msg-002',
    sender_id: 'user-002',
    recipient_id: 'user-001',
    content: 'Thanks for your interest! Can you tell me more about your experience?',
    created_at: new Date('2026-03-20T11:30:00'),
    read_at: new Date('2026-03-20T11:45:00'),
    thread_id: 'thread-001',
  },
  {
    id: 'msg-003',
    sender_id: 'user-001',
    recipient_id: 'user-002',
    content: 'I have 5+ years in full-stack development...',
    created_at: new Date('2026-03-20T12:00:00'),
    read_at: null,
    thread_id: 'thread-001',
  },
];

// Mock data for notifications
export const mockNotifications: Notification[] = [
  {
    id: 'notif-001',
    user_id: 'user-001',
    type: 'application_received',
    title: 'New Application',
    message: 'You received a new application for Senior Developer',
    data: { job_id: 'job-001', application_id: 'app-001' },
    read: false,
    created_at: new Date('2026-03-21T10:00:00'),
  },
  {
    id: 'notif-002',
    user_id: 'user-001',
    type: 'application_status_change',
    title: 'Application Status Changed',
    message: 'Your application status changed to shortlisted',
    data: { job_id: 'job-001', application_id: 'app-001', status: 'shortlisted' },
    read: true,
    created_at: new Date('2026-03-20T14:00:00'),
  },
  {
    id: 'notif-003',
    user_id: 'user-001',
    type: 'message_received',
    title: 'New Message',
    message: 'You have a new message from Tech Corp',
    data: { sender_id: 'user-002', message_id: 'msg-003' },
    read: false,
    created_at: new Date('2026-03-21T09:30:00'),
  },
  {
    id: 'notif-004',
    user_id: 'user-001',
    type: 'job_match',
    title: 'New Job Match',
    message: 'A new job matches your profile: Full Stack Developer',
    data: { job_id: 'job-002' },
    read: false,
    created_at: new Date('2026-03-21T08:00:00'),
  },
];

// In-memory storage
let messagesStorage: Message[] = [...mockMessages];
let notificationsStorage: Notification[] = [...mockNotifications];

/**
 * POST /api/messages
 * Send a new message
 */
export async function sendMessageMock(
  senderId: string,
  recipientId: string,
  content: string
) {
  const newMessage = {
    id: `msg-${Date.now()}`,
    sender_id: senderId,
    recipient_id: recipientId,
    content,
    created_at: new Date(),
    read_at: null,
    thread_id: `thread-${[senderId, recipientId].sort().join('-')}`,
  };

  messagesStorage.push(newMessage);

  return NextResponse.json({
    success: true,
    data: newMessage,
  });
}

/**
 * GET /api/messages
 * Get user's message threads
 */
export async function getMessagesMock(userId: string) {
  const userMessages = messagesStorage.filter(
    (m) => m.sender_id === userId || m.recipient_id === userId
  );

  // Group by thread
  const threads = userMessages.reduce(
    (acc, msg) => {
      const threadId = msg.thread_id;
      if (!acc[threadId]) {
        acc[threadId] = [];
      }
      const thread = acc[threadId];
      if (thread) {
        thread.push(msg);
      }
      return acc;
    },
    {} as Record<string, Message[]>
  );

  return NextResponse.json({
    success: true,
    data: Object.values(threads)
      .filter((thread) => thread.length > 0)
      .map((thread) => {
        const first = thread[0] as Message;
        return {
          thread_id: first.thread_id,
          last_message: thread[thread.length - 1],
          message_count: thread.length,
          unread_count: thread.filter((m) => m.read_at === null && m.recipient_id === userId)
            .length,
          messages: thread,
        };
      }),
  });
}

/**
 * POST /api/notifications
 * Create a new notification
 */
export async function createNotificationMock(
  userId: string,
  type: string,
  title: string,
  message: string,
  data: Record<string, unknown> = {}
) {
  const newNotification = {
    id: `notif-${Date.now()}`,
    user_id: userId,
    type,
    title,
    message,
    data,
    read: false,
    created_at: new Date(),
  };

  notificationsStorage.push(newNotification);

  return NextResponse.json({
    success: true,
    data: newNotification,
  });
}

/**
 * GET /api/notifications
 * Get user's notifications
 */
export async function getNotificationsMock(userId: string, limit = 50) {
  const userNotifications = notificationsStorage
    .filter((n) => n.user_id === userId)
    .sort((a, b) => Number(b.created_at) - Number(a.created_at))
    .slice(0, limit);

  const unreadCount = userNotifications.filter((n) => !n.read).length;

  return NextResponse.json({
    success: true,
    data: userNotifications,
    unread_count: unreadCount,
    total_count: userNotifications.length,
  });
}

/**
 * PATCH /api/notifications/[id]
 * Mark notification as read
 */
export async function markNotificationAsReadMock(notifId: string) {
  const index = notificationsStorage.findIndex((n) => n.id === notifId);
  if (index === -1) {
    return NextResponse.json(
      { success: false, error: 'Notification not found' },
      { status: 404 }
    );
  }

  const current = notificationsStorage[index];
  if (!current) {
    return NextResponse.json(
      { success: false, error: 'Notification not found' },
      { status: 404 }
    );
  }

  notificationsStorage[index] = {
    ...current,
    read: true,
  };

  return NextResponse.json({
    success: true,
    data: notificationsStorage[index],
  });
}

/**
 * PATCH /api/notifications/mark-all-read
 * Mark all notifications as read
 */
export async function markAllNotificationsAsReadMock(userId: string) {
  const unreadIndices = notificationsStorage
    .map((n, i) => (n.user_id === userId && !n.read ? i : -1))
    .filter((i) => i !== -1);

  unreadIndices.forEach((i) => {
    const current = notificationsStorage[i];
    if (current) {
      notificationsStorage[i] = {
        ...current,
        read: true,
      };
    }
  });

  return NextResponse.json({
    success: true,
    updated_count: unreadIndices.length,
  });
}

/**
 * DELETE /api/notifications/[id]
 * Delete a notification
 */
export async function deleteNotificationMock(notifId: string) {
  const index = notificationsStorage.findIndex((n) => n.id === notifId);
  if (index === -1) {
    return NextResponse.json(
      { success: false, error: 'Notification not found' },
      { status: 404 }
    );
  }

  const deleted = notificationsStorage.splice(index, 1)[0];

  return NextResponse.json({
    success: true,
    data: deleted,
  });
}

/**
 * GET /api/messages/[threadId]
 * Get a specific message thread
 */
export async function getThreadMock(threadId: string) {
  const thread = messagesStorage.filter((m) => m.thread_id === threadId);

  if (thread.length === 0) {
    return NextResponse.json(
      { success: false, error: 'Thread not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: thread,
  });
}

/**
 * PATCH /api/messages/[id]/read
 * Mark a message as read
 */
export async function markMessageAsReadMock(messageId: string) {
  const index = messagesStorage.findIndex((m) => m.id === messageId);
  if (index === -1) {
    return NextResponse.json(
      { success: false, error: 'Message not found' },
      { status: 404 }
    );
  }

  const current = messagesStorage[index];
  if (!current) {
    return NextResponse.json(
      { success: false, error: 'Message not found' },
      { status: 404 }
    );
  }

  messagesStorage[index] = {
    ...current,
    read_at: new Date(),
  };

  return NextResponse.json({
    success: true,
    data: messagesStorage[index],
  });
}

/**
 * POST /api/notifications/subscribe
 * Subscribe to push notifications
 */
export async function subscribeToNotificationsMock(
  userId: string,
  subscription: Record<string, unknown>
) {
  // In mock, just acknowledge the subscription
  return NextResponse.json({
    success: true,
    data: {
      user_id: userId,
      subscribed: true,
      subscription_id: `sub-${Date.now()}`,
    },
  });
}

// Helper to reset mock data
export function resetMessagingMocks() {
  messagesStorage = [...mockMessages];
  notificationsStorage = [...mockNotifications];
}

// Helper to broadcast notification to user (in production, websocket/sse)
export function broadcastNotification(
  userId: string,
  notification: Notification
) {
  // In mock, just add to storage - real implementation would use WebSocket/SSE
  if (notification.user_id === userId) {
    notificationsStorage.push(notification);
  }
}
