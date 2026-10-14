import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useSiteContent } from "@/content/useSiteContent";

interface PageHeaderProps { actions?: ReactNode; }

export function PageHeader({ actions }: PageHeaderProps) {
  const { content } = useSiteContent();
  return (
    <header className="page-header">
      <Link to="/" className="brand" aria-label="返回首页">
        {content.brand.logoImageUrl ? <img className="brand-logo" src={content.brand.logoImageUrl} alt={content.brand.logoImageAlt} /> : <span className="brand-mark">{content.brand.mark}</span>}
      </Link>
      <div className="page-header__actions">{actions}</div>
    </header>
  );
}
