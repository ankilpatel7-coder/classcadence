// Where each role lands after a successful sign-in or password setup.
// Centralized so the login form, /login page, and /auth/setup all agree.
export type AppRole =
  | "super_admin"
  | "tenant_admin"
  | "location_admin"
  | "front_desk"
  | null
  | undefined;

export function postLoginPathForRole(role: AppRole): string {
  switch (role) {
    case "super_admin":
      return "/admin/tenants";
    case "tenant_admin":
    case "location_admin":
    case "front_desk":
      return "/tenant";
    default:
      return "/";
  }
}
