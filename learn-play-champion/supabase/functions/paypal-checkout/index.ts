import { checkoutHandler } from "../_shared/payments.ts";

declare const Deno: { env: { get(name: string): string | undefined }; serve(handler: (request: Request) => Promise<Response>): void };
Deno.serve(request => checkoutHandler(request, name => Deno.env.get(name)));
