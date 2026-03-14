// @vitest-environment node
import { describe, test, expect, vi, beforeEach } from "vitest";
import { SignJWT, jwtVerify } from "jose";

vi.mock("server-only", () => ({}));

const mockCookieSet = vi.fn();
const mockCookieGet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve({ set: mockCookieSet, get: mockCookieGet })),
}));

import { createSession, getSession } from "@/lib/auth";

async function mintToken(
  payload: object,
  secret = new TextEncoder().encode("development-secret-key"),
  expiresIn = "7d"
) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresIn)
    .setIssuedAt()
    .sign(secret);
}

const JWT_SECRET = new TextEncoder().encode("development-secret-key");

describe("createSession", () => {
  beforeEach(() => {
    mockCookieSet.mockClear();
  });

  test("sets a cookie named auth-token", async () => {
    await createSession("user-1", "user@example.com");
    expect(mockCookieSet).toHaveBeenCalledOnce();
    expect(mockCookieSet.mock.calls[0][0]).toBe("auth-token");
  });

  test("sets cookie with httpOnly, sameSite, and path options", async () => {
    await createSession("user-1", "user@example.com");
    const options = mockCookieSet.mock.calls[0][2];
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
  });

  test("sets secure: false outside production", async () => {
    vi.stubEnv("NODE_ENV", "development");
    await createSession("user-1", "user@example.com");
    const options = mockCookieSet.mock.calls[0][2];
    expect(options.secure).toBe(false);
    vi.unstubAllEnvs();
  });

  test("sets secure: true in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await createSession("user-1", "user@example.com");
    const options = mockCookieSet.mock.calls[0][2];
    expect(options.secure).toBe(true);
    vi.unstubAllEnvs();
  });

  test("sets cookie expiry approximately 7 days from now", async () => {
    const before = Date.now();
    await createSession("user-1", "user@example.com");
    const after = Date.now();

    const expires: Date = mockCookieSet.mock.calls[0][2].expires;
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    expect(expires.getTime()).toBeGreaterThanOrEqual(before + sevenDaysMs);
    expect(expires.getTime()).toBeLessThanOrEqual(after + sevenDaysMs);
  });

  test("cookie value is a valid JWT signed with HS256", async () => {
    await createSession("user-1", "user@example.com");
    const token: string = mockCookieSet.mock.calls[0][1];
    const { payload } = await jwtVerify(token, JWT_SECRET);
    expect(payload).toBeDefined();
  });

  test("JWT contains the correct userId and email", async () => {
    await createSession("user-42", "hello@test.com");
    const token: string = mockCookieSet.mock.calls[0][1];
    const { payload } = await jwtVerify(token, JWT_SECRET);
    expect(payload.userId).toBe("user-42");
    expect(payload.email).toBe("hello@test.com");
  });

  test("JWT exp claim is set to approximately 7 days from now", async () => {
    const before = Math.floor(Date.now() / 1000);
    await createSession("user-1", "user@example.com");
    const after = Math.floor(Date.now() / 1000);

    const token: string = mockCookieSet.mock.calls[0][1];
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const sevenDaysSec = 7 * 24 * 60 * 60;

    expect(payload.exp).toBeGreaterThanOrEqual(before + sevenDaysSec);
    expect(payload.exp).toBeLessThanOrEqual(after + sevenDaysSec + 1);
  });

  test("JWT payload expiresAt matches the cookie expires", async () => {
    await createSession("user-1", "user@example.com");
    const token: string = mockCookieSet.mock.calls[0][1];
    const cookieExpires: Date = mockCookieSet.mock.calls[0][2].expires;

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const expiresAt = new Date(payload.expiresAt as string);

    expect(expiresAt.getTime()).toBeCloseTo(cookieExpires.getTime(), -3);
  });

  test("uses JWT_SECRET env var when set", async () => {
    const customSecret = "my-custom-secret-key-that-is-long-enough";
    vi.stubEnv("JWT_SECRET", customSecret);
    vi.resetModules();

    const { createSession: createSessionFresh } = await import("@/lib/auth");
    await createSessionFresh("user-1", "user@example.com");

    const token: string = mockCookieSet.mock.calls[0][1];
    const secret = new TextEncoder().encode(customSecret);
    const { payload } = await jwtVerify(token, secret);
    expect(payload.userId).toBe("user-1");

    vi.unstubAllEnvs();
    vi.resetModules();
  });
});

describe("getSession", () => {
  beforeEach(() => {
    mockCookieGet.mockClear();
  });

  test("returns null when auth-token cookie is absent", async () => {
    mockCookieGet.mockReturnValue(undefined);
    expect(await getSession()).toBeNull();
  });

  test("returns null when token is malformed", async () => {
    mockCookieGet.mockReturnValue({ value: "not.a.jwt" });
    expect(await getSession()).toBeNull();
  });

  test("returns null when token is signed with a different key", async () => {
    const wrongKey = new TextEncoder().encode("wrong-secret");
    const token = await mintToken({ userId: "u1", email: "a@b.com" }, wrongKey);
    mockCookieGet.mockReturnValue({ value: token });
    expect(await getSession()).toBeNull();
  });

  test("returns null when token is expired", async () => {
    const token = await mintToken({ userId: "u1", email: "a@b.com" }, undefined, "-1s");
    mockCookieGet.mockReturnValue({ value: token });
    expect(await getSession()).toBeNull();
  });

  test("returns session payload for a valid token", async () => {
    const token = await mintToken({ userId: "u1", email: "a@b.com" });
    mockCookieGet.mockReturnValue({ value: token });
    const session = await getSession();
    expect(session).not.toBeNull();
  });

  test("returned payload has correct userId and email", async () => {
    const token = await mintToken({ userId: "user-99", email: "test@example.com" });
    mockCookieGet.mockReturnValue({ value: token });
    const session = await getSession();
    expect(session?.userId).toBe("user-99");
    expect(session?.email).toBe("test@example.com");
  });
});
