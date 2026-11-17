/**
 * HTML landing from Worker assets; WordPress paths proxied to Cloudways.
 *
 * DNS:
 *   @ / www  → 164.92.207.251  Proxied (orange)
 *   origin   → 164.92.207.251  DNS only (grey)
 *
 * Cloudways:
 *   Domain alias + Let's Encrypt covering origin.sbobetonline.co.uk
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
  "/wp-login", // convenience alias → proxied as /wp-login.php
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

function rewriteOriginUrls(text) {
  if (!text) return text;
  return text
    .replaceAll(`https://${ORIGIN_HOST}`, `https://${PUBLIC_HOST}`)
    .replaceAll(`http://${ORIGIN_HOST}`, `https://${PUBLIC_HOST}`)
    .replaceAll(ORIGIN_HOST, PUBLIC_HOST);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (isWordPress(url.pathname)) {
      const originUrl = new URL(request.url);
      originUrl.protocol = "https:";
      originUrl.hostname = ORIGIN_HOST;
      // /wp-login (no .php) is not a WP file — map it
      if (originUrl.pathname === "/wp-login") {
        originUrl.pathname = "/wp-login.php";
      }

      const headers = new Headers(request.headers);
      headers.set("X-Forwarded-Proto", "https");
      headers.set("X-Forwarded-Host", PUBLIC_HOST);
      headers.set("X-Forwarded-For", request.headers.get("CF-Connecting-IP") || "");
      headers.delete("cf-connecting-ip");
      headers.delete("cf-ray");
      headers.delete("cf-visitor");
      headers.delete("cf-ipcountry");

      const response = await fetch(
        new Request(originUrl.toString(), {
          method: request.method,
          headers,
          body: request.body,
          redirect: "manual",
        })
      );

      // Fix redirects/cookies that use origin.sbobetonline.co.uk
      const outHeaders = new Headers(response.headers);
      const loc = outHeaders.get("Location");
      if (loc) outHeaders.set("Location", rewriteOriginUrls(loc));

      const ctype = outHeaders.get("Content-Type") || "";
      if (ctype.includes("text/html") || ctype.includes("application/json")) {
        const body = rewriteOriginUrls(await response.text());
        return new Response(body, {
          status: response.status,
          statusText: response.statusText,
          headers: outHeaders,
        });
      }

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: outHeaders,
      });
    }

    return env.ASSETS.fetch(request);
  },
};
