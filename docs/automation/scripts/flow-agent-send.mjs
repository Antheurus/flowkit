// ENV: node — `node docs/automation/scripts/flow-agent-send.mjs "<message>"`
// Sends one message to the in-project Google Flow Agent and reports its reply.
//
// Written ONLY after flow-agent-probe.mjs read the live accessibility tree. Every name below
// is quoted from that output, not from memory:
//   - submit button accessible name is exactly "arrow_forward Buat", and it renders [disabled]
//     until the composer holds text. A second button reads "add_2 Buat" (add media), which is
//     why the match is exact:true — a substring match on "Buat" hits the wrong control.
//   - the composer is the contenteditable textbox carrying the placeholder text
//     "Apa yang ingin Anda buat?".
//   - "Agen" renders [pressed], i.e. agent mode is already on; the script asserts it.
//
// The composer is not selected by position. It is selected by its placeholder text and then
// CONFIRMED behaviourally: typing must flip the submit button from disabled to enabled. If it
// does not, the script stops and reports, rather than trying another selector.

import fs from 'node:fs';
import { chromium } from '/Users/macbook/Documents/PROJECT_MISPAQUL_ATTORIQ/cc-toriq/node_modules/patchright/index.mjs';

const PROFILE = '/Users/macbook/Documents/PROJECT_MISPAQUL_ATTORIQ/flowkit/docs/profile/patchright-flow';
const SUBMIT_NAME = 'arrow_forward Buat';
const PLACEHOLDER = 'Apa yang ingin Anda buat';

const message = process.argv[2];
const projectId = process.argv[3] || process.env.FK_PROJECT_ID;
if (!message || !projectId) {
  console.error('usage: node flow-agent-send.mjs "<message>" <project_id>');
  process.exit(2);
}
const PROJECT_URL = `https://labs.google/fx/id/tools/flow/project/${projectId}`;

const ctx = await chromium.launchPersistentContext(PROFILE, {
  headless: false,
  channel: 'chrome',
  viewport: null,
  args: ['--start-maximized'],
});
const page = ctx.pages()[0] ?? (await ctx.newPage());

async function until(fn, label, timeoutMs = 90000) {
  const start = Date.now();
  let last;
  while (Date.now() - start < timeoutMs) {
    try {
      last = await fn();
      if (last) return last;
    } catch (e) {
      last = e.message;
    }
    await page.waitForTimeout(500);
  }
  throw new Error(`TIMEOUT waiting for: ${label} (last=${last})`);
}

await page.goto(PROJECT_URL, { waitUntil: 'domcontentloaded' }).catch(() => {});
console.log('URL:', page.url());
if (page.url().includes('signin') || page.url().includes('accounts.google.com')) {
  console.log('RESULT: NOT_AUTHENTICATED');
  await ctx.close();
  process.exit(1);
}

const submit = page.getByRole('button', { name: SUBMIT_NAME, exact: true });
await until(async () => (await submit.count()) === 1, 'exactly one "arrow_forward Buat" button');

const agent = page.getByRole('button', { name: 'Agen', exact: true });
if ((await agent.count()) === 1) {
  const pressed = await agent.getAttribute('aria-pressed');
  console.log('AGENT_MODE_PRESSED:', pressed);
  if (pressed === 'false') {
    await agent.click();
    console.log('AGENT_MODE: toggled on');
  }
}

const composer = page.getByRole('textbox').filter({ hasText: PLACEHOLDER });
const n = await composer.count();
console.log('COMPOSER_MATCHES:', n);
if (n !== 1) {
  console.log(`RESULT: COMPOSER_AMBIGUOUS(${n}) — stopping, not guessing`);
  await ctx.close();
  process.exit(1);
}

console.log('SUBMIT_DISABLED_BEFORE:', await submit.isDisabled());
await composer.click();
await page.keyboard.type(message, { delay: 3 });

// Behavioural confirmation that the text landed in the RIGHT box.
try {
  await until(async () => !(await submit.isDisabled()), 'submit to become enabled after typing', 20000);
} catch (e) {
  console.log('RESULT: SUBMIT_NEVER_ENABLED — wrong textbox or text rejected.', e.message);
  await ctx.close();
  process.exit(1);
}
console.log('SUBMIT_ENABLED_AFTER: true  (confirms the composer was correct)');

// ── Capture the Agent's own network contract ──────────────────────────────
// The point of this whole script is to learn the request so PRODUCTION can replay it
// through the extension's existing api_request/trpc_request path instead of driving a
// browser. Bodies are kept verbatim; Authorization/Cookie are redacted because this output
// is read by a human and must never carry a live bearer token.
const REDACT = new Set(['authorization', 'cookie', 'x-goog-api-key', 'set-cookie']);
const captured = [];
page.on('request', (req) => {
  const url = req.url();
  if (!/labs\.google\/fx\/api|aisandbox-pa\.googleapis\.com/.test(url)) return;
  if (req.method() === 'GET') return;
  const headers = {};
  for (const [k, v] of Object.entries(req.headers())) {
    headers[k] = REDACT.has(k.toLowerCase()) ? '<<REDACTED>>' : v;
  }
  captured.push({
    method: req.method(),
    url,
    headers,
    body: (req.postData() || '').slice(0, 20000),
  });
});

const before = await page.evaluate(() => document.body.innerText.length);
await submit.click();
console.log('SUBMITTED');

let lastLen = before;
for (let i = 0; i < 36; i++) {
  await page.waitForTimeout(5000);
  if (page.url().includes('signin')) {
    console.log('RESULT: BOUNCED_TO_SIGNIN');
    break;
  }
  const s = await page
    .evaluate(() => ({ len: document.body.innerText.length, tail: document.body.innerText.slice(-700) }))
    .catch(() => null);
  if (!s) continue;
  if (s.len !== lastLen) {
    console.log(`--- change at poll ${i + 1} (${lastLen} -> ${s.len}) ---`);
    console.log(s.tail);
    lastLen = s.len;
  }
}

// Persist the captured contract for sla-codify / the extension implementation.
// captures/ is gitignored: bodies are verbatim and may carry project-identifying data.
const capDir = '/Users/macbook/Documents/PROJECT_MISPAQUL_ATTORIQ/flowkit/docs/automation/captures';
fs.mkdirSync(capDir, { recursive: true });
const capPath = `${capDir}/flow-agent-submit.json`;
fs.writeFileSync(capPath, JSON.stringify(captured, null, 2));
console.log('CAPTURED_REQUESTS:', captured.length, '->', capPath);
for (const c of captured) {
  console.log(`  ${c.method} ${c.url.slice(0, 130)}`);
}

await ctx.storageState({ path: `${PROFILE}/storage-state.json` });
console.log('DONE');
await ctx.close();
