// Self-contained HTML fallback for catastrophic SSR failures.
// MUST NOT import any app code — the same module-init failure that triggers
// the wrapper could otherwise also break this page.
export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Something went wrong</title>
    <style>
      :root { color-scheme: dark light; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        background: #0b0f17;
        color: #e6edf3;
        padding: 24px;
      }
      .card {
        max-width: 460px;
        width: 100%;
        text-align: center;
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 14px;
        padding: 32px;
      }
      h1 { margin: 0 0 8px; font-size: 22px; font-weight: 600; }
      p { margin: 0 0 24px; color: #9aa4b2; font-size: 14px; line-height: 1.5; }
      .actions { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
      button, a.btn {
        appearance: none;
        border: 1px solid rgba(255,255,255,0.12);
        background: #1f6feb;
        color: white;
        padding: 10px 16px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        text-decoration: none;
        display: inline-block;
      }
      a.btn.secondary { background: transparent; color: #e6edf3; }
      button:hover, a.btn:hover { opacity: 0.9; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Something went wrong</h1>
      <p>The server hit an unexpected error. You can refresh this page or return to the home page.</p>
      <div class="actions">
        <button onclick="window.location.reload()">Refresh</button>
        <a class="btn secondary" href="/">Go home</a>
      </div>
    </div>
  </body>
</html>`;
}
