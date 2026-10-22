import { useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { defaultSiteContent } from "./defaults";
import type { SiteContent } from "./types";
import { ContentContext, type ContentContextValue } from "./context";
import { getSiteContent, saveSiteContent } from "@/services/storage";
import { smallPronunciationTasks } from "@/config/courseTasks";

const previousDefaultWords: Record<string, string> = {
  "A1-b": "包子", "A1-p": "苹果", "A1-m": "帽子", "A1-d": "灯笼", "A1-t": "兔子",
  "A1-g": "公鸡", "A1-k": "恐龙", "A1-ch": "车子", "A1-sh": "狮子", "A1-s": "扫帚",
};

function migrateTaskOverride(id: string, override: NonNullable<SiteContent["taskOverrides"]>[string]) {
  const current = smallPronunciationTasks.find((task) => task.id === id);
  const oldWord = previousDefaultWords[id];
  const image = webpBuiltInImage(override.image);
  return {
    ...override,
    ...(oldWord && current && override.text === oldWord ? { text: current.text } : {}),
    ...(override.image !== undefined ? { image: id === "A1-p" && ["/assets/v2/questions/a1-apple.webp", "/assets/v2/questions/a1-apple-v3.webp"].includes(image ?? "") ? current?.image : image } : {}),
    ...(override.imageFemale !== undefined ? { imageFemale: webpBuiltInImage(override.imageFemale) } : {}),
  };
}

function cloneDefaults(): SiteContent {
  return structuredClone(defaultSiteContent);
}

function webpBuiltInImage(url?: string): string | undefined {
  return url?.replace(/^(\/assets\/.*)\.png$/i, "$1.webp")
    .replace(/^(\/assets\/v3\/emotions\/(?:boy|girl)-(?:happy|sad|shy|angry))\.webp$/i, "$1-half.webp");
}

function normalizeContent(saved: SiteContent): SiteContent {
  const defaults = cloneDefaults();
  const legacyCoverImages = ["/assets/v2/ip-character.webp", "/assets/v2/star-mascot-hero.webp", "/assets/v2/star-mascot-hero-half.webp", "/assets/v2/star-mascot-hero-ready.webp", "/assets/v2/star-mascot-hero-assessment.webp"];
  const savedCoverImageUrl = webpBuiltInImage(saved.home?.coverImageUrl);
  return {
    ...defaults,
    ...saved,
    taskOverrides: saved.taskOverrides && Object.fromEntries(Object.entries(saved.taskOverrides).map(([id, override]) => [id, migrateTaskOverride(id, override)])),
    brand: {
      ...defaults.brand,
      ...saved.brand,
      logoImageUrl: webpBuiltInImage(saved.brand?.logoImageUrl) || defaults.brand.logoImageUrl,
    },
    home: {
      ...defaults.home,
      ...saved.home,
      coverImageUrl: legacyCoverImages.includes(savedCoverImageUrl ?? "") ? defaults.home.coverImageUrl : savedCoverImageUrl || defaults.home.coverImageUrl,
      coverImageAlt: ["儿童口才能力评测 IP 角色", "挥手欢迎的 STARVOICE 星光 IP 角色", "正在进行口才测试的 STARVOICE 星光 IP 角色", "拿着麦克风准备开始评测的 STARVOICE 星光 IP 角色", "拿着星级评测板并点赞的 STARVOICE 星光 IP 角色"].includes(saved.home?.coverImageAlt ?? "") ? defaults.home.coverImageAlt : saved.home?.coverImageAlt || defaults.home.coverImageAlt,
    },
    stages: {
      A: { ...defaults.stages.A, ...saved.stages?.A, iconImageUrl: webpBuiltInImage(saved.stages?.A?.iconImageUrl) || defaults.stages.A.iconImageUrl, name: defaults.stages.A.name, tagline: defaults.stages.A.tagline },
      B: { ...defaults.stages.B, ...saved.stages?.B, iconImageUrl: webpBuiltInImage(saved.stages?.B?.iconImageUrl) || defaults.stages.B.iconImageUrl, name: defaults.stages.B.name, tagline: defaults.stages.B.tagline },
      C: { ...defaults.stages.C, ...saved.stages?.C, iconImageUrl: webpBuiltInImage(saved.stages?.C?.iconImageUrl) || defaults.stages.C.iconImageUrl },
    },
    modules: Object.fromEntries(Object.entries(defaults.modules).map(([id, module]) => {
      const customized = saved.modules?.[id as keyof SiteContent["modules"]];
      const merged = { ...module, ...customized, imageUrl: webpBuiltInImage(customized?.imageUrl) ?? module.imageUrl };
      const legacyDefaultImageUrls: Partial<Record<keyof SiteContent["modules"], string[]>> = {
        A1: ["/assets/v2/questions/a1-apple.webp", "/assets/v2/questions/a1-apple-v3.webp"],
        A2: ["/assets/v2/questions/a2-train.webp", "/assets/v2/questions/a2-train-v2.webp"],
        A4: ["/assets/v2/questions/a4-new-friend.webp", "/assets/v2/questions/a4-new-friend-v2.webp"],
        A5: ["/assets/v2/questions/a5-tiger.webp", "/assets/v2/questions/a5-tiger-v3.webp", ...["boy", "girl"].flatMap((person) => ["happy", "sad", "shy", "angry"].map((mood) => `/assets/v3/emotions/${person}-${mood}.webp`))],
      };
      const legacyDefaultImageUrl = legacyDefaultImageUrls[id as keyof SiteContent["modules"]];
      if (!customized?.imageUrl || legacyDefaultImageUrl?.includes(merged.imageUrl)) merged.imageUrl = module.imageUrl;
      if (id === "A1") {
        if (customized?.visualText === "苹果") merged.visualText = module.visualText;
        if (customized?.imageAlt === "卡通苹果") merged.imageAlt = module.imageAlt;
      }
      if (id === "A3" && customized?.prompt === "先把三张图片排好顺序，再用“先、然后、最后”把故事讲出来。") merged.prompt = module.prompt;
      if (id === "A3" && customized?.teacherNote === "拖动图片或使用箭头调整顺序，排好后开始讲述。") merged.teacherNote = "";
      if (id === "A4" && customized?.teacherNote === "孩子理解场景后直接回答，不提供标准答案。") merged.teacherNote = "";
      if (id === "A5" && customized?.teacherNote === "请老师重点观察孩子是否愿意大胆表现，完成后填写老师评分。") merged.teacherNote = "";
      if (id === "A5") {
        const oldDefaults: Partial<SiteContent["modules"]["A5"]> = {
          menuTitle: "小动物模仿表现", summary: "用声音、动作和表情表现", eyebrow: "A5 · 小动物模仿表现",
          title: "神气的小老虎", prompt: "请用声音、动作和表情，模仿一只神气的小老虎。",
          imageAlt: "披着斗篷的神气卡通小老虎", visualText: "小老虎",
        };
        for (const key of Object.keys(oldDefaults) as Array<keyof typeof oldDefaults>) {
          if (key !== "sequenceItems" && merged[key] === oldDefaults[key]) merged[key] = module[key];
        }
      }
      if (module.sequenceItems) merged.sequenceItems = module.sequenceItems.map((item, index) => {
        const customizedItem = customized?.sequenceItems?.[index];
        const legacyDefaultSequenceImageUrls = [
          "/assets/v2/questions/a3-seed.webp",
          "/assets/v2/questions/a3-water.webp",
          "/assets/v2/questions/a3-flower.webp",
        ];
        const imageUrl = webpBuiltInImage(customizedItem?.imageUrl);
        const useDefaultImage = !imageUrl || imageUrl === legacyDefaultSequenceImageUrls[index];
        return { ...item, ...customizedItem, imageUrl: useDefaultImage ? item.imageUrl : imageUrl };
      });
      return [id, merged];
    })) as SiteContent["modules"],
  };
}

export function ContentProvider({ children }: PropsWithChildren) {
  const [content, setContent] = useState<SiteContent>(cloneDefaults);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getSiteContent().then((saved) => {
      if (saved) setContent(normalizeContent(saved));
      setReady(true);
    });
  }, []);

  const value = useMemo<ContentContextValue>(() => ({
    content,
    ready,
    replaceContent: async (next) => { await saveSiteContent(next); setContent(next); },
    resetContent: async () => { const next = cloneDefaults(); await saveSiteContent(next); setContent(next); },
  }), [content, ready]);

  if (!ready) return <div className="app-shell"><p className="loading-state">正在加载页面内容…</p></div>;
  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}
