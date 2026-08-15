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

import { chromium } from '/Users/macbook/Documents/PROJECT_MISPAQUL_ATTORIQ/cc-toriq/node_modules/patchright/index.mjs';

const PROFILE = '/Users/macbook/Documents/PROJECT_MISPAQUL_ATTORIQ/flowkit/docs/profile/patchright-flow';
const PROJECT_URL =
  'https://labs.google/fx/id/tools/flow/project/94cc55f7-ebd5-4123-b12a-c8bf8cabf9ff';
const SUBMIT_NAME = 'arrow_forward Buat';
const PLACEHOLDER = 'Apa yang ingin Anda buat';

const message = process.argv[2];
if (!message) {
  console.error('usage: node flow-agent-send.mjs "<message>"');
  process.exit(2);
}

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

await ctx.storageState({ path: `${PROFILE}/storage-state.json` });
console.log('HOLDING_OPEN');
await new Promise(() => {});
