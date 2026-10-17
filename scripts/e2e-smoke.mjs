import { chromium } from "playwright-core";
import { join } from "node:path";
import { tmpdir } from "node:os";

const baseUrl = "http://127.0.0.1:5173";
const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

function check(condition, message) {
  if (!condition) throw new Error(message);
  process.stdout.write(`✓ ${message}\n`);
}

const browser = await chromium.launch({
  executablePath: edgePath,
  headless: true,
  args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
});

try {
  const context = await browser.newContext({ permissions: ["microphone"], viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const destination = audioContext.createMediaStreamDestination();
      oscillator.frequency.value = 220;
      gain.gain.value = .24;
      oscillator.connect(gain).connect(destination);
      oscillator.start();
      const silenceAfter = globalThis.__speechSilenceAfterMs;
      if (typeof silenceAfter === "number") window.setTimeout(() => { gain.gain.value = 0; }, silenceAfter);
      globalThis.__speechTestAudio = { audioContext, oscillator, gain };
      return destination.stream;
    };
  });
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto(`${baseUrl}/admin/content`);
  const adminScreenshotPath = join(tmpdir(), "children-speech-v2-content-admin.png");
  await page.screenshot({ path: adminScreenshotPath, fullPage: true });
  process.stdout.write(`内容管理后台截图：${adminScreenshotPath}\n`);
  await page.getByLabel("封面标题（第一行）").fill("后台测试封面");
  const testImage = {
    name: "test-cover.png",
    mimeType: "image/png",
    buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64"),
  };
  await page.locator(".admin-image-editor").filter({ hasText: "顶部 Logo 图片" }).locator('input[type="file"]').setInputFiles(testImage);
  await page.locator(".admin-image-editor").filter({ hasText: "封面图片" }).locator('input[type="file"]').setInputFiles(testImage);
  await page.locator(".admin-image-editor").filter({ hasText: "B 段小图标" }).locator('input[type="file"]').setInputFiles(testImage);
  await page.getByRole("button", { name: /A1/ }).click();
  await page.getByLabel("题目标题").fill("后台测试看图说词");
  await page.locator(".admin-image-editor").filter({ hasText: "模块主图片" }).locator('input[type="file"]').setInputFiles(testImage);
  await page.locator(".admin-image-editor__preview img").waitFor();
  await page.getByRole("button", { name: /封面与品牌/ }).click();
  await page.getByLabel("封面标题（第一行）").waitFor();
  check(await page.getByLabel("封面标题（第一行）").inputValue() === "后台测试封面", "后台编辑内容切换栏目后保持");
  await page.getByRole("button", { name: /A1/ }).click();
  check(await page.getByLabel("题目标题").inputValue() === "后台测试看图说词", "后台评测题目编辑状态保持");
  await page.getByRole("button", { name: /封面与品牌/ }).click();
  await page.getByRole("button", { name: "保存并发布" }).click();
  await page.getByRole("button", { name: /已保存/ }).waitFor();
  await page.getByRole("button", { name: "查看前台" }).click();
  await page.waitForURL(`${baseUrl}/`);
  await page.locator(".display-title").waitFor();
  check((await page.locator(".display-title").textContent()).includes("后台测试封面"), "后台修改的封面标题在前台生效");
  await page.reload();
  await page.locator(".display-title").waitFor();
  check((await page.locator(".display-title").textContent()).includes("后台测试封面"), "后台内容刷新后仍然保留");
  check(await page.locator(".hero__cover-image").isVisible(), "后台上传的封面图片在前台生效");
  check(await page.locator(".brand-logo").isVisible(), "后台上传的品牌 Logo 在全站生效");
  const homeCenteredScreenshotPath = join(tmpdir(), "children-speech-v2-home-centered.png");
  await page.screenshot({ path: homeCenteredScreenshotPath, fullPage: true });
  process.stdout.write(`首页居中布局截图：${homeCenteredScreenshotPath}\n`);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}/`);
  await page.locator(".home-flow").waitFor();
  const mobileHomeBeforeScroll = await page.evaluate(() => ({
    viewportHeight: window.innerHeight,
    scrollHeight: document.documentElement.scrollHeight,
    routeOverflow: getComputedStyle(document.querySelector(".route-transition")).overflow,
  }));
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
  const mobileHomeScrollY = await page.evaluate(() => window.scrollY);
  check(mobileHomeBeforeScroll.scrollHeight > mobileHomeBeforeScroll.viewportHeight && mobileHomeBeforeScroll.routeOverflow === "visible" && mobileHomeScrollY > 0, "手机端首页可以纵向滑动并查看完整内容");
  const mobileHomeScreenshotPath = join(tmpdir(), "children-speech-v2-home-mobile-scroll.png");
  await page.screenshot({ path: mobileHomeScreenshotPath, fullPage: true });
  process.stdout.write(`手机端首页长页截图：${mobileHomeScreenshotPath}\n`);
  await page.setViewportSize({ width: 1920, height: 1080 });

  await page.goto(`${baseUrl}/profile`);
  check(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1), "桌面全屏资料填写页无纵向滚动条");
  const profileScreenshotPath = join(tmpdir(), "children-speech-v2-profile-fit.png");
  await page.screenshot({ path: profileScreenshotPath, fullPage: true });
  process.stdout.write(`资料填写页截图：${profileScreenshotPath}\n`);
  await page.locator('input[name="name"]').fill("自动测试学生");
  await page.locator('select[name="gender"]').selectOption("female");
  await page.locator('select[name="age"]').selectOption("6");
  check(await page.locator('select[name="age"] option').count() === 17, "年龄恢复为 3–18 岁选择项");
  await page.locator('select[name="grade"]').selectOption("grade-2");
  check((await page.locator(".recommendation").textContent()).includes("B段"), "二年级自动推荐 B 段");

  await page.getByRole("button", { name: "调整阶段" }).click();
  await page.locator(".stage-picker__option").filter({ hasText: "综合表达" }).click();
  check((await page.locator(".recommendation").textContent()).includes("C段"), "老师可以手动调整为 C 段");

  await page.getByRole("button", { name: "调整阶段" }).click();
  await page.locator(".stage-picker__option").filter({ hasText: "表达启蒙" }).click();
  await page.getByRole("button", { name: /开始评测/ }).click();
  await page.waitForURL(/\/stage\/A\/intro/);
  check(await page.getByRole("heading", { name: "表达启蒙" }).isVisible(), "进入 A 段介绍页");
  check(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth && document.documentElement.scrollHeight <= window.innerHeight + 1), "桌面全屏阶段介绍页无横向和纵向滚动条");
  await page.setViewportSize({ width: 1366, height: 768 });
  check(await page.evaluate(() => {
    const button = [...document.querySelectorAll("button")].find((item) => item.textContent?.includes("开始正式评测"));
    return document.documentElement.scrollWidth <= window.innerWidth && document.documentElement.scrollHeight <= window.innerHeight + 1 && Boolean(button && button.getBoundingClientRect().bottom <= window.innerHeight);
  }), "较矮桌面窗口的阶段介绍页无滚动条且底部按钮完整可见");
  await page.setViewportSize({ width: 1920, height: 1080 });

  await page.getByRole("button", { name: "测试麦克风", exact: true }).click();
  await page.locator(".microphone-check--success").waitFor();
  check(await page.getByText("✓ 麦克风正常", { exact: true }).isVisible(), "评测前麦克风测试能够检测真实音频输入");
  await page.evaluate(() => {
    globalThis.__originalGetUserMedia = navigator.mediaDevices.getUserMedia;
    navigator.mediaDevices.getUserMedia = async () => { throw new DOMException("Denied", "NotAllowedError"); };
  });
  await page.getByRole("button", { name: "重新测试麦克风" }).click();
  await page.locator(".microphone-check--error").waitFor();
  check((await page.locator(".microphone-check").textContent()).includes("麦克风权限未开启"), "麦克风授权失败时显示可操作提示");
  await page.evaluate(() => { navigator.mediaDevices.getUserMedia = globalThis.__originalGetUserMedia; });
  await page.getByRole("button", { name: "开始正式评测" }).click();
  await page.waitForURL(/\/assessment\/.+\/A1/);
  await page.getByRole("heading", { name: "后台测试看图说词" }).waitFor();
  check(await page.getByRole("heading", { name: "后台测试看图说词" }).isVisible(), "后台修改的评测题目在 A1 生效");
  check(await page.locator(".module-uploaded-image img").isVisible(), "后台上传的题目图片在 A1 生效");
  const sessionId = page.url().match(/assessment\/(session_[^/]+)/)?.[1];
  check(Boolean(sessionId), "建立并进入评测 Session");

  check(await page.getByRole("button", { name: /开始智能评测/ }).isVisible(), "A1 使用圆形麦克风评测入口");
  check(await page.locator(".smart-evaluator__dimension").count() === 3, "A1 显示三个独立评星维度");
  check(await page.getByText("看着图片，按下麦克风开始", { exact: true }).count() === 0, "A1 去掉麦克风下方的闲置提示");
  check(await page.locator(".pronunciation-card__interaction .smart-evaluator__voiceprint").evaluate((element) => Number.parseFloat(getComputedStyle(element).height) >= 48), "A1 声纹检测条向下加高");
  const goldDimension = await page.locator(".smart-evaluator__dimension").first().evaluate((card) => ({ border: getComputedStyle(card).borderTopColor, label: getComputedStyle(card.querySelector("span")).color, stars: getComputedStyle(card.querySelector("strong")).color }));
  check(goldDimension.border.includes("255, 210, 74") && goldDimension.label.includes("255, 224, 113") && goldDimension.stars.includes("255, 210, 74"), "评测维度的文字、边框和星星统一为金色");
  check(await page.locator(".teacher-controls__label").getByText("教师操作", { exact: true }).isVisible() && await page.locator(".teacher-controls button").count() === 3 && await page.locator(".intelligent-rating").count() === 0 && await page.getByRole("button", { name: "教师星级评价" }).isVisible(), "A1 使用教师操作、重测、跳过本项和教师星级评价布局");
  const wordScoringProtocol = await page.evaluate(async () => {
    const speech = await import("/src/services/speech/xfyunIse.ts");
    const valid = speech.parseXfyunIseResult('<?xml version="1.0"?><read_word total_score="4.5" phone_score="4.8" tone_score="4.2" fluency_score="0" integrity_score="0"><sentence><word dp_message="0"><syll dp_message="0" /></word></sentence></read_word>');
    let mismatchDetected = false;
    try { speech.parseXfyunIseResult('<?xml version="1.0"?><read_word total_score="1"><sentence><word dp_message="128"><syll dp_message="128" /></word></sentence></read_word>'); } catch (error) { mismatchDetected = error instanceof speech.SpeechContentMismatchError; }
    return { totalScore: valid.totalScore, pronunciationScore: valid.pronunciationScore, toneScore: valid.toneScore, mismatchDetected, exactTextMatches: speech.matchesReferenceText("苹果。", "苹果"), wrongWordRejected: !speech.matchesReferenceText("西瓜", "苹果") };
  });
  check(wordScoringProtocol.totalScore === 90 && wordScoringProtocol.pronunciationScore === 96 && wordScoringProtocol.toneScore === 84, "词语评测使用有效的总分、声韵分和声调分，不再使用固定为零的保留字段");
  check(wordScoringProtocol.mismatchDetected, "漏读或替换词语时会进入读错提示流程");
  check(wordScoringProtocol.exactTextMatches && wordScoringProtocol.wrongWordRejected, "语音转写必须与目标词一致，西瓜不能作为苹果参与评分");
  check(await page.locator(".smart-evaluator__voiceprint i").first().evaluate((bar) => getComputedStyle(bar).animationName === "voiceprint-idle"), "A1 无声音时声纹仍保持柔和运动");
  check(await page.locator("audio").count() === 0, "A1 不再保存或播放录音");
  check(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth && document.documentElement.scrollHeight <= window.innerHeight + 1), "A1 桌面全屏无横向和纵向滚动条");
  await page.waitForTimeout(650);
  const pronunciationScreenshotPath = join(tmpdir(), "children-speech-v2-a1-redesign.png");
  await page.screenshot({ path: pronunciationScreenshotPath, fullPage: true });
  process.stdout.write(`A1 新布局截图：${pronunciationScreenshotPath}\n`);
  await page.setViewportSize({ width: 1366, height: 768 });
  const a1CompactFit = await page.evaluate(() => {
    const picture = document.querySelector(".pronunciation-card__picture .module-uploaded-image")?.getBoundingClientRect();
    const image = document.querySelector(".pronunciation-card__picture img")?.getBoundingClientRect();
    const picturePanel = document.querySelector(".pronunciation-card__picture")?.getBoundingClientRect();
    const evaluator = document.querySelector(".pronunciation-card__interaction")?.getBoundingClientRect();
    return { scrollHeight: document.documentElement.scrollHeight, viewportHeight: window.innerHeight, picture: picture && { left: picture.left, right: picture.right, top: picture.top, bottom: picture.bottom }, image: image && { top: image.top, bottom: image.bottom }, picturePanel: picturePanel && { top: picturePanel.top, bottom: picturePanel.bottom }, evaluator: evaluator && { left: evaluator.left, right: evaluator.right, top: evaluator.top, bottom: evaluator.bottom } };
  });
  const a1ElementsSeparated = a1CompactFit.picture && a1CompactFit.evaluator && (a1CompactFit.picture.right <= a1CompactFit.evaluator.left + 1 || a1CompactFit.picture.bottom <= a1CompactFit.evaluator.top + 1);
  check(a1CompactFit.scrollHeight <= a1CompactFit.viewportHeight + 1 && a1ElementsSeparated && a1CompactFit.image.bottom <= a1CompactFit.picturePanel.bottom + 1, `A1 在较小桌面屏幕中题图与评测入口不重叠 ${JSON.stringify(a1CompactFit)}`);
  const compactScreenshotPath = join(tmpdir(), "children-speech-v2-a1-compact.png");
  await page.screenshot({ path: compactScreenshotPath, fullPage: true });
  process.stdout.write(`A1 紧凑布局截图：${compactScreenshotPath}\n`);
  await page.setViewportSize({ width: 390, height: 844 });
  check(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "A1 手机宽度无横向滚动条");
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.route("**/api/xfyun/ise-auth", (route) => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "E2E preview mode" }) }));
  await page.evaluate(() => { globalThis.__speechSilenceAfterMs = 900; });
  await page.getByRole("button", { name: /开始智能评测/ }).click();
  await page.locator(".smart-evaluator__voiceprint").waitFor();
  await page.getByText(/体验模式/).waitFor();
  check(await page.locator(".smart-evaluator__voiceprint.is-listening").isVisible(), "未配置正式服务时仍可体验实时声纹");
  check(await page.getByRole("button", { name: /正在自动识别/ }).isDisabled(), "识别期间无需手动点击完成");
  await page.locator(".smart-evaluator__voiceprint.has-sound").waitFor();
  check(await page.locator(".smart-evaluator__voiceprint i").first().evaluate((bar) => getComputedStyle(bar).animationName === "voiceprint-live"), "检测到声音时声纹切换为大幅波动");
  await page.getByText(/体验模式只展示交互/).waitFor({ timeout: 5000 });
  await page.evaluate(() => { delete globalThis.__speechSilenceAfterMs; });
  await page.unroute("**/api/xfyun/ise-auth");
  check(await page.getByRole("button", { name: "完成发音并评星" }).count() === 0, "A1 不再提供手动完成按钮");
  check(await page.locator(".smart-evaluator__dimension.is-complete").count() === 0, "体验模式不伪造三个维度的星级");
  await page.getByRole("button", { name: "教师星级评价" }).click();
  check(await page.locator(".score-row").count() === 3, "A1 教师星级评价入口可以正常打开");
  await page.getByRole("button", { name: "稍后填写" }).click();
  await page.locator(".dialog-backdrop").waitFor({ state: "detached" });
  await page.getByRole("button", { name: "下一项" }).click();
  await page.waitForURL(/\/A2/);
  await page.locator(".breathing-game").waitFor();
  check(await page.locator(".breathing-game").isVisible(), "A2 小火车气息界面可用");
  check(await page.locator(".breathing-evaluator .smart-evaluator__dimension").count() === 3, "A2 显示持续发声、发声连贯、声音稳定三个智能维度");
  const assessmentScreenshotPath = join(tmpdir(), "children-speech-v2-a2.png");
  await page.screenshot({ path: assessmentScreenshotPath, fullPage: true });
  process.stdout.write(`A2 页面截图：${assessmentScreenshotPath}\n`);
  await page.getByRole("button", { name: "开始气息评测" }).click();
  await page.locator(".breathing-evaluator .smart-evaluator__voiceprint.is-listening").waitFor();
  check(await page.locator(".breathing-evaluator .smart-evaluator__voiceprint.is-listening").isVisible(), "A2 发声时显示实时声纹");
  await page.waitForTimeout(1200);
  check(await page.locator(".train-wheel-spin").count() === 0, "A2 不再叠加轮子动画");
  check(await page.locator(".train.is-moving .train-smoke").count() === 3, "A2 火车前进时烟囱持续冒烟");
  const movingTrainScreenshot = join(tmpdir(), "children-speech-v2-a2-moving.png");
  await page.locator(".breathing-game").screenshot({ path: movingTrainScreenshot });
  process.stdout.write(`A2 火车动态截图：${movingTrainScreenshot}\n`);
  const trainLeft = await page.locator(".breathing-game .train").evaluate((element) => Number.parseFloat(getComputedStyle(element).left));
  await page.getByRole("button", { name: "完成气息评测" }).click();
  check(trainLeft > 0, "实时音量驱动小火车前进");
  await page.waitForFunction(() => document.querySelectorAll(".breathing-evaluator .smart-evaluator__dimension.is-complete").length === 3);
  await page.getByText("按下麦克风，持续发出“呜——”", { exact: true }).waitFor();
  check(await page.getByText("按下麦克风，持续发出“呜——”", { exact: true }).isVisible(), "A2 完成后标题显示持续发声提示");
  check(await page.locator(".breathing-evaluator small").count() === 0, "A2 去掉重复的麦克风提示小字");
  check(await page.locator(".breathing-evaluator .smart-evaluator__voiceprint").evaluate((element) => Number.parseFloat(getComputedStyle(element).height) >= 48), "A2 声纹检测条向下加高");
  check(await page.locator(".breathing-evaluator .smart-evaluator__dimension.is-complete").count() === 3, "A2 完成后生成三个维度的智能评星");
  check(await page.locator(".teacher-controls__label").getByText("教师操作", { exact: true }).isVisible() && await page.locator(".teacher-controls button").count() === 3 && await page.locator(".intelligent-rating").count() === 0 && await page.getByRole("button", { name: "教师星级评价" }).isVisible(), "A2 同步使用完整教师操作栏且不显示智能评星卡片");
  await page.getByRole("button", { name: "开始气息评测" }).click();
  await page.waitForFunction(() => document.querySelectorAll(".breathing-evaluator .smart-evaluator__dimension.is-complete").length === 0);
  check(await page.locator(".breathing-evaluator .smart-evaluator__dimension.is-complete").count() === 0, "点击再测一次会立即清空右侧旧的智能评分");
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "完成气息评测" }).click();
  await page.waitForFunction(() => document.querySelectorAll(".breathing-evaluator .smart-evaluator__dimension.is-complete").length === 3);
  await page.getByRole("button", { name: "下一项" }).click();
  await page.waitForURL(/\/A3/);
  await page.locator(".sequence-art--water").waitFor();
  check(await page.evaluate(() => getComputedStyle(document.querySelector(".sequence-art--water"), "::after").animationName === "none"), "A3 浇水图片保持静态");
  await page.locator(".sequence-card").nth(0).getByRole("button", { name: /向后移动/ }).click();
  await page.locator(".sequence-card").nth(1).getByRole("button", { name: /向后移动/ }).click();
  const sequenceText = await page.locator(".sequence-language").textContent();
  check(sequenceText.includes("先种下种子") && sequenceText.includes("最后开出小花"), "A3 三图排序可交互并更新表达顺序");
  check(await page.getByRole("button", { name: /开始录音/ }).count() === 0, "A3 已去掉录音功能");
  const viewportFit = await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1);
  check(viewportFit, "桌面全屏评测页面无纵向滚动条");
  await page.getByRole("button", { name: "下一项" }).click();
  await page.waitForURL(/\/A4/);
  check(await page.getByRole("button", { name: /开始录音/ }).count() === 0, "A4 已去掉录音功能");
  const a4Composition = await page.evaluate(() => {
    const card = document.querySelector(".module-card--scenario")?.getBoundingClientRect();
    const image = document.querySelector(".module-card--scenario .scenario-uploaded-image")?.getBoundingClientRect();
    const visual = document.querySelector(".module-card--scenario .module-card__visual--character");
    return { cardWidth: card?.width ?? 0, imageWidth: image?.width ?? 0, overflow: card ? getComputedStyle(document.querySelector(".module-card--scenario")).overflow : "", background: visual ? getComputedStyle(visual).backgroundColor : "" };
  });
  check(a4Composition.imageWidth > a4Composition.cardWidth * .25 && a4Composition.overflow === "hidden" && a4Composition.background === "rgba(0, 0, 0, 0)", "A4 中国小朋友使用右下角放大构图并限制在白色内容区");
  await page.locator(".module-card--scenario .module-card__visual--character").hover();
  const a4VisualHover = await page.locator(".module-card--scenario .module-card__visual--character").evaluate((visual) => ({ boxShadow: getComputedStyle(visual).boxShadow, transform: getComputedStyle(visual).transform, decoration: getComputedStyle(visual, "::before").display }));
  check(a4VisualHover.boxShadow === "none" && ["none", "matrix(1, 0, 0, 1, 0, 0)"].includes(a4VisualHover.transform) && a4VisualHover.decoration === "none", "A4 人物后方板块及悬停阴影已移除");
  const a4ScreenshotPath = join(tmpdir(), "children-speech-v2-a4-character.png");
  await page.screenshot({ path: a4ScreenshotPath, fullPage: true });
  process.stdout.write(`A4 人物布局截图：${a4ScreenshotPath}\n`);
  await page.getByRole("button", { name: "下一项" }).click();
  await page.waitForURL(/\/A5/);
  check(await page.getByRole("button", { name: /开始录音/ }).count() === 0, "A5 已去掉录音功能");
  check(await page.locator(".animal-blink").count() === 0, "A5 小老虎已去掉眨眼动画");
  const a5Composition = await page.evaluate(() => {
    const card = document.querySelector(".module-card--animal")?.getBoundingClientRect();
    const image = document.querySelector(".module-card--animal .module-uploaded-image")?.getBoundingClientRect();
    return { cardWidth: card?.width ?? 0, imageWidth: image?.width ?? 0, overflow: card ? getComputedStyle(document.querySelector(".module-card--animal")).overflow : "" };
  });
  check(a5Composition.imageWidth > a5Composition.cardWidth * .25 && a5Composition.overflow === "hidden", "A5 小老虎使用右下角放大构图并限制在白色内容区");
  await page.locator(".module-card--animal .module-card__visual--character").hover();
  const a5VisualHover = await page.locator(".module-card--animal .module-card__visual--character").evaluate((visual) => ({ boxShadow: getComputedStyle(visual).boxShadow, transform: getComputedStyle(visual).transform, decoration: getComputedStyle(visual, "::before").display }));
  check(a5VisualHover.boxShadow === "none" && ["none", "matrix(1, 0, 0, 1, 0, 0)"].includes(a5VisualHover.transform) && a5VisualHover.decoration === "none", "A5 小老虎后方板块及悬停阴影已移除");
  const a5ScreenshotPath = join(tmpdir(), "children-speech-v2-a5-character.png");
  await page.screenshot({ path: a5ScreenshotPath, fullPage: true });
  process.stdout.write(`A5 人物布局截图：${a5ScreenshotPath}\n`);

  await page.goto(`${baseUrl}/report/${sessionId}`);
  await page.getByRole("heading", { name: "能力画像" }).waitFor();
  check(await page.getByText("具体表现与训练建议").isVisible(), "报告生成雷达图与具体训练建议");
  const reportText = await page.locator(".report-card").textContent();
  check(!/综合评分|能力得分|\/ 100/.test(reportText), "报告不展示孩子的数字分数");
  check(await page.getByRole("heading", { name: "扫描二维码下载报告图片" }).isVisible(), "报告顶部显示下载二维码");
  const sharedReportUrl = await page.locator(".report-qr-panel__code").getAttribute("data-share-url");
  check(Boolean(sharedReportUrl?.includes("/report/shared?report=")), "二维码包含可独立打开的报告数据");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "下载报告图片" }).first().click();
  const download = await downloadPromise;
  check(download.suggestedFilename().endsWith("-口才能力评测报告.png"), "报告可生成高清 PNG 图片");
  const downloadedReportPath = join(tmpdir(), "children-speech-v2-downloaded-report.png");
  await download.saveAs(downloadedReportPath);
  process.stdout.write(`下载报告图片：${downloadedReportPath}\n`);
  await page.goto(sharedReportUrl);
  await page.getByRole("heading", { name: "能力画像" }).waitFor();
  check(await page.getByText("报告已成功打开").isVisible(), "扫码链接可在新设备独立还原报告");
  const screenshotPath = join(tmpdir(), "children-speech-v2-report.png");
  await page.screenshot({ path: screenshotPath, fullPage: true });
  process.stdout.write(`报告截图：${screenshotPath}\n`);
  await page.goto(`${baseUrl}/admin/content`);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "恢复全部默认" }).click();
  await page.goto(`${baseUrl}/`);
  check(await page.getByRole("heading", { name: /看见孩子/ }).isVisible(), "后台可以恢复全部默认内容");
  check(await page.getByRole("button", { name: "历史测评" }).count() === 0, "首页不再显示历史报告入口");
  await page.goto(`${baseUrl}/assessment/${sessionId}/A1`);
  await page.locator(".pronunciation-card__picture .module-uploaded-image img").waitFor();
  check((await page.locator(".pronunciation-card__picture .module-uploaded-image img").getAttribute("src"))?.endsWith("/assets/v2/questions/a1-apple-v3.png"), "默认题目使用新的卡通苹果图片");
  const defaultWordLayout = await page.locator(".pronunciation-card__word").evaluate((element) => ({ label: element.getAttribute("aria-label"), text: element.textContent?.replace(/\s/g, "") ?? "", syllables: element.querySelectorAll(".pronunciation-card__syllable").length }));
  check(defaultWordLayout.label === "苹果" && defaultWordLayout.text.includes("píng") && defaultWordLayout.text.includes("guǒ") && defaultWordLayout.syllables === 2, "默认题图右侧按 MasterGo 核心内容布局逐字显示拼音和汉字");
  check(await page.getByText("不播放标准读音。请让孩子看图后自然说出名称。").count() === 0, "A1 不再显示旧提示语");
  check(await page.locator(".smart-evaluator__dimension.is-complete").count() === 0, "右侧三个星级栏只显示智能评分，不展示教师评分");
  await page.waitForTimeout(650);
  const defaultPronunciationScreenshotPath = join(tmpdir(), "children-speech-v2-a1-default.png");
  await page.screenshot({ path: defaultPronunciationScreenshotPath, fullPage: true });
  process.stdout.write(`A1 默认题图截图：${defaultPronunciationScreenshotPath}\n`);
  await page.goto(`${baseUrl}/v3`);
  check(await page.getByRole("heading", { name: "口才评测新版本" }).isVisible(), "新版在独立入口运行，旧版保留");
  const calibratedScores = await page.evaluate(async () => {
    const { strictPronunciationScore } = await import("/src/v3/scoring.ts");
    const valid = strictPronunciationScore({ totalScore: 98, pronunciationScore: 98, stars: 5, rawXml: '<read_word><syll content="苹" syll_score="4.9"/><syll content="果" syll_score="4.9"/></read_word>' }, "苹果");
    const wrongPhone = strictPronunciationScore({ totalScore: 98, pronunciationScore: 98, stars: 5, rawXml: '<read_word><syll content="苹" syll_score="4.9"><phone dp_message="128"/></syll><syll content="果" syll_score="4.9"/></read_word>' }, "苹果");
    return { valid: valid.stars, wrongPhone: wrongPhone.stars };
  });
  check(calibratedScores.valid === 5 && calibratedScores.wrongPhone === 0, "新版正音评分拦截音素替换，不沿用宽松总分");
  check(await page.locator(".v3-initial").count() === 23, "小阶段正音提供 23 个声母及对应词图");
  check(await page.locator(".v3-word-text strong").textContent() === "包子", "默认声母 b 对应词语包子");
  check(await page.locator(".v3-word-image img").evaluate((image) => image.complete && image.naturalWidth > 0), "声母题使用可正常加载的 3D 词语图片");
  check(await page.evaluate(async () => {
    const { initialQuestions } = await import("/src/v3/config.ts");
    return (await Promise.all(initialQuestions.map(async ({ picture }) => {
      const response = await fetch(picture, { method: "HEAD" });
      return response.ok && response.headers.get("content-type")?.startsWith("image/");
    }))).every(Boolean);
  }), "23 个声母的词语图片路径全部有效");
  await page.waitForTimeout(650);
  check(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "新版桌面宽度无横向滚动条");
  const v3WordScreenshotPath = join(tmpdir(), "children-speech-v3-word.png");
  await page.screenshot({ path: v3WordScreenshotPath, fullPage: true });
  process.stdout.write(`新版声母题截图：${v3WordScreenshotPath}\n`);
  await page.getByRole("button", { name: "教师评3颗星" }).click();
  check(await page.locator(".v3-initial.is-complete").count() === 1, "完成的声母移动至已评测区");
  await page.waitForFunction(() => Boolean(JSON.parse(localStorage.getItem("starvoice-v3-ratings") ?? "{}")["small-pronunciation-b"]));
  await page.reload();
  await page.locator(".v3-initial").first().waitFor();
  check(await page.locator(".v3-initial.is-complete").count() === 1, "新版评测进度刷新后保留");
  await page.getByRole("button", { name: "大阶段" }).click();
  check(await page.locator(".v3-sentence-card").count() === 2, "大阶段正音包含平翘舌和 d t n l 两句话");
  await page.locator(".v3-nav button").nth(2).click();
  check(await page.getByRole("heading", { name: "森林广播员" }).isVisible(), "大阶段表现力提供情境题");
  await page.getByRole("button", { name: "小阶段" }).click();
  await page.locator(".v3-nav button").nth(2).click();
  check(await page.locator(".v3-animal-tabs button").count() === 3, "小阶段表现力提供三种动物模仿");
  await page.getByRole("button", { name: "小狗" }).click();
  await page.waitForFunction(() => { const image = document.querySelector(".v3-animal-card img"); return image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0; });
  check(await page.locator(".v3-animal-card img").evaluate((image) => image.complete && image.naturalWidth > 0), "小狗配图正常加载");
  const v3DogScreenshotPath = join(tmpdir(), "children-speech-v3-dog.png");
  await page.screenshot({ path: v3DogScreenshotPath, fullPage: true });
  process.stdout.write(`新版小狗题截图：${v3DogScreenshotPath}\n`);
  await page.getByRole("button", { name: "小鸭" }).click();
  await page.waitForFunction(() => { const image = document.querySelector(".v3-animal-card img"); return image instanceof HTMLImageElement && image.src.endsWith("/assets/v3/animals/duck.png") && image.complete && image.naturalWidth > 0; });
  check(await page.locator(".v3-animal-card img").evaluate((image) => image.complete && image.naturalWidth > 0), "小鸭配图正常加载");
  await page.locator(".v3-nav button").nth(1).click();
  await page.evaluate(() => { globalThis.__speechSilenceAfterMs = 1200; });
  await page.getByRole("button", { name: "按下麦克风出发" }).click();
  await page.getByText(/发声停止，已自动总结/).waitFor({ timeout: 9000 });
  check(await page.getByRole("button", { name: "再测一次" }).isVisible(), "新版气息在停声后自动出成绩，无需点击完成");
  await page.evaluate(() => { globalThis.__speechSilenceAfterMs = undefined; });
  await page.getByRole("button", { name: "再测一次" }).click();
  await page.getByText(/到达终点，已自动总结/).waitFor({ timeout: 18000 });
  check(await page.getByRole("button", { name: "再测一次" }).isVisible(), "新版小火车到达终点后自动出成绩");
  await page.locator(".v3-nav button").nth(3).click();
  check(await page.getByText("60 分").count() >= 1, "新版报告汇总已完成项目");
  const v3ScreenshotPath = join(tmpdir(), "children-speech-v3-small-report.png");
  await page.screenshot({ path: v3ScreenshotPath, fullPage: true });
  process.stdout.write(`新版报告截图：${v3ScreenshotPath}\n`);
  await page.setViewportSize({ width: 390, height: 844 });
  check(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "新版手机宽度无横向滚动条");
  check(pageErrors.length === 0, `浏览器运行无页面错误${pageErrors.length ? `：${pageErrors.join("；")}` : ""}`);
} finally {
  await browser.close();
}
