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
  await page.goto(baseUrl + '/');
  assert.equal(await button('内容管理').count(), 0);
  await button('全屏').click();
  assert(await page.evaluate(() => Boolean(document.fullscreenElement)));
  await button('退出全屏').click();
  assert.equal(await page.evaluate(() => Boolean(document.fullscreenElement)), false);
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
  await button('全屏').click();
  assert(await page.evaluate(() => Boolean(document.fullscreenElement)));
  await button('退出全屏').click();
  assert.equal(await page.evaluate(() => Boolean(document.fullscreenElement)), false);
  assert.equal(await page.locator('.course-task-picker button').count(), 23);
  assert.deepEqual(await page.locator('.course-task-picker__summary span').allTextContents().then((values) => values.map((value) => value.trim().split(/\s+/)[0])), ['通过', '错误']);
  assert.equal(await page.locator('.pronunciation-card__question h2').count(), 0);
  await screenshot('布局检查');
  await page.getByRole('button', { name: /^声母 p：苹果/ }).click();
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
  assert.equal(await page.locator('.vc-dim').last().locator('.vc-dim__result').textContent(), '!没听清');
  await screenshot('正音-读错与词语匹配');
  await page.goto(`${baseUrl}/report/${page.url().split('/')[4]}`);
  await page.getByRole('heading', { name: '读音练习建议' }).waitFor();
  assert.equal(await page.locator('.reading-evidence').getByText(/引擎总分|准确度：/).count(), 0);
  assert.doesNotMatch(await page.locator('.reading-evidence').innerText(), /系统不能确认|已保留本次|智能识别仅供参考/);
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
  assert.match(await page.locator('[role="dialog"]').innerText(), /老师星级评价 · 发音清晰度/);
  await button('保存评价').click();
  assert.equal(await page.locator('.course-task-picker button.is-complete').count(), 0);
  assert.equal(await page.locator('.course-task-picker__summary b').allTextContents().then((values) => values.join(',')), '0,0');
  assert(await button('已完成教师评价').isVisible());
  assert(await page.evaluate(async () => {
    const db = await import('/src/services/storage/database.ts');
    const session = await db.getSession(location.pathname.split('/')[2]);
    const pronunciation = session.results.find((result) => result.moduleId === 'A1');
    return Object.keys(pronunciation.teacherScores ?? {}).length > 0 && Object.values(pronunciation.items ?? {}).every((item) => !item.teacherScores);
  }));
  assert.equal(await page.locator('.vc-dim.is-complete').count(), 0);
  await page.getByRole('button', { name: /^声母 b：包子/ }).click();
  assert.equal(await page.locator('.course-word').textContent(), '包子');
  assert(await page.locator('.pron__art img').evaluate((image) => image.complete && image.naturalWidth > 0));
  await button('评测说明').click(); await skip();
  await screenshot('正音-旧版布局');
  console.log('PASS 两阶段、三项目、23 声母、弹层交互、项目整体教师评分');
  const sessionId = page.url().split('/')[4];
  await page.reload(); await page.locator('.course-word').waitFor();
  assert.equal(await page.locator('.guide').count(), 0);
  assert.equal(await page.locator('.course-task-picker button.is-complete').count(), 0);
  assert(await button('已完成教师评价').isVisible());
  await page.getByRole('button', { name: /^声母 p：苹果/ }).click();
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
  await page.getByText('跟着图片做表情', { exact: true }).waitFor();
  const happyGuidePicture = page.locator('.guide-visual--happy img');
  assert.match(await happyGuidePicture.getAttribute('src'), /guide-happy-expression\.webp$/);
  await happyGuidePicture.evaluate((img) => img.decode());
  await screenshot('表现力说明-表情模仿');
  await skip();
  assert.equal(await page.locator('.expr__mood').count(), 4);
  assert.match(await page.locator('.expr__figure').getAttribute('src'), /girl-happy-half\.webp$/);
  await button('开始跟做表情').click();
  assert(await page.getByText('3 秒后开始，准备好', { exact: true }).isVisible());
  assert(await button('下一个表情').isDisabled());
  await page.getByText('跟做完成，请老师评价', { exact: true }).waitFor({ timeout: 12000 });
  assert.equal(await page.locator('.expr__mood.is-done').count(), 1);
  await button('下一个表情').click();
  assert.equal(await page.locator('.expr__mood.is-done').count(), 1);
  for (const [name, emotion] of [['难过', 'sad'], ['害羞', 'shy'], ['生气', 'angry']]) {
    await button(name).click();
    const picture = page.locator('.expr__figure');
    assert.match(await picture.getAttribute('src'), new RegExp(`girl-${emotion}-half\\.webp$`));
    await picture.evaluate((img) => img.decode());
    assert.equal(await page.locator('.expr__mood.is-done').count(), 1);
  }
  await button('教师星级评价').click(); await button('保存评价').click();
  await screenshot('表现力');
  await button('完成评测').click();
  await page.locator('.ability-observations').waitFor();
  assert.equal(await page.locator('.ability-observations > div').count(), 3);
  const url = await page.locator('.report-qr-panel__code').getAttribute('data-share-url');
  await page.goto(url); await page.locator('.ability-observations').waitFor();
  assert.equal(await page.locator('.ability-observations > div').count(), 3);
  console.log('PASS 四种表情、女孩图片切换、三项报告、扫码报告');
  await page.goto(`${baseUrl}/assessment/${sessionId}/A1`);
  await page.evaluate(async () => {
    const db = await import('/src/services/storage/database.ts');
    const id = location.pathname.split('/')[2];
    const saved = await db.getSession(id);
    await db.saveSession({ ...saved, results: saved.results.map((entry) => entry.moduleId !== 'A1' ? entry : {
      ...entry, items: { ...entry.items, 'A1-b': { moduleId: 'A1', questionId: 'A1-b', status: 'running',
        rawResult: { provider: 'smart-speech', scoringVersion: 'ise-evidence-v2', referenceText: '包子', evidence: {
          totalScore: 95, phoneScore: 95, stars: 0, rawXml: '', contentStatus: 'mismatch', transcript: '帽子',
          issues: [{ text: '包', kind: '替换' }], reviewReasons: ['听写与评测都提示可能读错']
        } }
      } }
    }) });
  });
  await page.reload();
  const wrongInitial = page.locator('.course-task-picker button.is-wrong');
  await wrongInitial.waitFor();
  assert.match(await wrongInitial.innerText(), /×/);
  assert.equal(await page.locator('.course-task-picker__summary b').allTextContents().then((values) => values.join(',')), '0,1');
  assert.equal(await page.locator('.course-task-picker__summary').evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length), 2);
  assert.equal(await page.locator('.course-task-picker__buttons').evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length), 4);
  await wrongInitial.click();
  await page.getByText('包子', { exact: true }).waitFor();
  assert.equal(await page.locator('.course-task-picker button.is-wrong').count(), 1);
  await page.getByRole('button', { name: /^声母 p：苹果/ }).click();
  assert.equal(await page.locator('.course-task-picker button.is-wrong').count(), 1);
  await wrongInitial.click();
  await page.getByText('包子', { exact: true }).waitFor();
  assert.equal(await page.locator('.course-task-picker button.is-wrong').count(), 1);
  await page.getByRole('button', { name: '重新智能评测' }).click();
  await page.waitForFunction(() => !document.querySelector('.course-task-picker button.is-wrong'));
  console.log('PASS 声母四列布局、切题保留红叉，仅点击麦克风才清除旧结果');
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
  assert.equal(await page.locator('.expr__word--scenario').innerText(), '森林广播员');
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
  const popupPage = await context.newPage();
  await popupPage.addInitScript(() => {
    const nativeFetch = window.fetch;
    window.fetch = (input, init) => String(input).includes('/api/xfyun/ise-auth')
      ? Promise.resolve(new Response(JSON.stringify({ appId: 'test', url: 'wss://test/ise', iatUrl: 'wss://test/iat' }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      : nativeFetch(input, init);
    class ResultWebSocket extends EventTarget {
      static OPEN = 1;
      readyState = 0;
      constructor(url) { super(); this.url = url; setTimeout(() => { this.readyState = 1; this.dispatchEvent(new Event('open')); }, 10); }
      deliver(value) { this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(value) })); }
      send(raw) {
        const packet = JSON.parse(raw);
        if (packet.data?.status !== 2) return;
        const kind = globalThis.fakeSpeechKind || 'correct';
        if (this.url.endsWith('/iat')) {
          const word = kind === 'homophone' ? '攻击' : kind === 'correct' ? '包子' : kind === 'wrong' ? '包纸' : '流奶';
          setTimeout(() => this.deliver({ code: 0, data: { status: 2, result: { sn: 0, ws: [{ cw: [{ w: word }] }] } } }), 20);
        } else {
          const issue = kind === 'wrong' ? '<syll content="子"><phone dp_message="0" perr_msg="1"/></syll>' : '';
          const score = kind === 'correct' || kind === 'homophone' ? 99 : 90;
          const xml = `<read_word total_score="${score}" phone_score="${score}" tone_score="${score}">${issue}</read_word>`;
          const encoded = btoa(String.fromCharCode(...new TextEncoder().encode(xml)));
          setTimeout(() => this.deliver({ code: 0, data: { status: 2, data: encoded } }), 30);
        }
      }
      close() { this.readyState = 3; }
    }
    window.WebSocket = ResultWebSocket;
  });
  await page.evaluate(async (id) => {
    const db = await import('/src/services/storage/database.ts');
    const original = await db.getSession(id);
    await db.saveSession({ ...original, id: 'popup-test', status: 'running', tutorialSeen: ['A1'], results: original.results.map((entry) => entry.moduleId === 'A1' ? { moduleId: 'A1', questionId: 'A1-b', activeItemId: 'A1-b', status: 'not_started', items: {} } : entry) });
  }, sessionId);
  await popupPage.goto(baseUrl + '/assessment/popup-test/A1');
  await popupPage.getByText('包子', { exact: true }).waitFor();
  await popupPage.evaluate(() => { globalThis.silenceAfter = 450; globalThis.fakeSpeechKind = 'correct'; });
  await popupPage.getByRole('button', { name: '开始智能评测' }).click();
  const resultDialog = popupPage.getByRole('dialog', { name: '读对啦！' });
  await resultDialog.waitFor({ timeout: 12000 });
  assert.match(await resultDialog.innerText(), /5 \/ 5 星/);
  await popupPage.getByText('苹果', { exact: true }).waitFor({ timeout: 5000 });
  await popupPage.getByRole('button', { name: /^声母 g：公鸡/ }).click();
  await popupPage.evaluate(() => { globalThis.fakeSpeechKind = 'homophone'; globalThis.silenceAfter = 450; });
  await popupPage.getByRole('button', { name: '开始智能评测' }).click();
  await popupPage.locator('.vc--listening').waitFor();
  await popupPage.evaluate(() => { globalThis.testMicrophoneGain.gain.value = .24; setTimeout(() => { globalThis.testMicrophoneGain.gain.value = 0; }, 850); });
  await resultDialog.waitFor({ timeout: 12000 });
  assert.match(await resultDialog.innerText(), /公鸡.*5 \/ 5 星/s);
  await popupPage.getByRole('button', { name: /^声母 b：包子/ }).click();
  await popupPage.evaluate(() => { globalThis.fakeSpeechKind = 'wrong'; });
  await popupPage.getByRole('button', { name: '重新智能评测' }).click();
  await popupPage.locator('.vc--listening').waitFor();
  await popupPage.evaluate(() => { globalThis.testMicrophoneGain.gain.value = .24; setTimeout(() => { globalThis.testMicrophoneGain.gain.value = 0; }, 850); });
  const wrongDialog = popupPage.getByRole('dialog', { name: '读音可能不对' });
  await wrongDialog.waitFor({ timeout: 12000 });
  assert.equal(await wrongDialog.locator('.pron-result__stars .rounded-star:not(.is-filled) linearGradient').count(), 5);
  assert.equal(await wrongDialog.locator('.pron-result__stars .rounded-star.is-filled').count(), 0);
  assert(await popupPage.getByText('包子', { exact: true }).isVisible());
  await wrongDialog.getByRole('button', { name: '跳过' }).click();
  const reasonDialog = popupPage.getByRole('dialog', { name: '孩子哪里还可以更好？' });
  assert.equal(await reasonDialog.getByText('其他情况（可选）：').count(), 0);
  assert.match(await reasonDialog.innerText(), /“包子”哪些发音还可以练习？可多选/);
  assert.deepEqual(await reasonDialog.locator('.skip-reasons__item').allTextContents(), ['双唇无力', '口型偏散', '双唇闭合不充分', '有待提升']);
  await reasonDialog.getByRole('button', { name: '双唇无力' }).click();
  await reasonDialog.getByRole('button', { name: '口型偏散' }).click();
  await reasonDialog.getByRole('button', { name: '双唇闭合不充分' }).click();
  await reasonDialog.getByRole('button', { name: '有待提升' }).click();
  assert.equal(await reasonDialog.locator('.skip-reasons__item[aria-pressed="true"]').count(), 4);
  const optionLayout = await reasonDialog.locator('.skip-reasons').evaluate((element) => ({
    horizontalOverflow: element.scrollWidth > element.clientWidth,
    verticalOverflow: element.scrollHeight > element.clientHeight,
    optionShadow: getComputedStyle(element.querySelector('.skip-reasons__item.is-selected')).boxShadow,
    checkmarkAnimation: getComputedStyle(element.querySelector('.skip-reasons__item.is-selected i')).animationName,
    rippleCount: element.querySelectorAll('.interaction-ripple').length,
  }));
  assert.equal(optionLayout.horizontalOverflow, false);
  assert.equal(optionLayout.verticalOverflow, false);
  assert.notEqual(optionLayout.optionShadow, 'none');
  assert.equal(optionLayout.checkmarkAnimation, 'vc-star-pop');
  assert.equal(optionLayout.rippleCount, 0);
  await reasonDialog.getByRole('button', { name: '确认，下一个字' }).click();
  await popupPage.getByText('苹果', { exact: true }).waitFor();
  await popupPage.getByRole('button', { name: /^声母 b：包子/ }).click();
  await popupPage.evaluate(() => { globalThis.fakeSpeechKind = 'uncertain'; });
  await popupPage.getByRole('button', { name: '重新智能评测' }).click();
  await popupPage.locator('.vc--listening').waitFor();
  await popupPage.evaluate(() => { globalThis.testMicrophoneGain.gain.value = .24; setTimeout(() => { globalThis.testMicrophoneGain.gain.value = 0; }, 850); });
  const uncertainDialog = popupPage.getByRole('dialog', { name: '这次没听清' });
  await uncertainDialog.waitFor({ timeout: 12000 });
  assert.match(await uncertainDialog.innerText(), /语音听写参考：“流奶”/);
  await popupPage.evaluate(() => { globalThis.fakeSpeechKind = 'correct'; });
  await uncertainDialog.getByRole('button', { name: '再试一次' }).click();
  await popupPage.locator('.vc--listening').waitFor();
  await popupPage.evaluate(() => { globalThis.testMicrophoneGain.gain.value = .24; setTimeout(() => { globalThis.testMicrophoneGain.gain.value = 0; }, 850); });
  await resultDialog.waitFor({ timeout: 12000 });
  await popupPage.close();
  console.log('PASS 读对显示星级后自动跳题，读错和没听清可跳过或直接重试');
} finally { await browser.close(); }
