import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
try {
  for (const mode of ['missing', 'rejected', 'webkit', 'native']) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(mode => {
      if (mode === 'native') return;
      Object.defineProperty(HTMLElement.prototype, 'webkitRequestFullscreen', { value: undefined, writable: true });
      Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', { value: mode === 'rejected' ? () => Promise.reject(new Error('Denied')) : undefined });
      if (mode === 'webkit') {
        Object.defineProperty(document, 'webkitFullscreenElement', { value: null, writable: true });
        HTMLElement.prototype.webkitRequestFullscreen = () => { document.webkitFullscreenElement = document.documentElement; document.dispatchEvent(new Event('webkitfullscreenchange')); };
        document.webkitExitFullscreen = () => { document.webkitFullscreenElement = null; document.dispatchEvent(new Event('webkitfullscreenchange')); };
      }
    }, mode);
    await page.goto('http://127.0.0.1:5180/');
    await page.evaluate(async () => {
      const { saveStudent, saveSession } = await import('/src/services/storage/database.ts');
      await saveStudent({ id:'fullscreen',name:'测试',gender:'female',age:6,grade:'kindergarten-large',stage:'A',assessmentDate:new Date().toISOString() });
      await saveSession({ id:'fullscreen',studentId:'fullscreen',stage:'A',courseVersion:3,startTime:new Date().toISOString(),status:'running',tutorialSeen:['A1','A2','A5'],results:[] });
    });
    for (const path of ['/', '/assessment/fullscreen/A1']) {
      await page.goto('http://127.0.0.1:5180' + path);
      await page.waitForTimeout(400);
      const skip = page.getByRole('button', { name: '跳过说明 »', exact: true });
      if (await skip.isVisible()) await skip.click();
      await page.getByRole('button', { name: '全屏', exact: true }).click();
      const fallback = mode === 'missing' || mode === 'rejected';
      await page.getByRole('button', { name: fallback ? '退出专注' : '退出全屏', exact: true }).waitFor();
      if (fallback) assert.equal(await page.locator('.is-focus-mode').count(), 1);
      await page.getByRole('button', { name: fallback ? '退出专注' : '退出全屏', exact: true }).click();
      await page.getByRole('button', { name: '全屏', exact: true }).waitFor();
      assert.equal(await page.locator('.is-focus-mode').count(), 0);
    }
    assert.deepEqual(errors, []);
    console.log('PASS fullscreen', mode);
    await page.close();
  }
} finally { await browser.close(); }

