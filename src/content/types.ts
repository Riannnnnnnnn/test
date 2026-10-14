export type StageAModuleId = "A1" | "A2" | "A3" | "A4" | "A5";

export interface SequenceItemContent {
  key: "seed" | "water" | "flower";
  connector: string;
  title: string;
  symbol: string;
  imageUrl: string;
}

export interface ModuleContent {
  menuTitle: string;
  summary: string;
  eyebrow: string;
  title: string;
  prompt: string;
  teacherNote: string;
  imageUrl: string;
  imageAlt: string;
  visualText: string;
  secondaryText: string;
  sequenceItems?: SequenceItemContent[];
}

export interface SiteContent {
  brand: { mark: string; name: string; logoImageUrl: string; logoImageAlt: string };
  home: {
    eyebrow: string;
    title: string;
    accentTitle: string;
    description: string;
    coverImageUrl: string;
    coverImageAlt: string;
  };
  stages: Record<"A" | "B" | "C", { name: string; tagline: string; iconImageUrl: string; iconImageAlt: string }>;
  modules: Record<StageAModuleId, ModuleContent>;
}
