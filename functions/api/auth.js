/**
 * Disabled intentionally: the legacy login decoded an unverified Google JWT.
 * It must not be reopened until server-side signature, issuer, audience, and
 * expiration verification plus a secure session design are implemented.
 * The currently deployed Next.js frontend does not require login.
 */
export async function onRequest() {
  return new Response(JSON.stringify({
    error: 'Google sign-in is temporarily unavailable',
  }), {
    status: 503,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
