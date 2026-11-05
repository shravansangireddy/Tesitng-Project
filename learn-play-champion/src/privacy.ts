export interface PrivacySettings {
  cloudEnabled: boolean;
  speechEnabled: boolean;
  noticeUrl: string;
  contact: string;
  retention: string;
  error: string;
}
/**
 * The privacy policy version a grown-up agrees to in the Parents
 * dashboard. Date-based: when the operator's published notice changes,
 * move this to the new effective date — agreements already recorded stay
 * on file under the version that was current when they were made, and
 * the dashboard asks for a fresh agreement to the new version.
 */
export const PRIVACY_POLICY_VERSION = "2026-11-04";
export function privacySettings(env: Record<string, string | undefined>): PrivacySettings {
  const noticeUrl = env.VITE_PRIVACY_NOTICE_URL?.trim() ?? "";
  const contact = env.VITE_PRIVACY_CONTACT?.trim() ?? "";
  const retention = env.VITE_DATA_RETENTION_NOTICE?.trim() ?? "";
  let validNotice = false;
  try {
    const url = new URL(noticeUrl);
    validNotice = url.protocol === "https:" && !url.username && !url.password;
  } catch { /* Missing/invalid notice keeps online collection disabled. */ }
  const approved = env.VITE_CHILD_PRIVACY_REVIEWED === "true" && validNotice && !!contact && !!retention;
  return {
    cloudEnabled: approved,
    speechEnabled: approved && env.VITE_BROWSER_SPEECH_ENABLED === "true",
    noticeUrl: validNotice ? noticeUrl : "", contact, retention,
    error: approved ? "" : "Online learner data and browser voice are disabled until the operator supplies a published privacy notice, contact, retention policy, and completes the family/school privacy review. Local guest learning remains available.",
  };
}
export const privacy = privacySettings(import.meta.env);
