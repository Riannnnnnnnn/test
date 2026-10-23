/** Short-lived microphone reuse after permission has already been granted. */
export type MicrophoneProfile = "speech" | "breathing";

export const microphoneConstraints: MediaStreamConstraints = {
  audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
};

const breathingMicrophoneConstraints: MediaStreamConstraints = {
  audio: { channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: false },
};

function constraintsFor(profile: MicrophoneProfile): MediaStreamConstraints {
  return profile === "breathing" ? breathingMicrophoneConstraints : microphoneConstraints;
}

const IDLE_RELEASE_MS = 15_000;
let pooled: MediaStream | undefined;
let pooledProfile: MicrophoneProfile | undefined;
let warming: Promise<void> | undefined;
let warmingStreamRequest = false;
let warmingProfile: MicrophoneProfile | undefined;
let idleTimer = 0;
let generation = 0;

function live(stream: MediaStream | undefined): stream is MediaStream {
  return Boolean(stream?.getAudioTracks().some((track) => track.readyState === "live"));
}

function stop(stream: MediaStream) {
  stream.getTracks().forEach((track) => track.stop());
}

function takePooled(profile: MicrophoneProfile): MediaStream | undefined {
  if (!live(pooled)) { pooled = undefined; pooledProfile = undefined; return undefined; }
  if (pooledProfile !== profile) {
    stop(pooled);
    pooled = undefined;
    pooledProfile = undefined;
    return undefined;
  }
  const stream = pooled;
  pooled = undefined;
  pooledProfile = undefined;
  window.clearTimeout(idleTimer);
  stream.getAudioTracks().forEach((track) => { track.enabled = true; });
  return stream;
}

/** The returned stream has one owner; a second caller opens its own stream. */
export async function acquireMicrophone(profile: MicrophoneProfile = "speech"): Promise<MediaStream> {
  window.clearTimeout(idleTimer);
  const ready = takePooled(profile);
  if (ready) return ready;
  // 点击开始时不等待仅用于预热的权限查询；若设备请求已发出则复用它。
  if (warming && warmingStreamRequest && warmingProfile === profile) {
    await warming;
    const warmed = takePooled(profile);
    if (warmed) return warmed;
  }
  generation += 1;
  return navigator.mediaDevices.getUserMedia(constraintsFor(profile));
}

/** Keep a finished session briefly for an immediate retake or the next item. */
export function releaseMicrophone(stream: MediaStream, profile: MicrophoneProfile = "speech") {
  if (!live(stream)) return;
  if (pooled && pooled !== stream) stop(pooled);
  stream.getAudioTracks().forEach((track) => { track.enabled = false; });
  pooled = stream;
  pooledProfile = profile;
  window.clearTimeout(idleTimer);
  idleTimer = window.setTimeout(() => {
    if (pooled === stream) { stop(stream); pooled = undefined; pooledProfile = undefined; }
  }, IDLE_RELEASE_MS);
}

/** Never prompt for permission during prewarming. */
export function warmMicrophone(profile: MicrophoneProfile = "speech"): Promise<void> {
  if (live(pooled) && pooledProfile === profile) return Promise.resolve();
  if (warming) return warmingProfile === profile ? warming : warming.then(() => warmMicrophone(profile));
  const currentGeneration = generation;
  warmingProfile = profile;
  warming = (async () => {
    if (!navigator.mediaDevices?.getUserMedia || !navigator.permissions?.query) return;
    const permission = await navigator.permissions.query({ name: "microphone" as PermissionName });
    if (permission.state !== "granted" || currentGeneration !== generation) return;
    warmingStreamRequest = true;
    const stream = await navigator.mediaDevices.getUserMedia(constraintsFor(profile));
    if (currentGeneration !== generation) stop(stream);
    else releaseMicrophone(stream, profile);
  })().catch(() => undefined).finally(() => { warmingStreamRequest = false; warmingProfile = undefined; warming = undefined; });
  return warming;
}

export function shutdownMicrophone() {
  generation += 1;
  window.clearTimeout(idleTimer);
  if (pooled) { stop(pooled); pooled = undefined; pooledProfile = undefined; }
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", shutdownMicrophone);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") shutdownMicrophone();
  });
}
