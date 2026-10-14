import { useContext } from "react";
import { ContentContext, type ContentContextValue } from "./context";

export function useSiteContent(): ContentContextValue {
  const value = useContext(ContentContext);
  if (!value) throw new Error("useSiteContent must be used inside ContentProvider");
  return value;
}
