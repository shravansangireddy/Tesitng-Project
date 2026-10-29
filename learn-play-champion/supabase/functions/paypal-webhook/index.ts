import { webhookHandler } from "../_shared/payments.ts";

declare const Deno: { env: { get(name: string): string | undefined }; serve(handler: (request: Request) => Promise<Response>): void };
Deno.serve(request => webhookHandler(request, name => Deno.env.get(name)));
