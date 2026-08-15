// ENV: node — `node docs/automation/scripts/flow-agent-probe.mjs`
// DISCOVERY ONLY. Reads the real accessibility tree of the Flow project page and prints every
// control's role + accessible name. Changes nothing, clicks nothing, types nothing.
//
// Exists because a selector written from memory is a guess: the accessible name frequently is
// NOT the visible text, and this page carries two different buttons whose visible text is
// "Buat". The action script is written only after reading this output.

import { chromium } from '/Users/macbook/Documents/PROJECT_MISPAQUL_ATTORIQ/cc-toriq/node_modules/patchright/index.mjs';

const PROFILE = '/Users/macbook/Documents/PROJECT_MISPAQUL_ATTORIQ/flowkit/docs/profile/patchright-flow';
const PROJECT_URL =
  'https://labs.google/fx/id/tools/flow/project/94cc55f7-ebd5-4123-b12a-c8bf8cabf9ff';

const ctx = await chromium.launchPersistentContext(PROFILE, {
  headless: false,
  channel: 'chrome',
  viewport: null,
  args: ['--start-maximized'],
});
const page = ctx.pages()[0] ?? (await ctx.newPage());
await page.goto(PROJECT_URL, { waitUntil: 'domcontentloaded' }).catch(() => {});

// Condition-based wait, not a fixed sleep: names the thing that never became true.
async function until(fn, label, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      if (await fn()) return true;
    } catch {}
    await page.waitForTimeout(500);
  }
  throw new Error(`TIMEOUT waiting for: ${label}`);
}

console.log('URL:', page.url());
if (page.url().includes('signin') || page.url().includes('accounts.google.com')) {
  console.log('RESULT: NOT_AUTHENTICATED');
  await ctx.close();
  process.exit(1);
}

await until(
  async () => (await page.getByRole('textbox').count()) > 0,
  'at least one textbox (composer) to exist',
);

// The authoritative accessible-name source: Playwright's own aria snapshot.
const aria = await page.locator('body').ariaSnapshot();
const lines = aria.split('\n');
const controls = lines.filter((l) => /^\s*-\s*(button|textbox|combobox|tab|menuitem)\b/.test(l));

console.log('=== CONTROLS (role + ACCESSIBLE NAME, read from the a11y tree) ===');
controls.forEach((l, i) => console.log(`${String(i).padStart(3)}  ${l.trim().slice(0, 120)}`));

console.log('=== COMPOSER REGION (tail of aria snapshot) ===');
console.log(lines.slice(-40).join('\n'));

// How many generated-image cards does the project hold right now? Scroll the media pane so
// virtualised cards mount, then count by the card's own accessible name.
for (let i = 0; i < 12; i++) {
  await page.mouse.wheel(0, 2000);
  await page.waitForTimeout(400);
}
const cards = await page.getByRole('button', { name: 'Gambar yang dihasilkan', exact: true }).count();
console.log('GENERATED_IMAGE_CARDS:', cards);

const shot = '/tmp/fk_review/flow_project_state.png';
await page.screenshot({ path: shot, fullPage: false });
console.log('SCREENSHOT:', shot);

await ctx.close();
console.log('PROBE_DONE (browser closed, nothing modified)');
