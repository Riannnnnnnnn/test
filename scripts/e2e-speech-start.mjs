import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const browser = await chromium.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  args: ['--autoplay-policy=no-user-gesture-required'],
});

try {
  const context = await browser.newContext();
  await context.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      const audio = new AudioContext();
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      const destination = audio.createMediaStreamDestination();
      gain.gain.value = .24;
      oscillator.connect(gain).connect(destination);
      oscillator.start();
      return destination.stream;
    };
  });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:5173/profile');
  const outcome = await page.evaluate(async () => {
    const packets = [];
    const originalFetch = window.fetch;
    const originalWebSocket = window.WebSocket;
    const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    let microphoneRequests = 0;
    navigator.mediaDevices.getUserMedia = (...args) => {
      microphoneRequests += 1;
      return originalGetUserMedia(...args);
    };
    window.fetch = (input, init) => String(input).includes('/api/xfyun/ise-auth')
      ? Promise.resolve(new Response(JSON.stringify({ appId: 'test', url: 'wss://test/ise', iatUrl: 'wss://test/iat' }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      : originalFetch(input, init);
    class SlowWebSocket extends EventTarget {
      static OPEN = 1;
      readyState = 0;
      constructor(url) {
        super();
        this.url = url;
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
      await new Promise((resolve) => setTimeout(resolve, 150));
      const bothServicesReceivedAudio = ['ise', 'iat'].every((service) => packets.some((packet) =>
        packet.url.endsWith(service) && (packet.value.data?.audio || packet.value.business?.cmd === 'auw')));
      session.cancel();
      const { acquireMicrophone, releaseMicrophone, shutdownMicrophone, warmMicrophone } = await import('/src/services/audio/microphone.ts');
      const reused = await acquireMicrophone();
      const reusedAfterCancel = microphoneRequests === 1 && reused.getAudioTracks()[0]?.enabled === true;
      releaseMicrophone(reused);
      shutdownMicrophone();
      const closedOnShutdown = reused.getAudioTracks()[0]?.readyState === 'ended';
      const originalQuery = navigator.permissions.query.bind(navigator.permissions);
      navigator.permissions.query = async () => ({ state: 'prompt' });
      await warmMicrophone();
      const noPermissionPromptDuringWarmup = microphoneRequests === 1;
      navigator.permissions.query = originalQuery;
      return { captureDelay, capturedBeforeConnection, bothServicesReceivedAudio, reusedAfterCancel, closedOnShutdown, noPermissionPromptDuringWarmup };
    } finally {
      window.fetch = originalFetch;
      window.WebSocket = originalWebSocket;
      navigator.mediaDevices.getUserMedia = originalGetUserMedia;
    }
  });
  assert(outcome.captureDelay < 1200, `麦克风启动耗时 ${outcome.captureDelay.toFixed(0)}ms`);
  assert(outcome.capturedBeforeConnection, '连接期间应已开始本地收音');
  assert(outcome.bothServicesReceivedAudio, '连接后两条服务都应收到暂存音频');
  assert(outcome.reusedAfterCancel, '重测应复用短时保留的麦克风，不重新申请设备');
  assert(outcome.closedOnShutdown, '离开页面时应关闭空闲麦克风');
  assert(outcome.noPermissionPromptDuringWarmup, '未授权时预热不应请求麦克风权限');
  console.log('PASS 点击后先收音、慢连接补发音频、重测复用麦克风');
} finally {
  await browser.close();
}
