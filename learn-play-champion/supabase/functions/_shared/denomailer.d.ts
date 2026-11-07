// Minimal ambient typings for the denomailer SMTP client, covering only
// the surface _shared/mailer.ts uses. The functions project type-checks
// with the plain TypeScript compiler (npm run build), which cannot
// resolve an https: module specifier on its own; Deno resolves the real
// library at deploy/runtime. Keeping the declaration exact-URL-scoped
// means the runtime import and this file can never drift apart silently:
// change one and the other stops matching on purpose.
declare module "https://deno.land/x/denomailer@1.6.0/mod.ts" {
  export interface SmtpConnectOptions {
    hostname: string;
    port?: number;
    tls?: boolean;
    auth?: {
      username: string;
      password: string;
    };
  }

  export interface SmtpSendOptions {
    from: string;
    to: string;
    subject: string;
    content?: string;
    html?: string;
  }

  export class SmtpClient {
    connect(options: SmtpConnectOptions): Promise<void>;
    send(options: SmtpSendOptions): Promise<void>;
    close(): Promise<void>;
  }
}
