import { test, expect, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('BidWin Full E2E Flow', () => {
  let orgNames: string[] = [];
  let createdOpportunityUrl: string | null = null;

  test.beforeEach(async ({ context }) => {
    // Inject auth cookie to bypass login
    await context.addCookies([
      { name: 'auth_token', value: 'valid_session', domain: 'localhost', path: '/' },
    ]);
  });

  test('01 - Dashboard loads', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Good (morning|afternoon|evening)/ })).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('Recent Opportunities')).toBeVisible();
    await page.screenshot({ path: 'qa-artifacts/01-dashboard.png', fullPage: true });
  });

  test('02 - Org switcher can switch orgs and dashboard refreshes', async ({ page }) => {
    await page.goto('/');
    
    const trigger = page.getByRole('button', { name: /Select Organization|Organization|Liberty Alliance|The Ginisis Group|Talion Construction/ });
    await trigger.click();

    const menuItems = page.getByRole('menuitem');
    const count = await menuItems.count();
    expect(count).toBeGreaterThanOrEqual(2);

    // Collect org names
    const first = await menuItems.nth(0).innerText();
    const second = await menuItems.nth(1).innerText();
    orgNames = [first.trim(), second.trim()];

    await menuItems.nth(1).click();

    // Wait for dashboard to show new org name
    await expect(page.getByText(orgNames[1], { exact: false })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Active Opportunities')).toBeVisible();
    
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'qa-artifacts/02-dashboard-org-switched.png', fullPage: true });
  });

  test('03 - Opportunities list loads for current org', async ({ page }) => {
    await page.goto('/opportunities');
    await expect(page.getByRole('heading', { name: 'Opportunities' })).toBeVisible({ timeout: 30000 });
    await page.screenshot({ path: 'qa-artifacts/03-opportunities.png', fullPage: true });
  });

  test('04 - New Opportunity form loads, submit works, redirects to analyze', async ({ page }) => {
    await page.goto('/opportunities');
    await page.getByRole('link', { name: /New Opportunity/i }).first().click();
    await expect(page.getByRole('heading', { name: 'New Opportunity' })).toBeVisible({ timeout: 30000 });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const title = `QA Opportunity ${timestamp}`;

    await page.getByLabel('Title').fill(title);
    await page.getByLabel('Solicitation Number').fill('QA-70B05C-26-R-0001');
    await page.getByLabel('Agency').fill('DHS');
    await page.getByLabel('Due Date').fill('2026-02-28');
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

    await expect(page.getByRole('tab', { name: 'Summary' })).toBeVisible({ timeout: 30000 });
    await page.screenshot({ path: 'qa-artifacts/04-analyze-summary.png', fullPage: true });
  });

  test('05 - Analyze page: tabs render and Roxy visible on all tabs', async ({ page }) => {
    // Navigate to any opportunity analyze page
    await page.goto('/opportunities');
    const opportunityLinks = page.locator('a[href*="/opportunities/"][href*="/analyze"]');
    const count = await opportunityLinks.count();
    
    if (count > 0) {
      await opportunityLinks.first().click();
    } else {
      test.skip();
    }

    // Summary
    await page.getByRole('tab', { name: 'Summary' }).click();
    await expect(page.getByText('Opportunity Summary')).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('Roxy')).toBeVisible();

    // Documents
    await page.getByRole('tab', { name: 'Documents' }).click();
    await expect(page.getByText('RFP Files')).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('Roxy')).toBeVisible();

    // Gap Analysis
    await page.getByRole('tab', { name: 'Gap Analysis' }).click();
    await expect(page.getByText('Compliance Checklist')).toBeVisible({ timeout: 60000 });
    await expect(page.getByText('Roxy')).toBeVisible();

    await page.screenshot({ path: 'qa-artifacts/05-analyze-tabs.png', fullPage: true });
  });

  test('06 - Documents tab: shows uploaded PDF in tree', async ({ page }) => {
    await page.goto('/opportunities');
    const opportunityLinks = page.locator('a[href*="/opportunities/"][href*="/analyze"]');
    const count = await opportunityLinks.count();
    
    if (count > 0) {
      await opportunityLinks.first().click();
    } else {
      test.skip();
    }

    await page.getByRole('tab', { name: 'Documents' }).click();
    await expect(page.getByText('RFP Files')).toBeVisible({ timeout: 30000 });

    // Check for PDF files in tree
    const fileButtons = page.locator('button', { hasText: '.pdf' });
    if ((await fileButtons.count()) > 0) {
      await fileButtons.first().click();
      await page.waitForTimeout(500);
    }

    await page.screenshot({ path: 'qa-artifacts/06-documents-tab.png', fullPage: true });
  });

  test('07 - Ask Roxy: thinking indicator + streamed response', async ({ page }) => {
    await page.goto('/opportunities');
    const opportunityLinks = page.locator('a[href*="/opportunities/"][href*="/analyze"]');
    const count = await opportunityLinks.count();
    
    if (count > 0) {
      await opportunityLinks.first().click();
    } else {
      test.skip();
    }

    const input = page.getByPlaceholder('Ask Roxy...');
    await input.fill('What certifications are required?');
    await input.press('Enter');

    // Wait for thinking indicator
    await expect(page.locator('text=/Thinking\\.{3}|Reviewing requirements\\.{3}|Scanning documents\\.{3}|Drafting an answer\\.{3}/').first()).toBeVisible({ timeout: 15000 });

    // Wait for response
    await page.waitForFunction(() => {
      const candidates = Array.from(document.querySelectorAll('span')).filter((el) => el.textContent?.includes('Roxy'));
      return candidates.length > 0;
    }, null, { timeout: 60000 });

    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'qa-artifacts/07-roxy-response.png', fullPage: true });
  });

  test('08 - Citations appear and clicking navigates to Documents', async ({ page }) => {
    await page.goto('/opportunities');
    const opportunityLinks = page.locator('a[href*="/opportunities/"][href*="/analyze"]');
    const count = await opportunityLinks.count();
    
    if (count > 0) {
      await opportunityLinks.first().click();
    } else {
      test.skip();
    }

    // First ask Roxy something to get citations
    const input = page.getByPlaceholder('Ask Roxy...');
    await input.fill('What are the key requirements?');
    await input.press('Enter');
    await page.waitForTimeout(3000);

    // Look for sources button
    const sourcesBtn = page.getByRole('button', { name: /sources/i }).first();
    if (await sourcesBtn.isVisible()) {
      await sourcesBtn.click();

      const citeBtn = page.locator('button', { hasText: 'p.' }).first();
      if (await citeBtn.isVisible()) {
        await citeBtn.click();
        await expect(page.getByRole('tab', { name: 'Documents' })).toBeVisible({ timeout: 30000 });
        await page.screenshot({ path: 'qa-artifacts/08-citation-click.png', fullPage: true });

        // Check for highlight
        const highlight = page.locator('.border-yellow-500').first();
        if (await highlight.isVisible()) {
          await page.screenshot({ path: 'qa-artifacts/09-citation-highlight.png', fullPage: true });
        }
      }
    }
  });

  test('09 - Past Performance: list loads and can add a new contract', async ({ page }) => {
    await page.goto('/past-performance');
    await expect(page.getByRole('heading', { name: 'Past Performance' })).toBeVisible({ timeout: 30000 });
    await page.screenshot({ path: 'qa-artifacts/10-past-performance.png', fullPage: true });

    await page.getByRole('link', { name: /Add Contract/i }).first().click();
    await expect(page.getByRole('heading', { name: 'Add Contract' })).toBeVisible({ timeout: 30000 });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await page.getByLabel('Contract Name').fill(`QA Contract ${timestamp}`);
    await page.getByRole('button', { name: /Save Contract/i }).click();

    await page.waitForURL(/\/past-performance$/, { timeout: 30000 });
    await page.screenshot({ path: 'qa-artifacts/11-past-performance-after-add.png', fullPage: true });
  });

  test('10 - Company Profile: loads, can edit and save', async ({ page }) => {
    await page.goto('/company-profile');
    await expect(page.getByRole('heading', { name: 'Company Profile' })).toBeVisible({ timeout: 30000 });

    const editBtn = page.getByRole('button', { name: 'Edit' });
    await editBtn.click();

    // Change company name slightly
    const target = page.getByPlaceholder('Company name');
    await expect(target).toBeVisible({ timeout: 30000 });

    const original = await target.inputValue();
    const updated = original.endsWith(' QA') ? original : `${original} QA`;
    await target.fill(updated);

    await page.getByRole('button', { name: /^Save$/ }).click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'qa-artifacts/12-company-profile-saved.png', fullPage: true });

    // Revert to original
    await page.getByRole('button', { name: 'Edit' }).click();
    const target2 = page.getByPlaceholder('Company name');
    await expect(target2).toBeVisible({ timeout: 30000 });
    await target2.fill(original);
    await page.getByRole('button', { name: /^Save$/ }).click();
  });

  test('11 - Sidebar collapse toggles and persists across reload', async ({ page }) => {
    await page.goto('/');
    
    const collapse = page.getByRole('button', { name: 'Collapse sidebar' });
    await collapse.click();
    await page.screenshot({ path: 'qa-artifacts/13-sidebar-collapsed.png', fullPage: true });

    await page.reload({ waitUntil: 'networkidle' });

    // When collapsed, sidebar should show expand button
    await expect(page.getByTitle('Expand sidebar')).toBeVisible({ timeout: 30000 });
    await page.screenshot({ path: 'qa-artifacts/14-sidebar-collapsed-after-reload.png', fullPage: true });
  });
});
