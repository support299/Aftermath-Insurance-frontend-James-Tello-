/** Reload once when a stale cached page references deleted JS/CSS after deploy. */
export const CACHE_BUST_PARAM = "_cb";
const CHUNK_RELOAD_KEY = "app-chunk-reload";

export function bustCacheReload(): void {
  if (sessionStorage.getItem(CHUNK_RELOAD_KEY)) return;
  sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
  const url = new URL(window.location.href);
  url.searchParams.set(CACHE_BUST_PARAM, String(Date.now()));
  window.location.replace(url.toString());
}

export function registerChunkReloadHandler(): void {
  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();
    bustCacheReload();
  });
}

export function clearChunkReloadFlag(): void {
  sessionStorage.removeItem(CHUNK_RELOAD_KEY);
  const url = new URL(window.location.href);
  if (!url.searchParams.has(CACHE_BUST_PARAM)) return;
  url.searchParams.delete(CACHE_BUST_PARAM);
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}
