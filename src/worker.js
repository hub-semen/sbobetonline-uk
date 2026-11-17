/**
 * HTML landing from Worker assets; WordPress paths proxied to Cloudways.
 * Origin: Cloudways apps hostname (valid SSL, no grey-cloud subdomain needed).
 */

const ORIGIN_HOST = "wordpress-1485727-6510733.cloudwaysapps.com";

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
      originUrl.hostname = ORIGIN_HOST;

      return fetch(
        new Request(originUrl.toString(), {
          method: request.method,
          headers: request.headers,
          body: request.body,
          redirect: "manual",
        })
      );
    }

    return env.ASSETS.fetch(request);
  },
};
