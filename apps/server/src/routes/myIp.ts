import { Hono } from "hono";

const IPINFO_URL = "https://ipinfo.io/json";
const CACHE_TTL_MS = 60_000;
const FETCH_TIMEOUT_MS = 8_000;

// In-memory only: this is informational data, not worth persisting.
let cache: { data: unknown; fetchedAt: number } | null = null;

export const myIpRouter = new Hono();

myIpRouter.get("/my-ip", async (c) => {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return c.json(cache.data);
  }

  let res: Response;
  try {
    res = await fetch(IPINFO_URL, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "TimeoutError";
    return c.json(
      {
        error: timedOut
          ? "ipinfo.io did not respond in time. Check your internet connection."
          : "Could not reach ipinfo.io. Check your internet connection.",
      },
      502,
    );
  }

  if (res.status === 429) {
    return c.json({ error: "ipinfo.io rate limit reached. Try again later." }, 429);
  }
  if (!res.ok) {
    return c.json({ error: `ipinfo.io returned an error (HTTP ${res.status}).` }, 502);
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return c.json({ error: "ipinfo.io returned an invalid response." }, 502);
  }

  cache = { data, fetchedAt: Date.now() };
  return c.json(data);
});
