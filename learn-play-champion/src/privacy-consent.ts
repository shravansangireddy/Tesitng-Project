import type { SupabaseClient } from "@supabase/supabase-js";
import { PRIVACY_POLICY_VERSION, privacy } from "./privacy";

/**
 * Stored privacy-policy agreement for grown-ups.
 *
 * Rows live in public.parent_privacy_consents (migration 202611040002):
 * one per account and policy version, recording when the parent agreed
 * and when they withdrew. Row-level security lets a parent read only
 * their own rows; writes go through the record/withdraw RPCs, which
 * derive the account from the session and stamp the times server-side,
 * so an agreement cannot be forged or backdated from the client.
 */

export interface PrivacyConsent {
  id: string;
  userId: string;
  policyVersion: string;
  noticeUrl: string | null;
  acceptedAt: string;
  withdrawnAt: string | null;
}

export type PrivacyConsentStatus = "agreed" | "withdrawn" | "none";

export function privacyConsentStatus(
  consent: PrivacyConsent | null,
): PrivacyConsentStatus {
  if (!consent) return "none";
  return consent.withdrawnAt ? "withdrawn" : "agreed";
}

/** Shown when the consent table/RPCs are not deployed yet. */
export const PRIVACY_CONSENT_UNAVAILABLE_MESSAGE =
  "Agreement saving isn’t available yet — please try again later.";

/**
 * Raised when the parent_privacy_consents table or its RPCs are missing
 * (the migration has not been run), so the dashboard can show a plain
 * "not available yet" note instead of a raw database error.
 */
export class PrivacyConsentUnavailableError extends Error {
  constructor() {
    super(PRIVACY_CONSENT_UNAVAILABLE_MESSAGE);
    this.name = "PrivacyConsentUnavailableError";
  }
}

export function isPrivacyConsentUnavailable(error: unknown): boolean {
  if (error instanceof PrivacyConsentUnavailableError) return true;
  if (!error || typeof error !== "object") return false;
  const value = error as { code?: unknown; message?: unknown };
  // 42P01: undefined table, 42883: undefined function (direct Postgres);
  // PGRST202 / PGRST205: function / table missing from PostgREST's cache.
  if (
    value.code === "42P01" ||
    value.code === "42883" ||
    value.code === "PGRST202" ||
    value.code === "PGRST205"
  )
    return true;
  const message = typeof value.message === "string" ? value.message : "";
  return /could not find the (table|function)|does not exist/i.test(message);
}

function consentFailure(action: string, error: unknown): Error {
  if (isPrivacyConsentUnavailable(error)) {
    return new PrivacyConsentUnavailableError();
  }
  const detail =
    error && typeof error === "object" && "message" in error
      ? String((error as { message: unknown }).message)
      : String(error);
  return new Error(`${action}: ${detail}`);
}

export function parsePrivacyConsent(row: unknown): PrivacyConsent | null {
  if (!row || typeof row !== "object") return null;
  const value = row as Record<string, unknown>;
  if (
    typeof value.id !== "string" ||
    !value.id ||
    typeof value.user_id !== "string" ||
    !value.user_id ||
    typeof value.policy_version !== "string" ||
    !value.policy_version ||
    typeof value.accepted_at !== "string" ||
    !Number.isFinite(Date.parse(value.accepted_at))
  ) {
    return null;
  }
  return {
    id: value.id,
    userId: value.user_id,
    policyVersion: value.policy_version,
    noticeUrl:
      typeof value.notice_url === "string" && value.notice_url
        ? value.notice_url
        : null,
    acceptedAt: value.accepted_at,
    withdrawnAt:
      typeof value.withdrawn_at === "string" &&
      Number.isFinite(Date.parse(value.withdrawn_at))
        ? value.withdrawn_at
        : null,
  };
}

const CONSENT_COLUMNS =
  "id, user_id, policy_version, notice_url, accepted_at, withdrawn_at";

/**
 * The signed-in grown-up's agreement to a policy version (the current
 * one by default), or null when they have not agreed. Row-level security
 * scopes the read to the caller's own rows, so no account filter is
 * applied here — the same pattern as fetchMyKidAccounts.
 */
export async function fetchMyPrivacyConsent(
  client: SupabaseClient,
  policyVersion: string = PRIVACY_POLICY_VERSION,
): Promise<PrivacyConsent | null> {
  const { data, error } = await client
    .from("parent_privacy_consents")
    .select(CONSENT_COLUMNS)
    .eq("policy_version", policyVersion)
    .maybeSingle();
  if (error)
    throw consentFailure("Could not load your privacy agreement", error);
  return parsePrivacyConsent(data);
}

/**
 * Records the signed-in grown-up's agreement to the current policy
 * version (re-agreeing after a withdrawal clears the withdrawal on the
 * same row). Returns the stored record, timestamps included.
 */
export async function recordMyPrivacyConsent(
  client: SupabaseClient,
): Promise<PrivacyConsent> {
  const { data, error } = await client.rpc(
    "record_my_privacy_policy_consent",
    {
      p_policy_version: PRIVACY_POLICY_VERSION,
      p_notice_url: privacy.noticeUrl || null,
    },
  );
  if (error) throw consentFailure("Could not save your agreement", error);
  const consent = parsePrivacyConsent(data);
  if (!consent)
    throw new Error("Could not save your agreement: unexpected response.");
  return consent;
}

/**
 * Withdraws the signed-in grown-up's agreement to the current policy
 * version. Returns the updated record, or null when they had never
 * agreed to this version.
 */
export async function withdrawMyPrivacyConsent(
  client: SupabaseClient,
): Promise<PrivacyConsent | null> {
  const { data, error } = await client.rpc(
    "withdraw_my_privacy_policy_consent",
    { p_policy_version: PRIVACY_POLICY_VERSION },
  );
  if (error) throw consentFailure("Could not withdraw your agreement", error);
  return parsePrivacyConsent(data);
}
