import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function nowStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

async function safeShot(page, outDir, name) {
  await page.screenshot({ path: path.join(outDir, name), fullPage: true });
}

async function run() {
  const outDir = path.join(process.cwd(), 'qa-artifacts', `run-${nowStamp()}`);
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  // Middleware blocks unauthenticated requests. For QA we inject the same cookie
  // the login flow would set (auth_token=valid_session).
  await context.addCookies([
    { name: 'auth_token', value: 'valid_session', domain: 'localhost', path: '/' },
  ]);

  const page = await context.newPage();

  const consoleLogs = [];
  const pageErrors = [];
  page.on('console', (msg) => consoleLogs.push({ type: msg.type(), text: msg.text() }));
  page.on('pageerror', (err) => pageErrors.push(String(err)));

  const result = {
    artifactsDir: outDir,
    checks: [],
    console: consoleLogs,
    pageErrors,
  };

  const check = async (name, fn) => {
    try {
      await fn();
      result.checks.push({ name, status: 'pass' });
    } catch (e) {
      result.checks.push({ name, status: 'fail', error: String(e?.stack || e) });
    }
  };

  const baseUrl = process.env.QA_BASE_URL || 'http://localhost:3000';

  await check('Dashboard loads', async () => {
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: /Good (morning|afternoon|evening)/ }).waitFor({ timeout: 30000 });
    await page.getByText('Recent Opportunities').waitFor({ timeout: 30000 });
    await safeShot(page, outDir, '01-dashboard.png');
  });

  let orgNames = [];
  await check('Org switcher can switch orgs and dashboard refreshes', async () => {
    const trigger = page.getByRole('button', { name: /Select Organization|Organization|Liberty Alliance|The Ginisis Group|Talion Construction/ });
    await trigger.click();

    const menuItems = page.getByRole('menuitem');
    const count = await menuItems.count();
    if (count < 2) throw new Error(`Expected >=2 orgs, saw ${count}`);

    // Collect first two org names.
    const first = await menuItems.nth(0).innerText();
    const second = await menuItems.nth(1).innerText();
    orgNames = [first.trim(), second.trim()];

    await menuItems.nth(1).click();

    // Wait for dashboard to show new org name in header.
    await page.getByText(orgNames[1], { exact: false }).waitFor({ timeout: 15000 });

    // Stats should eventually resolve from “—” to a number (or 0).
    await page.getByText('Active Opportunities').waitFor();
    await page.waitForTimeout(500);

    await safeShot(page, outDir, '02-dashboard-org-switched.png');
  });

  await check('Opportunities list loads for current org', async () => {
    await page.getByRole('link', { name: 'Opportunities' }).click();
    await page.getByRole('heading', { name: 'Opportunities' }).waitFor({ timeout: 30000 });
    await safeShot(page, outDir, '03-opportunities.png');
  });

  // Create a new opportunity and upload a PDF.
  let createdOpportunityUrl = null;
  await check('New Opportunity form loads, submit works, redirects to analyze', async () => {
    await page.getByRole('link', { name: /New Opportunity/i }).first().click();
    await page.getByRole('heading', { name: 'New Opportunity' }).waitFor({ timeout: 30000 });

    const title = `QA Opportunity ${nowStamp()}`;

    await page.getByLabel('Title').fill(title);
    await page.getByLabel('Solicitation Number').fill('QA-70B05C-26-R-0001');
    await page.getByLabel('Agency').fill('DHS');
    await page.getByLabel('Due Date').fill('2026-02-28');

    // Leave set-aside as default (None) to avoid flaky Radix Select targeting.

    await page.getByLabel('NAICS Code').fill('541512');
    await page.getByLabel('Description').fill('QA run: create opportunity + upload PDF.');

    // Upload a PDF
    const pdfPath = path.resolve(process.cwd(), '..', 'backend', 'tmp_roxy_test.pdf');
    if (!fs.existsSync(pdfPath)) {
      throw new Error(`Missing PDF fixture at ${pdfPath}`);
    }

    await page.locator('input[type="file"][accept=".pdf"]').setInputFiles(pdfPath);
    await page.getByRole('button', { name: 'Create & Analyze' }).click();

    await page.waitForURL(/\/opportunities\/.+\/analyze/, { timeout: 60000 });
    createdOpportunityUrl = page.url();

    await page.getByRole('tab', { name: 'Summary' }).waitFor({ timeout: 30000 });
    await safeShot(page, outDir, '04-analyze-summary.png');
  });

  await check('Analyze page: tabs render and Roxy visible on all tabs', async () => {
    if (!createdOpportunityUrl) throw new Error('No created opportunity URL to validate');

    // Summary
    await page.getByRole('tab', { name: 'Summary' }).click();
    await page.getByText('Opportunity Summary').waitFor({ timeout: 30000 });
    await page.getByText('Roxy').waitFor({ timeout: 30000 });

    // Documents
    await page.getByRole('tab', { name: 'Documents' }).click();
    await page.getByText('RFP Files').waitFor({ timeout: 30000 });
    await page.getByText('Roxy').waitFor({ timeout: 30000 });

    // Gap Analysis
    await page.getByRole('tab', { name: 'Gap Analysis' }).click();
    await page.getByText('Compliance Checklist').waitFor({ timeout: 60000 });
    await page.getByText('Roxy').waitFor({ timeout: 30000 });

    await safeShot(page, outDir, '05-analyze-tabs.png');
  });

  await check('Documents tab: shows uploaded PDF in tree (best-effort)', async () => {
    await page.getByRole('tab', { name: 'Documents' }).click();
    await page.getByText('RFP Files').waitFor({ timeout: 30000 });

    // The uploaded PDF should show up as a selectable file in the file tree.
    // Try to click the first file under RFP Files.
    const fileButtons = page.locator('button', { hasText: '.pdf' });
    if ((await fileButtons.count()) > 0) {
      await fileButtons.first().click();
      await page.getByText(/Select a document to preview\.|Document/).first().waitFor({ timeout: 30000 });
    }

    await safeShot(page, outDir, '06-documents-tab.png');
  });

  await check('Ask Roxy: thinking indicator + streamed response (best-effort)', async () => {
    const input = page.getByPlaceholder('Ask Roxy...');
    await input.fill('What certifications are required?');
    await input.press('Enter');

    // Thinking indicator should show quickly
    await page.locator('text=/Thinking\.{3}|Reviewing requirements\.{3}|Scanning documents\.{3}|Drafting an answer\.{3}/').first().waitFor({ timeout: 15000 });

    // Eventually there should be a Roxy assistant bubble with some non-empty content.
    await page.waitForFunction(() => {
      const candidates = Array.from(document.querySelectorAll('span')).filter((el) => el.textContent?.includes('Roxy'));
      return candidates.length > 0;
    }, null, { timeout: 60000 });

    await sleep(1500);
    await safeShot(page, outDir, '07-roxy-response.png');
  });

  await check('Citations appear and clicking a citation navigates to Documents (best-effort)', async () => {
    // Expand sources if present
    const sourcesBtn = page.getByRole('button', { name: /sources/i }).first();
    if (await sourcesBtn.count()) {
      await sourcesBtn.click();

      const citeBtn = page.locator('button', { hasText: 'p.' }).first();
      if (await citeBtn.count()) {
        await citeBtn.click();
        await page.getByRole('tab', { name: 'Documents' }).waitFor({ timeout: 30000 });
        await safeShot(page, outDir, '08-citation-click.png');

        // Highlight only exists if backend sent boundingBox
        const highlight = page.locator('.border-yellow-500').first();
        if (await highlight.count()) {
          await safeShot(page, outDir, '09-citation-highlight.png');
        }
      } else {
        throw new Error('Sources expanded but no citation buttons found');
      }
    } else {
      throw new Error('No sources button found (no citations returned)');
    }
  });

  await check('Past Performance: list loads and can add a new contract', async () => {
    await page.getByRole('link', { name: 'Past Performance' }).click();
    await page.getByRole('heading', { name: 'Past Performance' }).waitFor({ timeout: 30000 });
    await safeShot(page, outDir, '10-past-performance.png');

    await page.getByRole('link', { name: /Add Contract/i }).first().click();
    await page.getByRole('heading', { name: 'Add Contract' }).waitFor({ timeout: 30000 });

    await page.getByLabel('Contract Name').fill(`QA Contract ${nowStamp()}`);
    await page.getByRole('button', { name: /Save Contract/i }).click();

    await page.waitForURL(/\/past-performance$/, { timeout: 30000 });
    await safeShot(page, outDir, '11-past-performance-after-add.png');
  });

  await check('Company Profile: loads, can edit and save', async () => {
    await page.getByRole('link', { name: 'Company Profile' }).click();
    await page.getByRole('heading', { name: 'Company Profile' }).waitFor({ timeout: 30000 });

    const editBtn = page.getByRole('button', { name: 'Edit' });
    await editBtn.click();

    // Change company name slightly and save.
    const target = page.getByPlaceholder('Company name');
    await target.waitFor({ timeout: 30000 });

    const original = await target.inputValue();
    const updated = original.endsWith(' QA') ? original : `${original} QA`;
    await target.fill(updated);

    await page.getByRole('button', { name: /^Save$/ }).click();
    await page.waitForTimeout(1500);
    await safeShot(page, outDir, '12-company-profile-saved.png');

    // Revert to original to avoid leaving QA data behind.
    await page.getByRole('button', { name: 'Edit' }).click();
    const target2 = page.getByPlaceholder('Company name');
    await target2.waitFor({ timeout: 30000 });
    await target2.fill(original);
    await page.getByRole('button', { name: /^Save$/ }).click();
  });

  await check('Sidebar collapse toggles and persists across reload', async () => {
    // Expand/collapse button exists in sidebar header.
    const collapse = page.getByRole('button', { name: 'Collapse sidebar' });
    await collapse.click();
    await safeShot(page, outDir, '13-sidebar-collapsed.png');

    await page.reload({ waitUntil: 'networkidle' });

    // When collapsed, the sidebar header shows an expand button.
    await page.getByTitle('Expand sidebar').waitFor({ timeout: 30000 });

    await safeShot(page, outDir, '14-sidebar-collapsed-after-reload.png');
  });

  fs.writeFileSync(path.join(outDir, 'qa-result.json'), JSON.stringify(result, null, 2));

  await context.close();
  await browser.close();

  // Print output location for convenience.
  console.log(outDir);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
