/**
 * Phase 5 Mock API Tests (Messaging & Notifications)
 * Database-independent testing of user messaging and notification system
 */

import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import {
  sendMessageMock,
  getMessagesMock,
  createNotificationMock,
  getNotificationsMock,
  markNotificationAsReadMock,
  markAllNotificationsAsReadMock,
  deleteNotificationMock,
  getThreadMock,
  markMessageAsReadMock,
  resetMessagingMocks,
  mockMessages,
  mockNotifications,
} from '@/lib/phase5-mock';

describe('Phase 5 Mock API Tests', () => {
  beforeEach(() => {
    resetMessagingMocks();
  });

  describe('Messaging', () => {
    it('POST /api/messages/mock sends a new message', async () => {
      const response = await sendMessageMock('user-001', 'user-002', 'Hello!');
      const json = await response.json();
      assert.equal(json.success, true);
      assert.equal(json.data.content, 'Hello!');
      assert.equal(json.data.sender_id, 'user-001');
      assert.equal(json.data.recipient_id, 'user-002');
    });

    it('GET /api/messages/mock returns user message threads', async () => {
      const response = await getMessagesMock('user-001');
      const json = await response.json();
      assert.equal(json.success, true);
      assert(json.data.length > 0);
      assert(json.data[0].messages);
      assert(json.data[0].unread_count >= 0);
    });

    it('GET /api/messages/mock returns empty for user with no messages', async () => {
      const response = await getMessagesMock('non-existent-user');
      const json = await response.json();
      assert.equal(json.success, true);
      assert.equal(json.data.length, 0);
    });

    it('GET /api/messages/[threadId]/mock returns thread messages', async () => {
      const firstMessage = mockMessages[0];
      if (!firstMessage) {
        throw new Error('Expected mock message seed data');
      }
      const threadId = firstMessage.thread_id;
      const response = await getThreadMock(threadId);
      const json = await response.json();
      assert.equal(json.success, true);
      assert(json.data.length > 0);
      assert.equal(json.data[0].thread_id, threadId);
    });

    it('GET /api/messages/[threadId]/mock returns 404 for non-existent thread', async () => {
      const response = await getThreadMock('non-existent-thread');
      const json = await response.json();
      assert.equal(json.success, false);
      assert(json.error.includes('not found'));
    });

    it('PATCH /api/messages/[id]/read/mock marks message as read', async () => {
      const firstMessage = mockMessages[0];
      if (!firstMessage) {
        throw new Error('Expected mock message seed data');
      }
      const messageId = firstMessage.id;
      const response = await markMessageAsReadMock(messageId);
      const json = await response.json();
      assert.equal(json.success, true);
      assert(json.data.read_at);
    });
  });

  describe('Notifications', () => {
    it('POST /api/notifications/mock creates a notification', async () => {
      const response = await createNotificationMock(
        'user-001',
        'test_type',
        'Test Title',
        'Test message'
      );
      const json = await response.json();
      assert.equal(json.success, true);
      assert.equal(json.data.title, 'Test Title');
      assert.equal(json.data.type, 'test_type');
      assert.equal(json.data.read, false);
    });

    it('POST /api/notifications/mock creates notification with data payload', async () => {
      const response = await createNotificationMock(
        'user-001',
        'job_match',
        'New Job',
        'Match found',
        { job_id: 'job-999' }
      );
      const json = await response.json();
      assert.equal(json.success, true);
      assert.equal(json.data.data.job_id, 'job-999');
    });

    it('GET /api/notifications/mock returns user notifications', async () => {
      const response = await getNotificationsMock('user-001');
      const json = await response.json();
      assert.equal(json.success, true);
      assert(json.data.length > 0);
      assert(json.unread_count >= 0);
      assert(json.total_count >= 0);
    });

    it('GET /api/notifications/mock returns empty for user with no notifications', async () => {
      const response = await getNotificationsMock('non-existent-user');
      const json = await response.json();
      assert.equal(json.success, true);
      assert.equal(json.data.length, 0);
    });

    it('PATCH /api/notifications/[id]/mock marks notification as read', async () => {
      const firstNotification = mockNotifications[0];
      if (!firstNotification) {
        throw new Error('Expected mock notification seed data');
      }
      const notifId = firstNotification.id;
      const response = await markNotificationAsReadMock(notifId);
      const json = await response.json();
      assert.equal(json.success, true);
      assert.equal(json.data.read, true);
    });

    it('PATCH /api/notifications/mark-all-read/mock marks all as read', async () => {
      const response = await markAllNotificationsAsReadMock('user-001');
      const json = await response.json();
      assert.equal(json.success, true);
      assert(json.updated_count >= 0);
    });

    it('PATCH /api/notifications/[id]/mock returns 404 for non-existent notification', async () => {
      const response = await markNotificationAsReadMock('non-existent-notif');
      const json = await response.json();
      assert.equal(json.success, false);
      assert(json.error.includes('not found'));
    });

    it('DELETE /api/notifications/[id]/mock deletes a notification', async () => {
      const firstNotification = mockNotifications[0];
      if (!firstNotification) {
        throw new Error('Expected mock notification seed data');
      }
      const notifId = firstNotification.id;
      const response = await deleteNotificationMock(notifId);
      const json = await response.json();
      assert.equal(json.success, true);
      assert.equal(json.data.id, notifId);
    });

    it('DELETE /api/notifications/[id]/mock returns 404 for non-existent notification', async () => {
      const response = await deleteNotificationMock('non-existent-notif');
      const json = await response.json();
      assert.equal(json.success, false);
      assert(json.error.includes('not found'));
    });

    it('Notifications include correct types', async () => {
      const types = new Set(mockNotifications.map((n) => n.type));
      assert(types.has('application_received'));
      assert(types.has('application_status_change'));
      assert(types.has('message_received'));
      assert(types.has('job_match'));
    });

    it('Unread count calculation is accurate', async () => {
      const response = await getNotificationsMock('user-001');
      const json = await response.json();
      const actualUnread = json.data.filter((n: typeof mockNotifications[0]) => !n.read).length;
      assert.equal(json.unread_count, actualUnread);
    });
  });

  describe('Notification Types', () => {
    it('application_received notification created correctly', async () => {
      const response = await createNotificationMock(
        'user-emp-001',
        'application_received',
        'New Application',
        'New application for your job posting',
        { job_id: 'job-001', application_id: 'app-001' }
      );
      const json = await response.json();
      assert.equal(json.success, true);
      assert.equal(json.data.type, 'application_received');
    });

    it('application_status_change notification created correctly', async () => {
      const response = await createNotificationMock(
        'user-job-001',
        'application_status_change',
        'Status Changed',
        'Your application was shortlisted',
        { status: 'shortlisted', application_id: 'app-001' }
      );
      const json = await response.json();
      assert.equal(json.success, true);
      assert.equal(json.data.data.status, 'shortlisted');
    });

    it('message_received notification created correctly', async () => {
      const response = await createNotificationMock(
        'user-001',
        'message_received',
        'New Message',
        'You have a new message',
        { sender_id: 'user-002', message_id: 'msg-001' }
      );
      const json = await response.json();
      assert.equal(json.success, true);
      assert.equal(json.data.type, 'message_received');
    });

    it('job_match notification created correctly', async () => {
      const response = await createNotificationMock(
        'user-001',
        'job_match',
        'Job Match',
        'A new job matches your profile',
        { job_id: 'job-999' }
      );
      const json = await response.json();
      assert.equal(json.success, true);
      assert.equal(json.data.type, 'job_match');
    });
  });
});
