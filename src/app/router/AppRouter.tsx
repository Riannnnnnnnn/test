import { lazy, Suspense, useEffect, useRef } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { AssessmentPage } from "@/pages/Assessment/AssessmentPage";
import { HomePage } from "@/pages/Home/HomePage";
import { NotFoundPage } from "@/pages/NotFound/NotFoundPage";
import { StageIntroPage } from "@/pages/StageIntro/StageIntroPage";
import { StudentProfilePage } from "@/pages/StudentProfile/StudentProfilePage";
import { ContentAdminPage } from "@/pages/Admin/ContentAdminPage";

const ReportPage = lazy(() => import("@/pages/Report/ReportPage").then((module) => ({ default: module.ReportPage })));

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
  return <div className={`route-transition route-transition--${direction}`} key={location.pathname}><Suspense fallback={<div className="app-shell"><p className="loading-state">正在加载页面…</p></div>}><Routes location={location}><Route path="/" element={<HomePage />} /><Route path="/profile" element={<StudentProfilePage />} /><Route path="/stage/:stage/intro" element={<StageIntroPage />} /><Route path="/assessment/:sessionId/:moduleId" element={<AssessmentPage />} /><Route path="/report/:sessionId" element={<ReportPage />} /><Route path="/admin/content" element={<ContentAdminPage />} /><Route path="*" element={<NotFoundPage />} /></Routes></Suspense></div>;
}

export function AppRouter() {
  return <BrowserRouter><AnimatedRoutes /></BrowserRouter>;
}
