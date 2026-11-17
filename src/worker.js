/**
 * HTML landing from Worker assets; WordPress paths proxied to Cloudways.
 *
 * DNS (required):
 *   @ / www     → 164.92.207.251  Proxied (orange)
 *   origin      → 164.92.207.251  DNS only (grey)
 *
 * Cloudways (required):
 *   Domain Management → add alias: origin.sbobetonline.co.uk
 *   SSL Certificate → Let's Encrypt for origin.sbobetonline.co.uk
 *   (Workers cannot reliably override Host; origin hostname must be mapped.)
 */

const ORIGIN_HOST = "origin.sbobetonline.co.uk";
const PUBLIC_HOST = "sbobetonline.co.uk";

const WP_PREFIXES = [
  "/wp-admin",
  "/wp-content",
  "/wp-includes",
  "/wp-json",
];

const WP_EXACT = [
  "/wp-login.php",
  "/wp-cron.php",
  "/xmlrpc.php",
  "/wp-comments-post.php",
  "/wp-trackback.php",
  "/wp-signup.php",
  "/wp-activate.php",
  "/wp-mail.php",
  "/wp-load.php",
];

function isWordPress(pathname) {
  if (WP_EXACT.includes(pathname)) return true;
  if (WP_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return true;
  }
  if (/^\/wp-[a-z0-9_-]+\.php$/i.test(pathname)) return true;
  return false;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (isWordPress(url.pathname)) {
      const originUrl = new URL(request.url);
      // Requires Let's Encrypt (or other) cert for origin.sbobetonline.co.uk on Cloudways
      originUrl.protocol = "https:";
      originUrl.hostname = ORIGIN_HOST;

      const headers = new Headers(request.headers);
      // Host will be origin.sbobetonline.co.uk (Workers set this from the URL).
      // That hostname MUST be added in Cloudways Domain Management.
      headers.set("X-Forwarded-Proto", "https");
      headers.set("X-Forwarded-Host", PUBLIC_HOST);
      headers.set("X-Forwarded-For", request.headers.get("CF-Connecting-IP") || "");
      headers.delete("cf-connecting-ip");
      headers.delete("cf-ray");
      headers.delete("cf-visitor");
      headers.delete("cf-ipcountry");

      return fetch(
        new Request(originUrl.toString(), {
          method: request.method,
          headers,
          body: request.body,
          redirect: "manual",
        })
      );
    }

    return env.ASSETS.fetch(request);
  },
};
