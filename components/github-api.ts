// The site's reads of GitHub's REST API. With GITHUB_PROXY_URL and REVALIDATE_SECRET set they go through Kira
// (GET <proxy>/repos/…, the same bearer secret as /api/revalidate): Kira's GitHub App and its ETag cache, so the
// revalidations Kira asks for on every change don't run into the 60 requests an hour this host gets without a token.
// When Kira doesn't answer, the read goes straight to api.github.com, as before.
const API = "https://api.github.com";
const TIMEOUT = 20_000;

export async function githubFetch(path: string, { full = false }: { full?: boolean } = {}): Promise<Response> {
  const proxy = process.env.GITHUB_PROXY_URL?.trim().replace(/\/+$/, "");
  const secret = process.env.REVALIDATE_SECRET?.trim();
  if (proxy && secret) {
    try {
      const res = await fetch(`${proxy}${path}`, {
        headers: { Authorization: `Bearer ${secret}`, ...(full ? { "X-GitHub-Accept": "full" } : {}) },
        signal: AbortSignal.timeout(TIMEOUT),
      });
      if (res.ok) return res;
      if (res.status !== 404) console.error(`Kira's GitHub proxy answered ${res.status} for ${path}: reading GitHub directly`);
    } catch (error) {
      console.error(`Kira's GitHub proxy failed for ${path}: reading GitHub directly`, error);
    }
  }
  return fetch(`${API}${path}`, {
    headers: {
      Accept: full ? "application/vnd.github.full+json" : "application/vnd.github+json",
      ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
    },
    signal: AbortSignal.timeout(TIMEOUT),
  });
}
