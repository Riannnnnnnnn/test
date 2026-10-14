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
      globalThis.__speechTestAudio = { audioContext, oscillator };
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

  await page.goto(`${baseUrl}/profile`);
  check(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1), "桌面全屏资料填写页无纵向滚动条");
  const profileScreenshotPath = join(tmpdir(), "children-speech-v2-profile-fit.png");
  await page.screenshot({ path: profileScreenshotPath, fullPage: true });
  process.stdout.write(`资料填写页截图：${profileScreenshotPath}\n`);
  await page.locator('input[name="name"]').fill("自动测试学生");
  await page.locator('select[name="gender"]').selectOption("female");
  await page.locator('input[name="age"]').fill("6");
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
  await page.getByRole("button", { name: /开始智能评测/ }).click();
  await page.locator(".smart-evaluator__voiceprint").waitFor();
  await page.getByText(/体验模式/).waitFor();
  check(await page.locator(".smart-evaluator__voiceprint.is-listening").isVisible(), "未配置正式服务时仍可体验实时声纹");
  await page.locator(".smart-evaluator__voiceprint.has-sound").waitFor();
  check(await page.locator(".smart-evaluator__voiceprint i").first().evaluate((bar) => getComputedStyle(bar).animationName === "voiceprint-live"), "检测到声音时声纹切换为大幅波动");
  await page.waitForTimeout(700);
  await page.getByRole("button", { name: "完成发音并评星" }).click();
  await page.getByText(/体验模式只展示交互/).waitFor();
  check(await page.locator(".smart-evaluator__dimension.is-complete").count() === 0, "体验模式不伪造三个维度的星级");
  check(await page.locator(".intelligent-rating:not(.is-complete)").isVisible(), "未配置正式服务时智能评星保持待评测");

  const scoreButton = page.getByRole("button", { name: "教师星级评价" });
  for (let index = 0; index < 3; index += 1) {
    await scoreButton.dispatchEvent("pointerdown", { clientX: 20, clientY: 20, pointerId: index + 1, pointerType: "mouse" });
    await page.locator("body").dispatchEvent("pointermove", { clientX: 1, clientY: 1, pointerId: index + 1, pointerType: "mouse" });
    await page.locator("body").dispatchEvent("pointerup", { clientX: 1, clientY: 1, pointerId: index + 1, pointerType: "mouse" });
  }
  await page.waitForTimeout(750);
  check(await scoreButton.locator(":scope > .interaction-ripple").count() === 0, "评分按钮移出后不会累积白色点击层");
  await scoreButton.click();
  check(await page.locator(".dialog .rounded-star").count() === 30, "教师评星统一使用 EPS 圆角星形");
  const selectedScoreStarStyle = await page.locator(".score-scale button.is-selected .rounded-star").first().evaluate((star) => {
    const style = getComputedStyle(star);
    const pathStyle = getComputedStyle(star.querySelector("path"));
    return { color: style.color, animationName: style.animationName, fill: pathStyle.fill, stroke: pathStyle.stroke };
  });
  const unselectedScoreStarStyle = await page.locator(".score-scale button:not(.is-selected) .rounded-star").first().evaluate((star) => {
    const pathStyle = getComputedStyle(star.querySelector("path"));
    const buttonStyle = getComputedStyle(star.closest("button"));
    return { fill: pathStyle.fill, stroke: pathStyle.stroke, buttonBorderColor: buttonStyle.borderColor };
  });
  const summaryScoreStarStyle = await page.locator(".score-stars .rounded-star.is-filled").first().evaluate((star) => {
    const pathStyle = getComputedStyle(star.querySelector("path"));
    return { fill: pathStyle.fill, stroke: pathStyle.stroke };
  });
  check(selectedScoreStarStyle.color === "rgb(255, 244, 199)" && selectedScoreStarStyle.fill === "rgb(255, 244, 199)" && selectedScoreStarStyle.stroke === "rgb(255, 244, 199)" && selectedScoreStarStyle.animationName === "score-selected-star-glow", "点亮星星使用暖象牙白实心与金色发光动效");
  check(unselectedScoreStarStyle.fill === "rgb(170, 166, 179)" && unselectedScoreStarStyle.stroke === "rgba(0, 0, 0, 0)" && unselectedScoreStarStyle.buttonBorderColor === "rgb(187, 183, 196)", "未点亮星星及按钮边框使用深灰色样式");
  check(summaryScoreStarStyle.fill === "rgb(255, 212, 59)" && summaryScoreStarStyle.stroke === "rgb(255, 212, 59)", "顶部汇总中点亮星星保持原有金黄色实心样式");
  const starDialogScreenshot = join(tmpdir(), "children-speech-v2-rounded-stars.png");
  await page.locator(".dialog").screenshot({ path: starDialogScreenshot });
  process.stdout.write(`圆角星形截图：${starDialogScreenshot}\n`);
  for (const row of await page.locator(".score-row").all()) await row.getByRole("radio", { name: "第4颗星" }).click();
  await page.getByRole("button", { name: "保存评价" }).click();
  await page.locator(".dialog-backdrop").waitFor({ state: "detached" });
  check(await page.locator(".dialog-backdrop").count() === 0, "老师评分保存成功");
  check(await page.getByRole("button", { name: "已完成教师评价" }).isVisible(), "评价完成后按钮显示完成提示");
  const completedEvaluationScreenshot = join(tmpdir(), "children-speech-v2-evaluation-complete.png");
  await page.locator(".teacher-controls").screenshot({ path: completedEvaluationScreenshot });
  process.stdout.write(`评价完成按钮截图：${completedEvaluationScreenshot}\n`);

  await page.getByRole("button", { name: "下一项" }).click();
  await page.waitForURL(/\/A2/);
  await page.locator(".breathing-game").waitFor();
  check(await page.locator(".breathing-game").isVisible(), "A2 小火车气息界面可用");
  check(await page.locator(".breathing-evaluator .smart-evaluator__dimension").count() === 3, "A2 显示持续发声、发声连贯、声音稳定三个智能维度");
  const assessmentScreenshotPath = join(tmpdir(), "children-speech-v2-a2.png");
  await page.screenshot({ path: assessmentScreenshotPath, fullPage: true });
  process.stdout.write(`A2 页面截图：${assessmentScreenshotPath}\n`);
  await page.getByRole("button", { name: "开始气息评测" }).click();
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
  check(await page.getByText("按下麦克风，持续发出“呜——”", { exact: true }).isVisible(), "A2 完成后标题显示持续发声提示");
  check(await page.locator(".breathing-evaluator small").count() === 0, "A2 去掉重复的麦克风提示小字");
  check(await page.locator(".breathing-evaluator .smart-evaluator__voiceprint").evaluate((element) => Number.parseFloat(getComputedStyle(element).height) >= 48), "A2 声纹检测条向下加高");
  check(await page.locator(".breathing-evaluator .smart-evaluator__dimension.is-complete").count() === 3, "A2 完成后生成三个维度的智能评星");
  check(await page.locator(".intelligent-rating.is-complete").isVisible(), "A2 底部显示已完成的智能评星");
  await page.getByRole("button", { name: "教师星级评价" }).click();
  check(await page.locator(".score-row").count() === 3, "A2 教师评价也包含三个维度");
  for (const row of await page.locator(".score-row").all()) await row.getByRole("radio", { name: "第4颗星" }).click();
  await page.getByRole("button", { name: "保存评价" }).click();
  await page.locator(".dialog-backdrop").waitFor({ state: "detached" });
  check(await page.getByRole("button", { name: "已完成教师评价" }).isVisible(), "A2 双重评星中的教师评价可保存");
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
  check(await page.locator(".pronunciation-card__word").getByText("苹果").isVisible(), "默认题图文字显示在图片右侧");
  check(await page.getByText("不播放标准读音。请让孩子看图后自然说出名称。").count() === 0, "A1 不再显示旧提示语");
  check(await page.locator(".smart-evaluator__dimension.is-complete").count() === 3, "教师完成评价后三个发声维度显示星级");
  await page.waitForTimeout(650);
  const defaultPronunciationScreenshotPath = join(tmpdir(), "children-speech-v2-a1-default.png");
  await page.screenshot({ path: defaultPronunciationScreenshotPath, fullPage: true });
  process.stdout.write(`A1 默认题图截图：${defaultPronunciationScreenshotPath}\n`);
  check(pageErrors.length === 0, `浏览器运行无页面错误${pageErrors.length ? `：${pageErrors.join("；")}` : ""}`);
} finally {
  await browser.close();
}
