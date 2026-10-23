import { Component, lazy, Suspense, useEffect, useRef, type ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { PageContainer } from "@/components/layout";
import { Button, Card } from "@/components/ui";
import { AssessmentPage } from "@/pages/Assessment/AssessmentPage";
import { HomePage } from "@/pages/Home/HomePage";
import { NotFoundPage } from "@/pages/NotFound/NotFoundPage";
import { StageIntroPage } from "@/pages/StageIntro/StageIntroPage";
import { StudentProfilePage } from "@/pages/StudentProfile/StudentProfilePage";
import { ContentAdminPage } from "@/pages/Admin/ContentAdminPage";


const ReportPage = lazy(() => import("@/pages/Report/ReportPage").then((module) => ({ default: module.ReportPage })));

class RouteErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean; message: string }> {
  state = { failed: false, message: "" };

  static getDerivedStateFromError(error: Error) { return { failed: true, message: error.message }; }

  render() {
    if (!this.state.failed) return this.props.children;
    return <div className="app-shell"><PageContainer><Card>
      <h1>页面暂时没能打开</h1>
      <p>评测记录已自动保存。请重新加载页面，再继续当前项目。</p>
      <p role="alert">错误详情：{this.state.message || "未知错误"}</p>
      <Button onClick={() => window.location.reload()}>重新加载</Button>
      <Button variant="secondary" onClick={() => window.location.assign("/")}>返回首页</Button>
    </Card></PageContainer></div>;
  }
}

function AnimatedRoutes() {
  const location = useLocation();
  const previousPath = useRef(location.pathname);
  const routePosition = (path: string) => {
    const moduleId = path.match(/\/assessment\/[^/]+\/([A-Z]\d+)/)?.[1];
    if (moduleId) return 30 + Number(moduleId.slice(1));
    if (path === "/") return 0;
    if (path === "/profile") return 10;
    if (path.includes("/intro")) return 20;
    if (path.startsWith("/report/")) return 50;
    return 0;
  };
  const direction = routePosition(location.pathname) < routePosition(previousPath.current) ? "back" : "forward";
  useEffect(() => { previousPath.current = location.pathname; }, [location.pathname]);
  return <div className={`route-transition route-transition--${direction}`} key={location.pathname}><RouteErrorBoundary><Suspense fallback={<div className="app-shell"><p className="loading-state">正在加载页面…</p></div>}><Routes location={location}><Route path="/" element={<HomePage />} /><Route path="/v3" element={<Navigate to="/" replace />} /><Route path="/profile" element={<StudentProfilePage />} /><Route path="/stage/:stage/intro" element={<StageIntroPage />} /><Route path="/assessment/:sessionId/:moduleId" element={<AssessmentPage />} /><Route path="/report/:sessionId" element={<ReportPage />} /><Route path="/admin/content" element={<ContentAdminPage />} /><Route path="*" element={<NotFoundPage />} /></Routes></Suspense></RouteErrorBoundary></div>;
}

export function AppRouter() {
  return <BrowserRouter><AnimatedRoutes /></BrowserRouter>;
}
