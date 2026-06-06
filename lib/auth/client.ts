// Neon Auth (Better Auth) client. Usable in both client components (reads the
// browser session cookie automatically) and server code (forward the request
// cookies via fetchOptions — see getServerSession in ./session).
//
// Exposes the Better Auth API:
//   signIn.email({ email, password })       — replaces supabase.auth.signInWithPassword
//   signOut()                                — replaces supabase.auth.signOut
//   getSession()                             — replaces supabase.auth.getUser
//   changePassword({ currentPassword, newPassword }) — password change
//   admin.createUser({ email, password, name }) — replaces service.auth.admin.createUser
//   admin.removeUser({ userId })             — replaces service.auth.admin.deleteUser
//   admin.setUserPassword({ userId, newPassword })
//   token()                                  — mints a JWT (for Neon Authorize/RLS later)
import { createAuthClient } from "@neondatabase/neon-auth-next";

export const authClient = createAuthClient();
