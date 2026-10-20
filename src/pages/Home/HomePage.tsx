import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui";
import { useSiteContent } from "@/content/useSiteContent";
import "@/styles/features.css";
import "@/styles/motion.css";

export function HomePage() {
  const navigate = useNavigate();
  const { content } = useSiteContent();
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));
  const [fullscreenError, setFullscreenError] = useState("");

  useEffect(() => {
    const syncFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);

  async function toggleFullscreen() {
    setFullscreenError("");
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      setFullscreenError("无法切换全屏，请检查浏览器是否允许全屏显示。");
    }
  }

  return (
    <div className="app-shell home-page">
      <PageContainer>
        <PageHeader actions={<Button variant="ghost" size="small" onClick={() => void toggleFullscreen()}>{isFullscreen ? "退出全屏" : "全屏"}</Button>} />
        {fullscreenError && <p role="alert">{fullscreenError}</p>}
        <main className="home-main"><section className="hero">
          <div className="hero__copy">
            <p className="eyebrow hero__eyebrow">{content.home.eyebrow}</p>
            <h1 className="display-title">{content.home.title}<br /><span>{content.home.accentTitle}</span></h1>
            <p className="lead">{content.home.description}</p>
            <div className="hero__actions">
              <Button onClick={() => navigate("/profile")}>开始新评测 <span aria-hidden="true">→</span></Button>
            </div>
          </div>
          <div className="hero__visual" aria-label="儿童口才能力评测 IP 角色">
            <div className="hero__visual-glow" aria-hidden="true" />
            <img className="hero__character hero__cover-image" src={content.home.coverImageUrl} alt={content.home.coverImageAlt} />
          </div>
        </section>
        <section className="home-flow" aria-label="评测流程">
          <article className="home-flow__item"><span className="home-flow__step">1</span><div><strong>填写信息</strong><p>完善孩子基础资料</p></div></article>
          <article className="home-flow__item"><span className="home-flow__step">2</span><div><strong>确认阶段</strong><p>根据年级推荐评测阶段</p></div></article>
          <article className="home-flow__item"><span className="home-flow__step">3</span><div><strong>开始评测</strong><p>按步骤完成表达任务</p></div></article>
        </section></main>
      </PageContainer>
    </div>
  );
}
