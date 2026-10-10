import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/env", () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: "https://readiness.invalid",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "publica-ficticia",
    SUPABASE_SERVICE_ROLE_KEY: "privada-ficticia",
    SUPABASE_SERVER_URL: "",
    UPSTASH_REDIS_REST_URL: "",
    UPSTASH_REDIS_REST_TOKEN: "",
    INTERNAL_SECRET: "",
    INTERNAL_CRON_SECRET: "",
  },
}));
afterEach(() => vi.unstubAllGlobals());

describe("readiness comprova as duas credenciais e o schema", () => {
  it.each([
    { rest: 200, auth: 200, expected: "ok" },
    { rest: 401, auth: 200, expected: "down" },
    { rest: 403, auth: 200, expected: "down" },
    { rest: 200, auth: 401, expected: "down" },
    { rest: 404, auth: 200, expected: "down" },
    { rest: 502, auth: 200, expected: "down" },
  ])("REST $rest / Auth $auth → $expected", async ({ rest, auth, expected }) => {
    const fetchMock = vi.fn(async (input: unknown, init?: RequestInit) => {
      const url = String(input);
      const headers = new Headers(init?.headers);
      if (url.includes("/rest/v1/")) {
        expect(headers.get("apikey")).toBe("privada-ficticia");
        expect(headers.get("Accept-Profile")).toBe("public");
        return new Response(rest === 200 ? "[]" : '{"message":"Invalid API key"}', {
          status: rest,
        });
      }
      expect(headers.get("apikey")).toBe("publica-ficticia");
      return new Response("{}", { status: auth });
    });
    vi.stubGlobal("fetch", fetchMock);
    const { GET } = await import("./route");
    const response = await GET(new NextRequest("https://crm.invalid/api/v1/health"));
    const body = await response.json();
    expect(body.data.checks.supabase.status).toBe(expected);
    if (expected === "down") expect(response.status).toBe(503);
    expect(JSON.stringify(body)).not.toContain("privada-ficticia");
    expect(JSON.stringify(body)).not.toContain("publica-ficticia");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
