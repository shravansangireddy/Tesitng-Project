export interface PrivacySettings {
  cloudEnabled: boolean;
  speechEnabled: boolean;
  noticeUrl: string;
  contact: string;
  retention: string;
  error: string;
}
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
