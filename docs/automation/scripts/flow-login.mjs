// ENV: node — run with `node docs/automation/scripts/flow-login.mjs`
// Opens Google Flow in a HEADED Patchright browser on a persistent profile so a human can
// sign in with Google by hand. Vanilla Playwright is detected by Google's OAuth and refused
// ("this browser or app may not be secure"), which is why this uses Patchright + real Chrome.
//
// The agent never types the password: this script only opens the window and watches for the
// signed-in state. The profile persists, so the login is a one-time cost.

import { chromium } from '/Users/macbook/Documents/PROJECT_MISPAQUL_ATTORIQ/cc-toriq/node_modules/patchright/index.mjs';

const PROFILE = '/Users/macbook/Documents/PROJECT_MISPAQUL_ATTORIQ/flowkit/docs/profile/patchright-flow';
const FLOW_URL = 'https://labs.google/fx/tools/flow';
const MAX_WAIT_MS = 15 * 60 * 1000;

const ctx = await chromium.launchPersistentContext(PROFILE, {
  headless: false,
  channel: 'chrome',        // real Chrome; do NOT set a custom userAgent with Patchright
  viewport: null,
  args: ['--start-maximized'],
});

const page = ctx.pages()[0] ?? (await ctx.newPage());
await page.goto(FLOW_URL, { waitUntil: 'domcontentloaded' }).catch(() => {});

console.log('WINDOW_OPEN');
console.log('Sign in with Google in the window that just opened.');

const started = Date.now();
let announced = false;

while (Date.now() - started < MAX_WAIT_MS) {
  await new Promise((r) => setTimeout(r, 5000));
  let state;
  try {
    state = await page.evaluate(() => ({
      url: location.href,
      text: document.body ? document.body.innerText.slice(0, 300) : '',
    }));
  } catch {
    continue; // mid-navigation
  }

  // URL is NOT a login signal: the signed-out landing page sits on the same /tools/flow URL,
  // which false-positives any href check. The session cookie is the only authoritative proof.
  const cookies = await ctx.cookies();
  const loggedIn = cookies.some(
    (c) => c.name === '__Secure-next-auth.session-token' && c.value,
  );

  if (!announced && !loggedIn) {
    console.log('STATUS: waiting for human login…');
    announced = true;
  }

  if (loggedIn) {
    console.log('LOGGED_IN');
    console.log('URL:', state.url);
    // Persist a storage state snapshot for reuse (contains credentials — chmod 600 by caller).
    await ctx.storageState({ path: `${PROFILE}/storage-state.json` });
    console.log('STORAGE_SAVED');
    break;
  }
}

console.log('HOLDING_OPEN — browser stays up for the agent to drive.');
// Keep the process (and the window) alive so the authenticated session can be used.
await new Promise(() => {});
