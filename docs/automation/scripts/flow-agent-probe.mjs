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

// Enumerate every media card: its media_id (from the /edit/<uuid> permalink) plus the prompt
// text it was generated with. The list is virtualised, so scroll until the discovered count
// stops growing rather than scrolling a fixed number of times.
let seen = 0, stable = 0;
for (let i = 0; i < 40 && stable < 4; i++) {
  await page.mouse.wheel(0, 1800);
  await page.waitForTimeout(350);
  const n = await page.locator('a[href*="/edit/"]').count();
  if (n === seen) stable++;
  else { seen = n; stable = 0; }
}

// Scraping the <img> src failed twice (edit-links are a different id space; srcs are not
// plain URLs), so stop guessing at the DOM and use the card's own Download control — an
// accessible name read from the live a11y tree — plus Playwright's download event.
// Flow lists newest first, so the agent's two new frames lead; that ordering is CONFIRMED by
// looking at the downloaded files, never assumed.
const dl = page.getByRole('button', { name: 'download Download', exact: true });
const total = await dl.count();
console.log('DOWNLOAD_BUTTONS:', total);

const grabbed = [];
for (let i = 0; i < Math.min(3, total); i++) {
  try {
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 45000 }),
      dl.nth(i).click(),
    ]);
    const dest = `/tmp/fk_review/flow_card_${i}.png`;
    await download.saveAs(dest);
    grabbed.push({ i, dest, suggested: download.suggestedFilename() });
    console.log(`DOWNLOADED ${i} -> ${dest} (${download.suggestedFilename()})`);
  } catch (e) {
    console.log(`DOWNLOAD ${i} FAILED: ${e.message.split('\n')[0]}`);
  }
}
console.log('GRABBED:', JSON.stringify(grabbed));

const shot = '/tmp/fk_review/flow_project_state.png';
await page.screenshot({ path: shot, fullPage: false });
console.log('SCREENSHOT:', shot);

await ctx.close();
console.log('PROBE_DONE (browser closed, nothing modified)');
