/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // typedRoutes was enabled but fails when Link href points to routes not yet created.
  // Re-enable later once Claude Code has built /login, /signup, /admin/*, /dashboard/*.
};

export default nextConfig;
