export const abilityDimensions = {
  pronunciationClarity: "语音清晰度",
  initialStrength: "字头有力",
  vowelFullness: "字腹饱满",
  finalClosure: "字尾收音",
  breathAndVoice: "气息与声音",
  sustainedPhonation: "持续发声",
  breathContinuity: "发声连贯",
  voiceStability: "声音稳定",
  comprehension: "理解能力",
  memoryRetelling: "记忆复述",
  observation: "观察能力",
  logicalOrganization: "逻辑组织",
  languageExpression: "语言表达",
  situationalResponse: "临场反应",
  performance: "表现力",
  contentGeneration: "内容生成",
  languageRichness: "语言丰富度",
  descriptionAccuracy: "描述准确度",
} as const;

export const stageAScoringWeights: Record<string, Record<string, number>> = {
  A1: { initialStrength: 0.33, vowelFullness: 0.34, finalClosure: 0.33 },
  A2: { sustainedPhonation: 0.4, breathContinuity: 0.35, voiceStability: 0.25 },
  A3: { logicalOrganization: 0.5, languageExpression: 0.3, observation: 0.2 },
  A4: { comprehension: 0.3, situationalResponse: 0.4, languageExpression: 0.3 },
  A5: { performance: 0.8, languageExpression: 0.2 },
};
