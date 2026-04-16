import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Phase 3 Mock API Tests
 * 
 * These tests run against mock endpoints and don't require a database.
 * Run: npm run test:phase3:mock
 * 
 * Usage:
 *   PHASE3_BASE_URL=http://localhost:3000 npm run test:phase3:mock
 */

const baseUrl = process.env.PHASE3_BASE_URL;
const runOrSkip = baseUrl ? it : it.skip;

async function ensureServerReachable(): Promise<void> {
  if (!baseUrl) {
    throw new Error('PHASE3_BASE_URL is not set');
  }

  try {
    await fetch(baseUrl);
  } catch {
    throw new Error('Phase 3 mock server is unreachable');
  }
}

describe('Phase 3 Mock API Tests (Database-Independent)', () => {
  runOrSkip(
    'GET /api/jobs/mock returns list envelope with pagination',
    async (t) => {
      try {
        await ensureServerReachable();
      } catch {
        t.skip('Server unreachable');
        return;
      }

      const res = await fetch(`${baseUrl}/api/jobs/mock?limit=10&offset=0`);
      assert.equal(res.status, 200, 'Should return 200');

      const data = (await res.json()) as {
        data?: unknown[];
        pagination?: { limit?: number; offset?: number; total?: number };
      };

      assert.ok(Array.isArray(data.data), 'Should have data array');
      assert.ok(data.data!.length > 0, 'Should have jobs');
      assert.equal(
        data.pagination?.limit,
        10,
        'Should have correct limit'
      );
      assert.equal(
        data.pagination?.offset,
        0,
        'Should have correct offset'
      );
      assert.ok(
        data.pagination?.total! > 0,
        'Should have total count'
      );
    }
  );

  runOrSkip('GET /api/jobs/mock supports search query', async (t) => {
    try {
      await ensureServerReachable();
    } catch {
      t.skip('Server unreachable');
      return;
    }

    const res = await fetch(`${baseUrl}/api/jobs/mock?search=engineer`);
    assert.equal(res.status, 200);

    const data = (await res.json()) as { data?: unknown[] };
    assert.ok(Array.isArray(data.data), 'Should have data array');
    // Should find jobs matching "engineer"
    assert.ok(data.data!.length > 0, 'Should find results for engineer');
  });

  runOrSkip('GET /api/jobs/[id]/mock returns job detail', async (t) => {
    try {
      await ensureServerReachable();
    } catch {
      t.skip('Server unreachable');
      return;
    }

    const jobId = '550e8400-e29b-41d4-a716-446655440001';
    const res = await fetch(`${baseUrl}/api/jobs/${jobId}/mock`);
    assert.equal(res.status, 200, 'Should return 200 for existing job');

    const data = (await res.json()) as {
      id?: string;
      title?: string;
      employer?: { id?: string; name?: string };
    };
    assert.equal(data.id, jobId, 'Should return correct job ID');
    assert.ok(data.title, 'Should have title');
    assert.ok(data.employer, 'Should have employer data');
  });

  runOrSkip('GET /api/jobs/[id]/mock returns 404 for unknown id', async (t) => {
    try {
      await ensureServerReachable();
    } catch {
      t.skip('Server unreachable');
      return;
    }

    const res = await fetch(
      `${baseUrl}/api/jobs/00000000-0000-0000-0000-000000000000/mock`
    );
    assert.equal(res.status, 404, 'Should return 404 for unknown job');
  });

  runOrSkip(
    'POST /api/jobs/[id]/apply/mock rejects anonymous caller',
    async (t) => {
      try {
        await ensureServerReachable();
      } catch {
        t.skip('Server unreachable');
        return;
      }

      const jobId = '550e8400-e29b-41d4-a716-446655440001';
      const res = await fetch(
        `${baseUrl}/api/jobs/${jobId}/apply/mock`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ coverLetter: 'I am interested' }),
        }
      );

      assert.equal(
        res.status,
        401,
        'Should return 401 for unauthenticated request'
      );
    }
  );

  runOrSkip(
    'POST /api/jobs/[id]/apply/mock creates application with auth',
    async (t) => {
      try {
        await ensureServerReachable();
      } catch {
        t.skip('Server unreachable');
        return;
      }

      const jobId = '550e8400-e29b-41d4-a716-446655440001';
      const res = await fetch(
        `${baseUrl}/api/jobs/${jobId}/apply/mock`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer mock-token-123',
          },
          body: JSON.stringify({
            coverLetter: 'I am very interested in this role',
            userId: 'user-123',
          }),
        }
      );

      assert.equal(
        res.status,
        201,
        'Should return 201 for successful application'
      );

      const data = (await res.json()) as {
        id?: string;
        job_id?: string;
        status?: string;
      };
      assert.ok(data.id, 'Should return application ID');
      assert.equal(data.job_id, jobId, 'Should return correct job ID');
      assert.equal(data.status, 'applied', 'Should have applied status');
    }
  );
});
