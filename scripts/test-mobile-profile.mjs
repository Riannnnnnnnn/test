import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
try {
  for (const mode of ['http', 'no-randomuuid', 'no-random']) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    if (mode !== 'http') await page.addInitScript(mode => {
      Object.defineProperty(Crypto.prototype, 'randomUUID', { value: undefined, configurable: true });
      if (mode === 'no-random') Object.defineProperty(Crypto.prototype, 'getRandomValues', { value: undefined, configurable: true });
    }, mode);
    await page.goto('http://192.168.0.17:5180/profile');
    await page.locator('[name="name"]').fill('手机测试');
    await page.locator('[name="gender"]').selectOption('female');
    await page.locator('[name="age"]').selectOption('6');
    await page.locator('[name="grade"]').selectOption({ index: 1 });
    await page.getByRole('button', { name: '开始评测' }).click();
    if (mode === 'no-random') {
      await page.getByRole('alert').waitFor();
      assert.equal(await page.getByRole('button', { name: '开始评测' }).isEnabled(), true);
    } else {
      await page.waitForURL('**/stage/*/intro?student=*');
      await page.getByText('为 手机测试 准备').waitFor();
      await page.getByRole('button', { name: '开始正式评测' }).click();
      await page.getByRole('button', { name: '跳过，预览页面' }).click();
      await page.waitForURL('**/assessment/*/A1');
      await page.locator('.pron').waitFor();
    }
    assert.deepEqual(errors, []);
    console.log('PASS 手机资料保存', mode);
    await page.close();
  }
} finally { await browser.close(); }
