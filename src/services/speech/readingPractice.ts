import type { XfyunIseResult } from "./xfyunIse";

function practiceStep(referenceText: string): string {
  return /[，,。！？]/u.test(referenceText) || Array.from(referenceText).length > 6
    ? "先分成两小段慢慢读，再连起来读完整句话。"
    : "先一个字一个字慢慢读，再连起来读整个词语。";
}

/** 面向孩子的练习建议；评测线索不可靠时不推断具体错音。 */
export function getReadingPracticeAdvice(referenceText: string, evidence: XfyunIseResult, questionId?: string): string {
  const text = referenceText.trim();
  const validCharacters = (kind: string) => [...new Set((evidence.issues ?? [])
    .filter((issue) => issue.kind.includes(kind) && /^[\u3400-\u9fff]$/u.test(issue.text) && text.includes(issue.text))
    .map((issue) => issue.text))].slice(0, 2);
  const soundCharacters = validCharacters("声韵");
  const toneCharacters = validCharacters("声调");
  const marked = [...new Set([...soundCharacters, ...toneCharacters])];
  const quote = (characters: string[]) => characters.map((character) => `“${character}”`).join("、");
  const initial = /^A1-(b|p|m|f|d|t|n|l|g|k|h|j|q|x|zh|ch|sh|r|z|c|s|y|w)$/.exec(questionId ?? "")?.[1];
  const hasAudioProblem = evidence.reviewReasons?.some((reason) => /音量|噪声|截幅|音频输入|拒评|连接|超时/.test(reason));

  if (hasAudioProblem || evidence.contentStatus === "uncertain") {
    return `找一个安静的地方，靠近麦克风，把“${text}”清楚地读一遍。${practiceStep(text)}`;
  }

  if (marked.length) {
    const parts: string[] = [];
    if (soundCharacters.length) {
      const firstIsTarget = initial && soundCharacters.length === 1 && text.startsWith(soundCharacters[0]);
      parts.push(`重点练${quote(soundCharacters)}的${firstIsTarget ? `声母 ${initial} 和韵母` : "声母、韵母"}`);
    }
    if (toneCharacters.length) parts.push(`留意${quote(toneCharacters)}的声调`);
    return `${parts.join("，")}。${practiceStep(text)}`;
  }

  const hasReadingMarker = evidence.issues?.some((issue) => ["漏读", "增读", "回读", "替换"].includes(issue.kind));
  if (hasReadingMarker || evidence.contentStatus === "mismatch") {
    return `指着“${text}”慢慢读，留意每个字都读完整。${practiceStep(text)}`;
  }
  return `再练习“${text}”：${practiceStep(text)}留意每个字的声母、韵母和声调。`;
}
