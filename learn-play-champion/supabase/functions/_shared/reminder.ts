// The "remind to add kids" email for Learn & Play Champion: the
// message builder lives here, pure and send-free, so the
// parent-reminder Edge Function and the src test suite share one
// definition of the copy. Sending itself lives in _shared/mailer.ts
// (Deno SMTP); this module never sends anything.
//
// The audience is a grown-up who registered but has not added a kid
// login yet. The tone is a warm, motivational nudge — never a scold:
// their child's practice is ready and waiting, adding the login takes
// about a minute, and every small step their child takes will be
// visible in the Parents dashboard. No parent name is available to
// the sender, so the greeting never carries a name placeholder.
//
// Copy rules (deliberate, mirroring _shared/welcome.ts): exactly ONE
// call to action — a single button into the app — and the plain-text
// version carries the bare app URL exactly once, in the same place
// the button sits in HTML. APP_URL and escapeHtml are shared with the
// welcome module so the whole mail family agrees on both.

import { APP_URL, escapeHtml } from "./welcome.ts";

export { APP_URL };

export interface ReminderEmail {
  subject: string;
  text: string;
  html: string;
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

/** The reminder a grown-up gets when an administrator nudges them to
 * add their kid's login. Takes no input — nothing personal is known
 * about the recipient beyond their email address. */
export function buildParentReminderEmail(): ReminderEmail {
  const subject = "Your child's free practice is waiting 🎉";
  const text = [
    "Hello from Learn & Play Champion!",
    "",
    "You took the first step and created a free Learn & Play Champion account — your child's practice is ready and waiting whenever they are. All that's missing is their very own login.",
    "",
    "Adding it takes about a minute: sign in, open Parents dashboard → Kid logins, and create your child's login. They'll get all 20 skills for their grade, stories to explore, and progress that's all their own to be proud of.",
    "",
    `Add your kid's login: ${APP_URL}`,
    "",
    "Then watch their progress grow from the Parents dashboard — every book finished, every skill practiced, every little win adds up. Tiny steps, taken every day, turn into big, confident learning.",
    "",
    "We can't wait to cheer them on,",
    "The Learn & Play Champion family",
    "Building bright minds for future generations",
  ].join("\n");
  const html = wrapHtml(escapeHtml("Your child's free practice is waiting 🎉"), [
    paragraph(
      "You took the first step and created a free Learn &amp; Play Champion account — your child's practice is ready and waiting whenever they are. All that's missing is their very own login.",
    ),
    paragraph(
      "Adding it takes about a minute: sign in, open <strong>Parents dashboard → Kid logins</strong>, and create your child's login. They'll get all 20 skills for their grade, stories to explore, and progress that's all their own to be proud of.",
    ),
    buttonHtml("Add your kid's login"),
    paragraph(
      "Then watch their progress grow from the Parents dashboard — every book finished, every skill practiced, every little win adds up. Tiny steps, taken every day, turn into big, confident learning.",
    ),
    paragraph("We can't wait to cheer them on,<br>The Learn &amp; Play Champion family"),
    paragraph(
      "<em>Building bright minds for future generations</em>",
    ),
  ]);
  return { subject, text, html };
}
