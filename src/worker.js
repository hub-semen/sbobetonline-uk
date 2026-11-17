/**
 * HTML landing from Worker assets; WordPress paths proxied to Cloudways.
 *
 * Requires DNS (DNS only / grey cloud):
 *   origin.sbobetonline.co.uk  A  164.92.207.251
 *
 * Do NOT fetch the orange-cloud apex or a raw IP + Host (causes 526 / 1003).
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
      originUrl.protocol = "http:";
      originUrl.hostname = ORIGIN_HOST;

      const headers = new Headers(request.headers);
      headers.set("Host", PUBLIC_HOST);
      headers.set("X-Forwarded-Proto", "https");
      headers.set("X-Forwarded-Host", PUBLIC_HOST);
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
