import { useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { defaultSiteContent } from "./defaults";
import type { SiteContent } from "./types";
import { ContentContext, type ContentContextValue } from "./context";
import { getSiteContent, saveSiteContent } from "@/services/storage";

function cloneDefaults(): SiteContent {
  return structuredClone(defaultSiteContent);
}

function normalizeContent(saved: SiteContent): SiteContent {
  const defaults = cloneDefaults();
  const legacyCoverImages = ["/assets/v2/ip-character.png", "/assets/v2/star-mascot-hero.png", "/assets/v2/star-mascot-hero-half.png", "/assets/v2/star-mascot-hero-ready.png", "/assets/v2/star-mascot-hero-assessment.png"];
  const savedCoverImageUrl = legacyCoverImages.includes(saved.home?.coverImageUrl ?? "") ? defaults.home.coverImageUrl : saved.home?.coverImageUrl;
  return {
    ...defaults,
    ...saved,
    brand: {
      ...defaults.brand,
      ...saved.brand,
      logoImageUrl: saved.brand?.logoImageUrl || defaults.brand.logoImageUrl,
    },
    home: {
      ...defaults.home,
      ...saved.home,
      coverImageUrl: savedCoverImageUrl || defaults.home.coverImageUrl,
      coverImageAlt: ["儿童口才能力评测 IP 角色", "挥手欢迎的 STARVOICE 星光 IP 角色", "正在进行口才测试的 STARVOICE 星光 IP 角色", "拿着麦克风准备开始评测的 STARVOICE 星光 IP 角色", "拿着星级评测板并点赞的 STARVOICE 星光 IP 角色"].includes(saved.home?.coverImageAlt ?? "") ? defaults.home.coverImageAlt : saved.home?.coverImageAlt || defaults.home.coverImageAlt,
    },
    stages: {
      A: { ...defaults.stages.A, ...saved.stages?.A },
      B: { ...defaults.stages.B, ...saved.stages?.B },
      C: { ...defaults.stages.C, ...saved.stages?.C },
    },
    modules: Object.fromEntries(Object.entries(defaults.modules).map(([id, module]) => {
      const customized = saved.modules?.[id as keyof SiteContent["modules"]];
      const merged = { ...module, ...customized };
      const legacyDefaultImageUrls: Partial<Record<keyof SiteContent["modules"], string[]>> = {
        A1: ["/assets/v2/questions/a1-apple.png"],
        A2: ["/assets/v2/questions/a2-train.png", "/assets/v2/questions/a2-train-v2.png"],
        A4: ["/assets/v2/questions/a4-new-friend.png", "/assets/v2/questions/a4-new-friend-v2.png"],
        A5: ["/assets/v2/questions/a5-tiger.png"],
      };
      const legacyDefaultImageUrl = legacyDefaultImageUrls[id as keyof SiteContent["modules"]];
      if (!customized?.imageUrl || legacyDefaultImageUrl?.includes(customized.imageUrl)) merged.imageUrl = module.imageUrl;
      if (id === "A3" && customized?.prompt === "先把三张图片排好顺序，再用“先、然后、最后”把故事讲出来。") merged.prompt = module.prompt;
      if (id === "A3" && customized?.teacherNote === "拖动图片或使用箭头调整顺序，排好后开始讲述。") merged.teacherNote = "";
      if (id === "A4" && customized?.teacherNote === "孩子理解场景后直接回答，不提供标准答案。") merged.teacherNote = "";
      if (id === "A5" && customized?.teacherNote === "请老师重点观察孩子是否愿意大胆表现，完成后填写老师评分。") merged.teacherNote = "";
      if (module.sequenceItems) merged.sequenceItems = module.sequenceItems.map((item, index) => {
        const customizedItem = customized?.sequenceItems?.[index];
        const legacyDefaultSequenceImageUrls = [
          "/assets/v2/questions/a3-seed.png",
          "/assets/v2/questions/a3-water.png",
          "/assets/v2/questions/a3-flower.png",
        ];
        const useDefaultImage = !customizedItem?.imageUrl || customizedItem.imageUrl === legacyDefaultSequenceImageUrls[index];
        return { ...item, ...customizedItem, imageUrl: useDefaultImage ? item.imageUrl : customizedItem.imageUrl };
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
