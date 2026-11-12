// Ambient typings for the denomailer SMTP client, covering only the
// surface _shared/mailer.ts uses. The functions project type-checks with
// the plain TypeScript compiler (npm run build), which cannot resolve an
// https: module specifier on its own; Deno resolves the real library at
// deploy/runtime.
//
// These typings mirror denomailer@1.6.0's ACTUAL exported API: the module
// exports `SMTPClient`, which takes its connection config in the
// constructor and has NO connect() method. Import names must be checked
// against the real library before they are used here or in mailer.ts: a
// name the real module does not export will still pass local type-checks
// against this declaration, but the function will fail to boot in
// production. (That is exactly how a fictional client class with a
// connect() method shipped once — the declaration described the code's
// wishes instead of the library.)
declare module "https://deno.land/x/denomailer@1.6.0/mod.ts" {
  export interface SmtpConnectionOptions {
    hostname: string;
    port: number;
    tls: boolean;
    auth?: { username: string; password: string };
  }

  export interface SmtpClientOptions {
    connection: SmtpConnectionOptions;
  }

  export interface SmtpSendOptions {
    from: string;
    to: string;
    subject: string;
    content?: string;
    html?: string;
  }

  export class SMTPClient {
    constructor(options: SmtpClientOptions);
    send(options: SmtpSendOptions): Promise<void>;
    close(): Promise<void>;
  }
}
