// Welcome emails for Learn & Play Champion: the message builders and the
// "is this a brand-new parent account?" age gate live here, pure and
// import-free, so the welcome-email Edge Function, the kid-accounts
// function, and the src test suite can all share one definition of the
// copy. Sending itself lives in _shared/mailer.ts (Deno SMTP); this
// module never sends anything.
//
// Two welcomes exist:
//   * parent_welcome — sent once to a grown-up shortly after they
//     register (see the welcome-email function), and
//   * kid_welcome — sent once to the creating grown-up each time they
//     add a kid login (see the create action in kid-accounts).
// Both are recorded in public.welcome_email_log so nobody is welcomed
// twice; that table is the functions' source of truth, not this module.
//
// Copy rules (deliberate): every email has exactly ONE call to action —
// a single button into the app — and the plain-text version carries the
// bare app URL exactly once, in the same place the button sits in HTML.

/** The one place every welcome button points. */
export const APP_URL = "https://learnplaychampion.com";

/**
 * A parent account counts as "new" for the welcome email for this many
 * days after registration. The client asks the welcome-email function on
 * grown-up sign-ins, and the age gate is what stops the function from
 * welcoming long-standing accounts the first time the trigger ships.
 */
export const PARENT_WELCOME_MAX_AGE_DAYS = 14;

export interface WelcomeEmail {
  subject: string;
  text: string;
  html: string;
}

/** Escapes a value for interpolation into the HTML body. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const DAY_MS = 24 * 60 * 60 * 1000;
// A few minutes of clock skew between the auth server and the function
// must not make a just-registered account look like it was created in
// the future and therefore "not new".
const CLOCK_SKEW_MS = 5 * 60 * 1000;

/**
 * True when the account was created within the welcome window ending
 * now. An unparseable timestamp is never "new" — a welcome is a
 * nice-to-have, never something to guess at.
 */
export function isNewParentAccount(
  createdAtIso: string,
  now: Date,
): boolean {
  const created = Date.parse(createdAtIso);
  if (Number.isNaN(created)) return false;
  const age = now.getTime() - created;
  return age >= -CLOCK_SKEW_MS && age <= PARENT_WELCOME_MAX_AGE_DAYS * DAY_MS;
}

function buttonHtml(label: string): string {
  return `<p style="margin:28px 0;"><a href="${APP_URL}" style="display:inline-block;background:#6d4fc2;color:#ffffff;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:999px;">${label}</a></p>`;
}

function wrapHtml(title: string, paragraphs: string[]): string {
  return [
    `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#26233a;max-width:560px;margin:0 auto;padding:24px;">`,
    `<p style="font-size:20px;font-weight:800;margin:0 0 16px;">${title}</p>`,
    ...paragraphs,
    `</div>`,
  ].join("\n");
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 14px;line-height:1.55;">${text}</p>`;
}

/** The welcome a grown-up gets once, shortly after registering. */
export function buildParentWelcomeEmail(): WelcomeEmail {
  const subject = "Welcome to Learn & Play Champion 🎉";
  const text = [
    "Welcome to Learn & Play Champion!",
    "",
    "We're so glad you're here. Learn & Play Champion is free Pre-K–Grade 5 English and Math practice for your family: 18,216 original questions, stories, spelling games, and little adventures — with no ads and no subscriptions, ever.",
    "",
    "As a grown-up member, you can see exactly what your child practiced today and set the tasks yourself — the spelling list, the times tables, your call. It's safe by design: no ads, no chat, no strangers, and no in-app purchases. Learn & Play Champion was built by a parent who got tired of subscription apps — so this one is free.",
    "",
    `Start exploring: ${APP_URL}`,
    "",
    "When you're ready, add a login for your child from the Parents dashboard. They'll find games and stories picked for their grade, and you can set gentle tasks and watch their progress grow.",
    "",
    "Happy learning,",
    "The Learn & Play Champion family",
    "Building bright minds for future generations",
  ].join("\n");
  const html = wrapHtml(escapeHtml("Welcome to Learn & Play Champion! 🎉"), [
    paragraph(
      "We're so glad you're here. Learn &amp; Play Champion is free Pre-K–Grade 5 English and Math practice for your family: 18,216 original questions, stories, spelling games, and little adventures — with no ads and no subscriptions, ever.",
    ),
    paragraph(
      "As a grown-up member, you can see exactly what your child practiced today and set the tasks yourself — the spelling list, the times tables, your call. It's safe by design: no ads, no chat, no strangers, and no in-app purchases. Learn &amp; Play Champion was built by a parent who got tired of subscription apps — so this one is free.",
    ),
    buttonHtml("Start exploring"),
    paragraph(
      "When you're ready, add a login for your child from the Parents dashboard. They'll find games and stories picked for their grade, and you can set gentle tasks and watch their progress grow.",
    ),
    paragraph("Happy learning,<br>The Learn &amp; Play Champion family"),
    paragraph(
      "<em>Building bright minds for future generations</em>",
    ),
  ]);
  return { subject, text, html };
}

export interface KidWelcomeInput {
  kidDisplayName: string;
  kidUsername: string;
  gradeLabel: string;
}

/** The welcome a grown-up gets each time they add a kid login. */
export function buildKidWelcomeEmail(input: KidWelcomeInput): WelcomeEmail {
  const name = input.kidDisplayName;
  const subject = `🎉 ${name} is ready to play!`;
  const text = [
    `Great news — ${name}'s Learn & Play Champion login is ready!`,
    "",
    `Username: ${input.kidUsername}`,
    `Grade: ${input.gradeLabel}`,
    "",
    `All 20 skills are already waiting on ${name}'s home screen — reading, math, spelling, Word Battle, and a Motivation Book to start. Every step is small, friendly, and free.`,
    "",
    `Open Learn & Play Champion: ${APP_URL}`,
    "",
    `${name} signs in with the username above and a 4-digit PIN. Need to set or change the PIN? You'll find it under Parents dashboard → Kid logins.`,
    "",
    "Tiny steps, every day,",
    "The Learn & Play Champion family",
  ].join("\n");
  const safeName = escapeHtml(name);
  const html = wrapHtml(escapeHtml(`🎉 ${name} is ready to play!`), [
    paragraph(
      `Great news — <strong>${safeName}</strong>'s Learn &amp; Play Champion login is ready!`,
    ),
    paragraph(
      `Username: <strong>${escapeHtml(input.kidUsername)}</strong><br>Grade: <strong>${escapeHtml(input.gradeLabel)}</strong>`,
    ),
    paragraph(
      `All 20 skills are already waiting on ${safeName}'s home screen — reading, math, spelling, Word Battle, and a Motivation Book to start. Every step is small, friendly, and free.`,
    ),
    buttonHtml("Open Learn & Play Champion"),
    paragraph(
      `${safeName} signs in with the username above and a 4-digit PIN. Need to set or change the PIN? You'll find it under Parents dashboard → Kid logins.`,
    ),
    paragraph("Tiny steps, every day,<br>The Learn &amp; Play Champion family"),
  ]);
  return { subject, text, html };
}
