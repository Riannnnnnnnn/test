import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const baseUrl = process.env.E2E_BASE_URL || 'http://127.0.0.1:5173';
const output = process.env.E2E_OUTPUT || 'tmp/e2e-course';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  await context.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      const audio = new AudioContext(), oscillator = audio.createOscillator(), gain = audio.createGain(), dest = audio.createMediaStreamDestination();
      gain.gain.value = globalThis.silenceMicrophone ? 0 : .24; globalThis.testMicrophoneGain = gain; oscillator.connect(gain).connect(dest); oscillator.start();
      if (globalThis.silenceAfter !== undefined) setTimeout(() => { gain.gain.value = 0; }, globalThis.silenceAfter);
      return dest.stream;
    };
  });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const button = (name) => page.getByRole('button', { name, exact: true });
  const skip = () => button('跳过说明 »').click();
  const screenshot = (name) => page.screenshot({ path: `${output}/${name}.png`, animations: 'disabled' });
  await page.goto(baseUrl + '/profile');
  const pronunciationChecks = await page.evaluate(async () => {
    const { scorePronunciation, strictPronunciationStars } = await import('/src/services/scoring/pronunciation.ts');
    const { parseXfyunIseResult } = await import('/src/services/speech/xfyunIse.ts');
    const { getSpeechReviewFeedback } = await import('/src/services/speech/reviewFeedback.ts');
    const excellent = scorePronunciation(parseXfyunIseResult('<read_word total_score="98" phone_score="98" tone_score="98"/>'));
    const low = scorePronunciation(parseXfyunIseResult('<read_sentence total_score="98" accuracy_score="4"/>'));
    const mismatchResult = parseXfyunIseResult('<read_word total_score="98" phone_score="98" tone_score="98"><syll content="花" dp_message="128"/></read_word>');
    const mismatch = scorePronunciation(mismatchResult);
    return { excellent, low, mismatch, fourStarBoundary: strictPronunciationStars(97), review: getSpeechReviewFeedback(mismatchResult, '苹果') };
  });
  assert.equal(pronunciationChecks.excellent.stars, 5);
  assert.equal(pronunciationChecks.low.scores.pronunciationClarity, 4);
  assert.equal(pronunciationChecks.mismatch.stars, 0);
  assert.equal(pronunciationChecks.mismatch.scores.pronunciationClarity, undefined);
  assert.equal(pronunciationChecks.fourStarBoundary, 4);
  assert.equal(pronunciationChecks.review.kind, 'reading');
  console.log('PASS 百分制低分不放大，错读进入复核且无自动成绩');
  await page.locator('input[name="name"]').fill('流程测试');
  await page.locator('select[name="gender"]').selectOption('female');
  await page.locator('select[name="age"]').selectOption('6');
  await page.locator('select[name="grade"]').selectOption('kindergarten-large');
  await button('调整阶段').click();
  assert.equal(await page.locator('.stage-picker__option').count(), 2);
  await page.locator('.stage-picker__option').filter({ hasText: '小阶段' }).click();
  await page.getByRole('button', { name: /开始评测/ }).click();
  await page.locator('.module-list__item').first().waitFor();
  assert.equal(await page.locator('.module-list__item').count(), 3);
  assert(await button('开始正式评测').isEnabled());
  assert.equal(await page.locator('.microphone-check').count(), 0);
  await button('开始正式评测').click();
  assert(await page.locator('dialog.microphone-check-dialog').evaluate((el) => el.matches(':modal')));
  assert(await button('进入评测').isDisabled());
  await screenshot('麦克风测试弹窗');
  await button('测试麦克风').click();
  await page.locator('.microphone-check--success').waitFor();
  assert(await button('进入评测').isEnabled());
  await page.evaluate(() => { globalThis.silenceMicrophone = true; });
  await button('重新测试麦克风').click();
  assert(await button('进入评测').isDisabled());
  await button('停止测试').click();
  assert(await button('进入评测').isDisabled());
  await page.locator('.microphone-check--idle').waitFor();
  await page.evaluate(() => { globalThis.silenceMicrophone = false; });
  await page.locator('.microphone-check > button').click();
  await page.locator('.microphone-check--success').waitFor();
  assert(await button('进入评测').isEnabled());
  await button('稍后再测').click();
  assert.equal(await page.locator('dialog.microphone-check-dialog').count(), 0);
  await button('开始正式评测').click();
  assert(await button('进入评测').isDisabled());
  await button('测试麦克风').click();
  await page.locator('.microphone-check--success').waitFor();
  await button('进入评测').click();
  await page.locator('.guide').waitFor();
  assert(await page.locator('dialog.guide-backdrop').evaluate((el) => el.matches(':modal')));
  await screenshot('说明弹层');
  await button('下一步 →').click();
  await page.locator('.guide').getByRole('button', { name: '上一步', exact: true }).click();
  await skip();
  assert.equal(await page.locator('.course-task-picker button').count(), 23);
  assert.equal(await page.locator('.pronunciation-card__question h2').count(), 0);
  await screenshot('布局检查');
  await button('声母 p：苹果').click();
  assert.equal(await page.locator('.course-word').textContent(), '苹果');
  assert.equal(await page.locator('.vc-dim').last().locator('.vc-dim__label').textContent(), '词语匹配');
  assert.equal(await page.locator('.vc-dim').last().locator('.vc-dim__result').textContent(), '·待检测');
  assert(await page.locator('.pron__art img').evaluate((image) => image.complete && image.naturalWidth > 0));
  await page.evaluate(async () => {
    const db = await import('/src/services/storage/database.ts');
    const id = location.pathname.split('/')[2];
    const saved = await db.getSession(id);
    const result = saved.results.find((entry) => entry.moduleId === 'A1');
    const questionId = result.activeItemId;
    await db.saveSession({ ...saved, results: saved.results.map((entry) => entry.moduleId !== 'A1' ? entry : {
      ...entry, items: { ...entry.items, [questionId]: { moduleId: 'A1', questionId, status: 'running',
        rawResult: { provider: 'smart-speech', scoringVersion: 'ise-evidence-v2', referenceText: '苹果', evidence: {
          totalScore: 98, stars: 0, rawXml: '', issues: [{ text: '苹', kind: '替换' }], reviewReasons: ['检测到错读或发音问题']
        } } } }
    }) });
  });
  await page.reload();
  await page.locator('.vc__review-mark').waitFor();
  assert.equal(await page.locator('.vc__review-mark').textContent(), '×');
  assert.equal(await page.locator('.vc__chip').textContent(), '需重试');
  assert.equal(await page.locator('.vc-dim').last().locator('.vc-dim__result').textContent(), '!需复核');
  await screenshot('正音-读错与词语匹配');
  await page.goto(`${baseUrl}/report/${page.url().split('/')[4]}`);
  await page.getByRole('heading', { name: '正音观察' }).waitFor();
  assert.equal(await page.locator('.reading-evidence').getByText(/引擎总分|准确度：/).count(), 0);
  await page.goBack();
  await page.locator('.vc__review-mark').waitFor();
  await page.evaluate(async () => {
    const db = await import('/src/services/storage/database.ts');
    const id = location.pathname.split('/')[2];
    const saved = await db.getSession(id);
    await db.saveSession({ ...saved, results: saved.results.map((entry) => entry.moduleId !== 'A1' ? entry : {
      ...entry, items: Object.fromEntries(Object.entries(entry.items).map(([questionId, item]) => [questionId, questionId !== entry.activeItemId ? item : {
        ...item, rawResult: { ...item.rawResult, evidence: {
          totalScore: 96, pronunciationScore: 92, toneScore: 90, transcript: '苹果', stars: 4, rawXml: '', issues: [], reviewReasons: []
        } }
      }]))
    }) });
  });
  await page.reload();
  await page.locator('.vc-dim__result--success').waitFor();
  assert.equal(await page.locator('.vc-dim').last().locator('.vc-dim__result').textContent(), '✓已匹配');
  assert.equal(await page.locator('.vc-dim.is-complete').count(), 3);
  await button('重测').click();
  assert.equal(await page.locator('.vc__review-mark').count(), 0);
  await button('教师星级评价').click();
  await button('保存评价').click();
  assert.equal(await page.locator('.course-task-picker button.is-complete').count(), 1);
  assert.equal(await page.locator('.vc-dim.is-complete').count(), 0);
  await button('声母 b：包子').click();
  assert.equal(await page.locator('.course-word').textContent(), '包子');
  assert(await page.locator('.pron__art img').evaluate((image) => image.complete && image.naturalWidth > 0));
  await button('评测说明').click(); await skip();
  await screenshot('正音-旧版布局');
  console.log('PASS 两阶段、三项目、23 声母、弹层交互、逐题教师评分');
  const sessionId = page.url().split('/')[4];
  await page.reload(); await page.locator('.course-word').waitFor();
  assert.equal(await page.locator('.guide').count(), 0);
  assert.equal(await page.locator('.course-task-picker button.is-complete').count(), 1);
  await button('声母 p：苹果').click();
  await button('重测').click();
  assert.equal(await page.locator('.course-task-picker button.is-complete').count(), 0);
  await button('下一项').click();
  await button('下一步 →').click();
  assert.match(await page.locator('.guide-visual--listen img').getAttribute('src'), /star-mascot-guide-blowing-mic-natural\.webp$/);
  await screenshot('气息说明-吹气');
  await skip();
  await page.evaluate(() => { globalThis.silenceAfter = 1200; });
  await button('开始气息评测').click();
  await page.getByText('发声已停止，评测完成', { exact: true }).waitFor({ timeout: 12000 });
  await page.evaluate(() => { globalThis.silenceAfter = undefined; globalThis.testMicrophoneGain.gain.value = .24; });
  await button('开始气息评测').click();
  await page.getByText('已到达终点，评测完成', { exact: true }).waitFor({ timeout: 20000 });
  await screenshot('气息-自动结束');
  console.log('PASS 小火车停声和到达终点自动结算');
  await button('下一项').click();
  await button('下一步 →').click();
  assert.match(await page.locator('.guide-visual--tiger img').getAttribute('src'), /star-mascot-guide-tiger\.webp$/);
  await screenshot('表现力说明-小老虎动作');
  await skip();
  assert.equal(await page.locator('.course-task-picker button').count(), 3);
  await button('小狗').click();
  await button('教师星级评价').click(); await button('保存评价').click();
  await screenshot('表现力');
  await button('完成评测').click();
  await page.locator('.ability-observations').waitFor();
  assert.equal(await page.locator('.ability-observations > div').count(), 3);
  const url = await page.locator('.report-qr-panel__code').getAttribute('data-share-url');
  await page.goto(url); await page.locator('.ability-observations').waitFor();
  assert.equal(await page.locator('.ability-observations > div').count(), 3);
  console.log('PASS 三个动物、三项报告、扫码报告');
  await page.goto(baseUrl + '/');
  await page.evaluate(async (id) => {
    const db = await import('/src/services/storage/database.ts');
    const old = await db.getSession(id);
    await db.saveSession({ ...old, id: 'test-large', stage: 'B', status: 'running', tutorialSeen: [], results: ['A1','A2','A5'].map((moduleId) => ({ moduleId, questionId: `${moduleId}-001`, status: 'not_started' })) });
  }, sessionId);
  await page.goto(baseUrl + '/assessment/test-large/A1'); await skip();
  assert.equal(await page.locator('.course-task-picker button').count(), 2);
  assert(await page.locator('.course-sentence').isVisible());
  await screenshot('大阶段正音');
  await page.goto(baseUrl + '/assessment/test-large/A5'); await skip();
  assert(await page.getByRole('heading', { name: '森林广播员' }).isVisible());
  await page.setViewportSize({ width: 390, height: 844 });
  await button('评测说明').click(); await screenshot('手机说明'); await skip();
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await page.goto(baseUrl + '/assessment/test-large/A1');
  await page.locator('.course-sentence').waitFor();
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  assert(await page.evaluate(() => scrollY > 0));
  await screenshot('手机正音');
  await page.setViewportSize({ width: 1920, height: 1080 });
  await screenshot('桌面大阶段');
  await page.goto(baseUrl + '/v3'); await page.waitForURL(baseUrl + '/');
  assert.equal(errors.length, 0, errors.join('\n'));
  console.log('PASS 大阶段内容、手机弹层、独立入口撤下、无浏览器异常');
  const latencyPage = await context.newPage();
  await latencyPage.goto(baseUrl + '/profile');
  const startup = await latencyPage.evaluate(async () => {
    const packets = [];
    const originalFetch = window.fetch;
    const originalWebSocket = window.WebSocket;
    window.fetch = (input, init) => String(input).includes('/api/xfyun/ise-auth')
      ? Promise.resolve(new Response(JSON.stringify({ appId: 'test', url: 'wss://test/ise', iatUrl: 'wss://test/iat' }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      : originalFetch(input, init);
    class SlowWebSocket extends EventTarget {
      static OPEN = 1;
      readyState = 0;
      constructor(url) {
        super(); this.url = url;
        setTimeout(() => { this.readyState = 1; this.dispatchEvent(new Event('open')); }, 1600);
      }
      send(value) { packets.push({ url: this.url, value: JSON.parse(value) }); }
      close() { this.readyState = 3; }
    }
    window.WebSocket = SlowWebSocket;
    try {
      const { startXfyunIse } = await import('/src/services/speech/xfyunIse.ts');
      let volumeUpdates = 0;
      const start = performance.now();
      const session = await startXfyunIse({ referenceText: '苹果', onVolume: () => { volumeUpdates += 1; } });
      const captureDelay = performance.now() - start;
      await new Promise((resolve) => setTimeout(resolve, 500));
      const capturedBeforeConnection = volumeUpdates > 0 && packets.length === 0;
      await session.ready;
      await new Promise((resolve) => setTimeout(resolve, 120));
      const bothServicesReceivedAudio = ['ise', 'iat'].every((service) => packets.some((packet) => packet.url.endsWith(service) && packet.value.data?.audio || packet.url.endsWith(service) && packet.value.business?.cmd === 'auw'));
      session.cancel();
      return { captureDelay, capturedBeforeConnection, bothServicesReceivedAudio };
    } finally {
      window.fetch = originalFetch;
      window.WebSocket = originalWebSocket;
    }
  });
  assert(startup.captureDelay < 1200, `麦克风启动耗时 ${startup.captureDelay.toFixed(0)}ms`);
  assert(startup.capturedBeforeConnection, '连接期间应已开始本地收音');
  assert(startup.bothServicesReceivedAudio, '连接后两条服务都应收到暂存音频');
  await latencyPage.close();
  console.log('PASS 点击后先收音，慢速语音连接建立后补发开头音频');
} finally { await browser.close(); }
