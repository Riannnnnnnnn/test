import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const output = process.env.MOBILE_OUTPUT || 'tmp/mobile';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const base = 'http://127.0.0.1:5180';
  await page.goto(base);
  await page.evaluate(async () => {
    const { saveStudent, saveSession } = await import('/src/services/storage/database.ts');
    for (const stage of ['A', 'B']) {
      await saveStudent({ id: `mobile-${stage}`, name: '手机适配测试', gender: 'female', age: 6, grade: 'kindergarten-large', stage, assessmentDate: new Date().toISOString() });
      await saveSession({ id: `mobile-${stage}`, studentId: `mobile-${stage}`, stage, courseVersion: 3, startTime: new Date().toISOString(), status: 'running', tutorialSeen: ['A1', 'A2', 'A5'], results: [{ moduleId: 'A2', questionId: 'A2-001', status: 'completed', teacherScores: { breathDuration: 80, breathContinuity: 80, breathStability: 80 }, finalScores: { breathDuration: 80, breathContinuity: 80, breathStability: 80 } }] });
    }
  });
  for (const width of [390, 320, 768, 844]) {
    await page.setViewportSize({ width, height: width === 844 ? 390 : 844 });
    for (const path of ['/', '/profile', '/assessment/mobile-A/A1', '/assessment/mobile-A/A2', '/assessment/mobile-A/A5', '/assessment/mobile-B/A1', '/assessment/mobile-B/A5', '/report/mobile-A']) {
      await page.goto(base + path);
      await page.waitForTimeout(800);
      const skip = page.getByRole('button', { name: '跳过说明 »', exact: true });
      if (await skip.isVisible()) await skip.click();
      await page.waitForTimeout(250);
      const overflow = await page.evaluate(() => [...document.querySelectorAll('main, .card, .pro-footer, .page-header, .vc, .pro-header')].filter(el => {
        const r = el.getBoundingClientRect(); return r.width && (r.right > innerWidth + 2 || r.left < -2);
      }).map(el => el.className));
      if (!process.env.MOBILE_BASELINE) assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
      console.log(width, path, JSON.stringify(overflow));
      if (!process.env.MOBILE_BASELINE) assert.deepEqual(overflow, [], `Overflow ${width} ${path}`);
      await page.screenshot({ path: `${output}/${width}-${path.replaceAll('/', '_') || 'home'}.png`, fullPage: true });
    }
  }
  for (const width of [320, 390, 844]) {
    await page.setViewportSize({ width, height: width === 844 ? 390 : 844 });
    await page.goto(base + '/assessment/mobile-A/A1');
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: '教师星级评价', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.waitFor();
    const rect = await dialog.boundingBox();
    assert.ok(rect && rect.x >= 0 && rect.x + rect.width <= width + 1);
    await page.screenshot({ path: `${output}/${width}-teacher-dialog.png`, fullPage: true });
    await page.goto(base + '/assessment/mobile-A/A1');
    await page.getByRole('button', { name: '下一项', exact: true }).click();
    await page.waitForURL('**/assessment/mobile-A/A2');
    await page.locator('.breath__scene').waitFor();
  }
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
