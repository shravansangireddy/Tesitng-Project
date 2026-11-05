import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PRIVACY_POLICY_VERSION, privacy } from "./privacy";
import {
  PRIVACY_CONSENT_UNAVAILABLE_MESSAGE,
  fetchMyPrivacyConsent,
  isPrivacyConsentUnavailable,
  privacyConsentStatus,
  recordMyPrivacyConsent,
  withdrawMyPrivacyConsent,
  type PrivacyConsent as PrivacyConsentRecord,
} from "./privacy-consent";

function failure(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

/** Local date and time for a stored agreement timestamp. */
function formatWhen(iso: string): string {
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime())
    ? iso
    : parsed.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
}

/**
 * Privacy policy agreement: the grown-up's agreement is saved to their
 * account (public.parent_privacy_consents, migration 202611040002), so
 * it can be retrieved on any device — unlike the dashboard's temporary
 * checkboxes, which are never stored. Shows the recorded agreement with
 * its date, or a withdraw / agree-again path. If the consent table is
 * not deployed yet, the card says so plainly instead of erroring.
 */
export default function PrivacyConsent({ client }: { client: SupabaseClient }) {
  const [consent, setConsent] = useState<PrivacyConsentRecord | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const mine = await fetchMyPrivacyConsent(client);
        if (active) setConsent(mine);
      } catch (loadFailure) {
        if (!active) return;
        if (isPrivacyConsentUnavailable(loadFailure)) setUnavailable(true);
        else setError(failure(loadFailure));
      } finally {
        if (active) setLoaded(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [client]);

  const agree = async () => {
    setBusy(true);
    setError("");
    try {
      setConsent(await recordMyPrivacyConsent(client));
    } catch (saveFailure) {
      if (isPrivacyConsentUnavailable(saveFailure)) setUnavailable(true);
      else setError(failure(saveFailure));
    } finally {
      setBusy(false);
    }
  };

  const withdraw = async () => {
    if (
      !window.confirm(
        "Withdraw your agreement to the Privacy Policy? The withdrawal is saved to your account, and you can agree again at any time.",
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      const updated = await withdrawMyPrivacyConsent(client);
      // The RPC returns no row when there was nothing to withdraw;
      // re-read so the card always shows the stored truth.
      setConsent(updated ?? (await fetchMyPrivacyConsent(client)));
    } catch (saveFailure) {
      if (isPrivacyConsentUnavailable(saveFailure)) setUnavailable(true);
      else setError(failure(saveFailure));
    } finally {
      setBusy(false);
    }
  };

  const status = privacyConsentStatus(consent);

  return (
    <section className="privacy-consent" aria-label="Privacy policy agreement">
      <h2>Privacy policy agreement</h2>
      {!loaded ? (
        <p role="status">Loading your privacy agreement…</p>
      ) : unavailable ? (
        <p>{PRIVACY_CONSENT_UNAVAILABLE_MESSAGE}</p>
      ) : (
        <>
          {error && (
            <p className="kid-logins-error" role="alert">
              {error}
            </p>
          )}
          {status === "agreed" && consent ? (
            <>
              <p>
                You agreed to the Privacy Policy (version{" "}
                {consent.policyVersion}) on {formatWhen(consent.acceptedAt)}.
                Your agreement is saved to your account, so you can see it
                any time, on any device.
              </p>
              <button
                className="button secondary"
                type="button"
                disabled={busy}
                onClick={withdraw}
              >
                {busy ? "Saving…" : "Withdraw agreement"}
              </button>
            </>
          ) : (
            <>
              {status === "withdrawn" && consent?.withdrawnAt ? (
                <p>
                  You withdrew your agreement on{" "}
                  {formatWhen(consent.withdrawnAt)}.
                </p>
              ) : null}
              <p>
                Your agreement is saved to your account, so you can see it
                any time, on any device.
              </p>
              {privacy.noticeUrl && (
                <p>
                  <a href={privacy.noticeUrl} target="_blank" rel="noreferrer">
                    Read the Privacy Policy (external site)
                  </a>
                </p>
              )}
              <button
                className="button"
                type="button"
                disabled={busy}
                onClick={agree}
              >
                {busy ? "Saving…" : "I agree to the Privacy Policy"}
              </button>
              <p>
                Agreeing records the policy version (
                {PRIVACY_POLICY_VERSION}) and the date with your account.
              </p>
            </>
          )}
        </>
      )}
    </section>
  );
}
