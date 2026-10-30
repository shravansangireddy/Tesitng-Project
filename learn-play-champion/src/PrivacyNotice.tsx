import { privacy } from "./privacy";
import "./privacy.css";

export default function PrivacyNotice() {
  return <details className="privacy-notice">
    <summary>For grown-ups: privacy, school use &amp; data choices</summary>
    <p><strong>Kids:</strong> use pretend nicknames. Do not share names, addresses, passwords, photos,
      or private stories. Ask a trusted adult before joining a room or using a microphone.</p>
    <p>Guest learning stores progress, chosen grade, and theme in this browser.
      Optional completed learning-path checks also store per-skill correct/try-together results and dates,
      not typed answers. These are included in learning save/export/erasure controls.
      The app has no ads, trackers, chat, public profiles, or outside AI calls. The website host can still receive connection information such as IP addresses and browser logs.
      Local play is not a promise of zero data processing.</p>
    <p>A grade explicitly selected at email sign-in is included in the return link so the right lessons open.
      The host and email provider may log that link; no child name or birth date is requested.</p>
    <p>If enabled, Supabase receives the adult email, authentication/session information, learning progress,
      and optional room membership/participation records. Invited room members can see generated nicknames and weekly points.
      Nicknames are pseudonyms, not anonymous data. Browser voice providers may receive audio or text if voice is enabled.</p>
    <p>Adult email sign-in, a teacher account, and a checked box are <strong>not verified parental consent</strong>.
      Before online use with children under 13, the operator must provide the required notices and an appropriate consent/authorization process.
      School use needs district approval and an appropriate student-data agreement, purpose/use limits, access controls, and parent rights.
      A school cannot automatically authorize unrelated home or social uses.</p>
    <p><strong>Operator contact:</strong> {privacy.contact || "Not supplied: online collection is disabled."}<br />
      <strong>Retention/deletion:</strong> {privacy.retention || "No operator retention policy supplied. Guest data remains until cleared in this browser."}</p>
    {privacy.noticeUrl && <p><a href={privacy.noticeUrl} target="_blank" rel="noreferrer">Read the operator's full privacy notice (external site)</a></p>}
    <p>Use Privacy &amp; data in the app to review/export the current learning save and erase local progress.
      Cloud erasure removes learning/room records, not the adult login identity, emails, provider logs, or backups.
      Contact the operator for access, consent withdrawal, full account deletion, and applicable backup/deletion timelines.
      Do not enable online features until those requests can actually be fulfilled.</p>
    <p>This app is <strong>not certified COPPA/FERPA compliant</strong>. Compliance depends on the operator,
      school arrangements, providers, and applicable state law—not only software settings.</p>
    <p>Optional donations are only available from the grown-up privacy area. If an adult chooses to leave
      for PayPal, PayPal processes payment/account information under its own terms. Payment records
      include adult-linked donation requests, amounts, order IDs, and verified events in server storage, separate
      from learning progress. Payment tables do not store PayPal payer names/email addresses or card details.
      Learning erasure does not erase financial records; contact the operator for financial retention/access requests.
      Donations never affect learning access or rewards.</p>
    <p>Approved teachers can save teaching drafts on the server. Content administrators review and publish them.
      Published passages and questions are publicly readable, not private classroom messages.
      Drafts, review notes, author/account references, and action audit records are separate from learner progress.
      Do not submit student personal information. Contact the operator to report unsafe or unlicensed content
      or request author-data access/deletion; erasing learner progress does not erase teaching records.</p>
  </details>;
}
