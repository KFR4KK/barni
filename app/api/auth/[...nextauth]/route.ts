import { handlers } from "@/lib/auth";

// Auth.js owns everything under /api/auth/* (sign-in, callback, sign-out,
// session, error redirects). No custom logic belongs in this file — it
// only wires the library's handlers to the route.
export const { GET, POST } = handlers;
