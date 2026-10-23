/** 音量显示与发声判定共用同一刻度；三格及以下的环境声不计入发声。 */
export function breathDisplayLevel(volume: number) {
  return Math.max(0, Math.min(1, Math.log10(Math.max(volume, 0.01) / 0.01) / Math.log10(50)));
}
export const breathSegments = (volume: number) => Math.round(breathDisplayLevel(volume) * 10);
export const isBreathVoiced = (volume: number, continuing: boolean) => {
  void continuing;
  return breathSegments(volume) >= 4;
};
