import { createContext } from "react";
import type { SiteContent } from "./types";

export interface ContentContextValue {
  content: SiteContent;
  ready: boolean;
  replaceContent: (content: SiteContent) => Promise<void>;
  resetContent: () => Promise<void>;
}

export const ContentContext = createContext<ContentContextValue | null>(null);
