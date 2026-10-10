import { afterEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/env', () => ({ env: {
  NEXT_PUBLIC_SUPABASE_URL: 'https://audit.invalid',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'fictitious-bad-key',
  SUPABASE_SERVER_URL: '', INTERNAL_SECRET: 'fictitious-internal-secret', INTERNAL_CRON_SECRET: '',
  UPSTASH_REDIS_REST_URL: 'http://srh:80', UPSTASH_REDIS_REST_TOKEN: 'fictitious-token',
  WAHA_API_BASE_URL: 'http://waha:3000', WAHA_API_KEY: 'fictitious-waha-key',
} }));
afterEach(() => vi.unstubAllGlobals());

for (const apiStatus of [200, 401]) {
  it(`audit reproduction: Supabase ${apiStatus}, all other dependencies valid`, async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: unknown) => {
      const url = String(input);
      if (url.includes('/rest/v1/')) return new Response(
        apiStatus === 200 ? '[]' : JSON.stringify({ message: 'Invalid API key' }),
        { status: apiStatus, headers: { 'Content-Type': 'application/json' } },
      );
      return new Response(url.includes('srh') ? '{"result":"PONG"}' : '[]', { status: 200 });
    }));
    const { GET } = await import('@/app/api/v1/health/route');
    const response = await GET(new NextRequest('https://crm.audit.invalid/api/v1/health'));
    const body = await response.json();
    // Documents the CURRENT behavior; a 401 Invalid API key should not be healthy.
    expect(response.status).toBe(200);
    expect(body.data.status).toBe('healthy');
    expect(body.data.checks.supabase.status).toBe('ok');
    console.log(JSON.stringify({ apiStatus, healthHttp: response.status, health: body.data.status,
      supabase: body.data.checks.supabase.status, confirmsFalsePositive: apiStatus === 401 }));
  });
}
