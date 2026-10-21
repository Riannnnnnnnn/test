import { getCourseTasks, getCourseTaskImage } from "@/config/courseTasks";
import type { SiteContent } from "@/content/types";

const pending = new Map<string, Promise<boolean>>();

export function preloadImage(url?: string): Promise<boolean> {
  if (!url) return Promise.resolve(true);
  const existing = pending.get(url);
  if (existing) return existing;
  const image = new Image();
  image.decoding = "async";
  const loaded = new Promise<boolean>((resolve) => {
    image.onload = () => {
      void image.decode().then(() => resolve(true), () => resolve(true));
    };
    image.onerror = () => { pending.delete(url); resolve(false); };
    image.src = url;
  });
  pending.set(url, loaded);
  return loaded;
}

export function preloadImages(urls: Array<string | undefined>): Promise<boolean[]> {
  return Promise.all([...new Set(urls.filter((url): url is string => Boolean(url)))].map(preloadImage));
}

export function assessmentImageUrls(stage: string, moduleId: string, content: SiteContent, gender?: string): string[] {
  const module = content.modules[moduleId as keyof SiteContent["modules"]];
  const taskImages = getCourseTasks(stage, moduleId).map((task) => getCourseTaskImage({ ...task, ...content.taskOverrides?.[task.id] }, gender));
  const guideImages = moduleId === "A2"
    ? ["/assets/v2/star-mascot-guide-blowing-mic-natural.webp"]
    : moduleId === "A5" && stage !== "A"
      ? ["/assets/v2/star-mascot-guide-tiger.webp"]
      : ["/assets/v2/star-mascot-hero-assessment.webp"];
  return [...new Set([...taskImages, module?.imageUrl, ...guideImages].filter((url): url is string => Boolean(url)))];
}
