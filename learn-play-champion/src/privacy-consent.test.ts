import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PRIVACY_POLICY_VERSION } from "./privacy";
import {
  PRIVACY_CONSENT_UNAVAILABLE_MESSAGE,
  PrivacyConsentUnavailableError,
  fetchMyPrivacyConsent,
  isPrivacyConsentUnavailable,
  parsePrivacyConsent,
  privacyConsentStatus,
  recordMyPrivacyConsent,
  withdrawMyPrivacyConsent,
} from "./privacy-consent";

const ROW = {
  id: "consent-1",
  user_id: "adult-one",
  policy_version: "2026-11-04",
  notice_url: "https://school.example/privacy",
  accepted_at: "2026-11-04T15:30:00Z",
  withdrawn_at: null,
};

interface StubOptions {
  fetchResult?: { data: unknown; error: unknown };
  rpcResult?: { data: unknown; error: unknown };
}

function stubClient(options: StubOptions = {}) {
  const fetchResult = options.fetchResult ?? { data: null, error: null };
  const rpcResult = options.rpcResult ?? { data: ROW, error: null };
  const calls: { method: string; args: unknown[] }[] = [];
  const builder: Record<string, unknown> = {
    select: (...args: unknown[]) => {
      calls.push({ method: "select", args });
      return builder;
    },
    eq: (...args: unknown[]) => {
      calls.push({ method: "eq", args });
      return builder;
    },
    maybeSingle: async () => fetchResult,
  };
  const client = {
    from: vi.fn(() => builder),
    rpc: vi.fn(async (name: string, args: unknown) => {
      calls.push({ method: `rpc:${name}`, args: [args] });
      return rpcResult;
    }),
  } as unknown as SupabaseClient;
  return { client, calls };
}

describe("privacy policy version", () => {
  it("is the date-based version the dashboard shows", () => {
    expect(PRIVACY_POLICY_VERSION).toBe("2026-11-04");
  });
});

describe("parsePrivacyConsent", () => {
  it("maps a well-formed row", () => {
    expect(parsePrivacyConsent(ROW)).toEqual({
      id: "consent-1",
      userId: "adult-one",
      policyVersion: "2026-11-04",
      noticeUrl: "https://school.example/privacy",
      acceptedAt: "2026-11-04T15:30:00Z",
      withdrawnAt: null,
    });
  });

  it("keeps a withdrawal timestamp and drops malformed rows", () => {
    const withdrawn = parsePrivacyConsent({
      ...ROW,
      withdrawn_at: "2026-11-05T09:00:00Z",
    });
    expect(withdrawn?.withdrawnAt).toBe("2026-11-05T09:00:00Z");
    expect(parsePrivacyConsent({ ...ROW, policy_version: "" })).toBeNull();
    expect(parsePrivacyConsent({ ...ROW, accepted_at: "not a date" })).toBeNull();
    expect(parsePrivacyConsent({ ...ROW, notice_url: 42 })?.noticeUrl).toBeNull();
    expect(parsePrivacyConsent(null)).toBeNull();
    expect(parsePrivacyConsent("row")).toBeNull();
  });
});

describe("privacyConsentStatus", () => {
  it("distinguishes none, agreed, and withdrawn", () => {
    expect(privacyConsentStatus(null)).toBe("none");
    expect(privacyConsentStatus(parsePrivacyConsent(ROW))).toBe("agreed");
    expect(
      privacyConsentStatus(
        parsePrivacyConsent({ ...ROW, withdrawn_at: "2026-11-05T09:00:00Z" }),
      ),
    ).toBe("withdrawn");
  });
});

describe("privacy consent queries", () => {
  it("fetches the caller's row for the current version only", async () => {
    const { client, calls } = stubClient({
      fetchResult: { data: ROW, error: null },
    });
    const consent = await fetchMyPrivacyConsent(client);
    expect(consent?.policyVersion).toBe("2026-11-04");
    const filter = calls.find((call) => call.method === "eq");
    expect(filter?.args).toEqual(["policy_version", PRIVACY_POLICY_VERSION]);
  });

  it("returns null when the parent has not agreed yet", async () => {
    const { client } = stubClient({ fetchResult: { data: null, error: null } });
    expect(await fetchMyPrivacyConsent(client)).toBeNull();
  });

  it("records agreement through the RPC with the current version", async () => {
    const { client, calls } = stubClient();
    const consent = await recordMyPrivacyConsent(client);
    expect(consent.userId).toBe("adult-one");
    const rpc = calls.find(
      (call) => call.method === "rpc:record_my_privacy_policy_consent",
    );
    expect(rpc?.args[0]).toMatchObject({
      p_policy_version: PRIVACY_POLICY_VERSION,
    });
  });

  it("withdraws through the RPC and returns the updated row", async () => {
    const { client, calls } = stubClient({
      rpcResult: {
        data: { ...ROW, withdrawn_at: "2026-11-05T09:00:00Z" },
        error: null,
      },
    });
    const consent = await withdrawMyPrivacyConsent(client);
    expect(consent?.withdrawnAt).toBe("2026-11-05T09:00:00Z");
    expect(
      calls.some(
        (call) => call.method === "rpc:withdraw_my_privacy_policy_consent",
      ),
    ).toBe(true);
  });

  it("returns null when withdrawing an agreement that never existed", async () => {
    const { client } = stubClient({ rpcResult: { data: null, error: null } });
    expect(await withdrawMyPrivacyConsent(client)).toBeNull();
  });
});

describe("privacy consent availability", () => {
  const missingTable = {
    code: "PGRST205",
    message:
      "Could not find the table 'public.parent_privacy_consents' in the schema cache",
  };

  it("recognizes a not-yet-deployed table or RPC", () => {
    expect(isPrivacyConsentUnavailable(missingTable)).toBe(true);
    expect(
      isPrivacyConsentUnavailable({
        code: "PGRST202",
        message: "Could not find the function in the schema cache",
      }),
    ).toBe(true);
    expect(
      isPrivacyConsentUnavailable(new PrivacyConsentUnavailableError()),
    ).toBe(true);
    expect(isPrivacyConsentUnavailable(new Error("network down"))).toBe(false);
    expect(isPrivacyConsentUnavailable(null)).toBe(false);
  });

  it("turns a missing table on read into the plain unavailable error", async () => {
    const { client } = stubClient({
      fetchResult: { data: null, error: missingTable },
    });
    const failure = await fetchMyPrivacyConsent(client).catch(
      (error: unknown) => error,
    );
    expect(failure).toBeInstanceOf(PrivacyConsentUnavailableError);
    expect((failure as Error).message).toBe(
      PRIVACY_CONSENT_UNAVAILABLE_MESSAGE,
    );
  });

  it("turns a missing RPC on record into the plain unavailable error", async () => {
    const { client } = stubClient({
      rpcResult: { data: null, error: missingTable },
    });
    await expect(recordMyPrivacyConsent(client)).rejects.toBeInstanceOf(
      PrivacyConsentUnavailableError,
    );
  });

  it("keeps other failures as ordinary errors with their detail", async () => {
    const { client } = stubClient({
      fetchResult: { data: null, error: { message: "connection reset" } },
    });
    await expect(fetchMyPrivacyConsent(client)).rejects.toThrow(
      /Could not load your privacy agreement: connection reset/,
    );
  });
});
