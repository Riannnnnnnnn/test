import { useFullscreen } from "@/components/layout/useFullscreen";
import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { AssessmentFooter } from "@/assessment/common/AssessmentFooter/AssessmentFooter";
import { AssessmentHeader } from "@/assessment/common/AssessmentHeader/AssessmentHeader";
import { TeacherScoringDialog } from "@/assessment/common/TeacherScoringDialog/TeacherScoringDialog";
import { assessmentModuleRegistry } from "@/assessment/registry";
import { PageContainer, PageHeader } from "@/components/layout";
import { Button, Card } from "@/components/ui";
import { stageConfigs } from "@/config/stages";
import { moduleDefinitions } from "@/config/modules";
import { getStageAQuestion } from "@/data/questionBank";
import type { AudioRecording } from "@/services/audio";
import { averageScoreRecords, mergeFinalScores } from "@/services/scoring";
import { getCourseTasks, getCourseTaskImage } from "@/config/courseTasks";
import { isExpressionReviewed } from "@/config/expressionReviews";
import { forestReviewsComplete } from "@/config/forestBroadcastReviews";
import type { AssessmentResult } from "@/types";
import { getSession, getStudent, saveAudio, saveSession } from "@/services/storage";
import { useAssessmentStore } from "@/stores/assessmentStore";
import { useSiteContent } from "@/content/useSiteContent";
import { AssessmentGuide } from "@/assessment/common/AssessmentGuide/AssessmentGuide";
import "@/styles/course-assessment.css";
import "@/styles/pro-assessment.css";
import "@/styles/motion.css";
import "@/styles/expression.css";
import { upgradeSession } from "@/services/storage/upgradeSession";
import { assessmentImageUrls, preloadImage, preloadImages } from "@/services/assets/preloadImages";

export function AssessmentPage() {
  const { sessionId = "", moduleId = "" } = useParams();
  const navigate = useNavigate();
  const session = useAssessmentStore((state) => state.session);
  const student = useAssessmentStore((state) => state.student);
  const setSession = useAssessmentStore((state) => state.setSession);
  const setStudent = useAssessmentStore((state) => state.setStudent);
  const [loading, setLoading] = useState(session?.id !== sessionId);
  const [scoringOpen, setScoringOpen] = useState(false);
  const [attemptRevision, setAttemptRevision] = useState(0);
  const [manualGuide, setManualGuide] = useState(false);
  const [imageError, setImageError] = useState("");
  const { toggleFullscreen, focusMode, fullscreenLabel, fullscreenMessage } = useFullscreen();
  const { content } = useSiteContent();
  const assessmentStage = session?.stage;
  const assessmentVersion = session?.courseVersion;

  useEffect(() => {
    if (session?.id === sessionId) { const upgraded = upgradeSession(session); if (upgraded !== session) { setSession(upgraded); void saveSession(upgraded); } setLoading(false); return; }
    getSession(sessionId).then(async (found) => {
      if (found) {
        const upgraded = upgradeSession(found);
        setSession(upgraded);
        if (upgraded !== found) await saveSession(upgraded);
        if (student?.id !== found.studentId) { const owner = await getStudent(found.studentId); if (owner) setStudent(owner); }
      }
      setLoading(false);
    });
  }, [session, sessionId, setSession, setStudent, student]);

  useEffect(() => {
    if (!assessmentStage) return;
    const ids = assessmentVersion === 3 ? stageConfigs[assessmentStage].moduleIds : [moduleId];
    const current = Math.max(0, ids.indexOf(moduleId));
    void preloadImages(ids.slice(current, current + 2).flatMap((id) => assessmentImageUrls(assessmentStage, id, content, student?.gender)));
  }, [assessmentVersion, assessmentStage, moduleId, content, student?.gender]);


  if (loading) return <div className="app-shell"><PageContainer><p className="loading-state">正在恢复评测进度…</p></PageContainer></div>;
  if (!session || session.id !== sessionId) return <div className="app-shell"><PageContainer><Card><h1>评测记录不存在</h1><Button onClick={() => navigate("/profile")}>开始新评测</Button></Card></PageContainer></div>;

  const activeSession = session;
  const modules = activeSession.courseVersion === 3 ? stageConfigs[activeSession.stage].moduleIds : activeSession.results.map((result) => result.moduleId);
  const index = Math.max(0, modules.indexOf(moduleId));
  if (!modules.includes(moduleId)) return <Navigate to={`/assessment/${activeSession.id}/${modules[0]}`} replace />;
  const ActiveModule = assessmentModuleRegistry[moduleId];
  const activeResult = activeSession.results.find((result) => result.moduleId === moduleId) ?? { moduleId, questionId: `${moduleId}-001`, status: "not_started" as const };
  const question = getStageAQuestion(moduleId);
  const tasks = activeSession.courseVersion === 3 ? getCourseTasks(activeSession.stage, moduleId) : [];
  const expressionReview = moduleId === "A5" && activeSession.stage === "A" && tasks.length > 0;
  const expressionsReady = tasks.every((task) => isExpressionReviewed(activeResult.items?.[task.id]));
  const selectedTask = tasks.find((task) => task.id === activeResult.activeItemId) ?? tasks[0];
  const forestReview = moduleId === "A5" && activeSession.stage === "B" && Boolean(selectedTask);
  const forestReady = forestReviewsComplete(activeResult.items?.[selectedTask?.id ?? ""]);
  const displayResult: AssessmentResult = selectedTask
    ? activeResult.items?.[selectedTask.id] ?? { moduleId, questionId: selectedTask.id, status: "not_started" }
    : activeResult;
  const guideOpen = manualGuide || !activeSession.tutorialSeen?.includes(moduleId);

  async function dismissGuide() {
    setManualGuide(false);
    const latest = useAssessmentStore.getState().session;
    if (!latest || latest.id !== activeSession.id) return;
    const updated = { ...latest, tutorialSeen: [...new Set([...(latest.tutorialSeen ?? []), moduleId])] };
    setSession(updated);
    await saveSession(updated);
  }

  async function selectItem(id: string) {
    if (expressionReview) {
      const currentItems = useAssessmentStore.getState().session?.results.find((entry) => entry.moduleId === moduleId)?.items;
      const pending = tasks.find((task) => !isExpressionReviewed(currentItems?.[task.id]));
      if (id !== pending?.id && !isExpressionReviewed(currentItems?.[id])) return;
    }
    const target = tasks.find((task) => task.id === id);
    if (!target) return;
    if (!(await preloadImage(getCourseTaskImage({ ...target, ...content.taskOverrides?.[target.id] }, student?.gender)))) {
      setImageError("图片暂时没有加载好，请检查网络后再点一次。");
      return;
    }
    setImageError("");
    const latest = useAssessmentStore.getState().session;
    if (!latest || latest.id !== activeSession.id) return;
    const updated = { ...latest, results: latest.results.map((result) => result.moduleId === moduleId ? { ...result, activeItemId: id } : result) };
    setSession(updated);
    await saveSession(updated);
  }

  async function updateResult(patch: Partial<typeof activeResult>) {
    const latest = useAssessmentStore.getState().session;
    const baseSession = latest?.id === activeSession.id ? latest : activeSession;
    const updated = { ...baseSession, results: baseSession.results.map((result) => {
      if (result.moduleId !== moduleId) return result;
      if (selectedTask) {
        const previous = result.items?.[selectedTask.id] ?? { moduleId, questionId: selectedTask.id, status: "not_started" as const };
        const item = { ...previous, ...patch };
        item.finalScores = mergeFinalScores(item.autoScores, item.teacherScores);
        const items = { ...result.items, [selectedTask.id]: item };
        const values = Object.values(items);
        const autoScores = averageScoreRecords(values.map((value) => value.autoScores));
        const teacherScores = forestReview ? averageScoreRecords(values.map((value) => value.teacherScores)) : result.teacherScores ?? averageScoreRecords(values.map((value) => value.teacherScores));
        return { ...result, items, status: "running" as const,
          autoScores, teacherScores, finalScores: mergeFinalScores(autoScores, teacherScores) };
      }
      const merged = { ...result, ...patch };
      if ("autoScores" in patch || "teacherScores" in patch) merged.finalScores = mergeFinalScores(merged.autoScores, merged.teacherScores);
      return merged;
    }) };
    await saveSession(updated);
    setSession(updated);
  }

  async function handleRecorded(recording: AudioRecording) {
    const audioId = `audio_${activeSession.id}_${moduleId}_${Date.now()}`;
    await saveAudio(audioId, recording.blob);
    await updateResult({ audioFile: audioId, duration: Number((recording.duration / 1000).toFixed(1)), status: "running", startTime: activeResult.startTime ?? new Date().toISOString() });
  }

  async function saveTeacherScores(teacherScores: Record<string, number>) {
    if (!selectedTask) { await updateResult({ teacherScores }); return; }
    const latest = useAssessmentStore.getState().session;
    if (!latest || latest.id !== activeSession.id) return;
    const updated = { ...latest, results: latest.results.map((result) => result.moduleId === moduleId
      ? { ...result, teacherScores, finalScores: mergeFinalScores(result.autoScores, teacherScores) }
      : result) };
    setSession(updated);
    await saveSession(updated);
  }

  async function retry() {
    try {
      await updateResult({ status: "not_started", startTime: undefined, endTime: undefined, duration: undefined, audioFile: undefined, transcript: undefined, rawResult: undefined, autoScores: undefined, ...(selectedTask ? { teacherScores: undefined } : {}), finalScores: undefined });
      // 先清除已保存进度，再重建组件，避免用上一轮第 4 句初始化新一轮。
      setAttemptRevision((value) => value + 1);
    } catch { setImageError("重测暂未开始，请再试一次。"); }
  }

  async function finishAndGo(status: "completed" | "skipped" = "completed") {
    if (expressionReview && !tasks.every((task) => isExpressionReviewed(useAssessmentStore.getState().session?.results.find((entry) => entry.moduleId === moduleId)?.items?.[task.id]))) return;
    if (forestReview && !forestReviewsComplete(useAssessmentStore.getState().session?.results.find((entry) => entry.moduleId === moduleId)?.items?.[selectedTask?.id ?? ""])) return;
    const isLastModule = index === modules.length - 1;
    const completedAt = new Date().toISOString();
    const latest = useAssessmentStore.getState().session;
    const baseSession = latest?.id === activeSession.id ? latest : activeSession;
    const updated = {
      ...baseSession,
      status: isLastModule ? "completed" as const : baseSession.status,
      endTime: isLastModule ? completedAt : baseSession.endTime,
      results: baseSession.results.map((result) => result.moduleId === moduleId ? { ...result, status, endTime: completedAt } : result),
    };
    await saveSession(updated);
    setSession(updated);
    if (isLastModule) navigate(`/report/${activeSession.id}`);
    else navigate(`/assessment/${activeSession.id}/${modules[index + 1]}`);
  }

  return (
    <div className={`app-shell assessment-page ${focusMode ? "is-focus-mode" : ""} ${activeSession.courseVersion === 3 ? "assessment-page--guided" : ""}`}>
      <PageContainer>
        <PageHeader actions={<><Button variant="ghost" size="small" onClick={() => void toggleFullscreen()}>{fullscreenLabel}</Button><Button variant="ghost" size="small" onClick={() => { setScoringOpen(false); setManualGuide(true); }}>评测说明</Button><Button variant="ghost" size="small" onClick={() => navigate("/")}>保存并退出</Button></>} />
        {fullscreenMessage && <p className="assessment-image-error" role="status">{fullscreenMessage}</p>}
        <div className="assessment-layout">
          <AssessmentHeader studentName={student?.name ?? "学生"} stage={activeSession.stage} moduleId={moduleId} current={index + 1} total={modules.length} />
          <section className="assessment-stage">{ActiveModule ? <ActiveModule studentGrade={student?.grade} studentGender={student?.gender} key={`${moduleId}-${moduleId === "A5" ? "expressions" : selectedTask?.id ?? "legacy"}-${attemptRevision}`} stage={activeSession.courseVersion === 3 ? activeSession.stage : undefined} items={activeResult.items} onSelectItem={selectItem} result={displayResult} onResultChange={updateResult} onRecorded={handleRecorded} /> : <Card><h2>模块准备中</h2><p>该模块已完成配置，交互将在后续阶段开放。</p></Card>}</section>
          {imageError && <p className="assessment-image-error" role="alert">{imageError}</p>}
<AssessmentFooter reviewOnly={expressionReview || forestReview} retryOnly={forestReview} nextDisabled={expressionReview && !expressionsReady || forestReview && !forestReady} canGoBack={index > 0} isLast={index === modules.length - 1} hasEvaluation={Boolean(activeResult.teacherScores && Object.keys(activeResult.teacherScores).length)} intelligentScore={moduleId === "A2" ? displayResult.autoScores?.breathAndVoice : displayResult.autoScores?.pronunciationClarity} showIntelligentRating={false} onBack={() => navigate(`/assessment/${activeSession.id}/${modules[index - 1]}`)} onNext={() => finishAndGo()} onRetry={retry} onSkip={() => finishAndGo("skipped")} onScore={() => setScoringOpen(true)} />
        </div>
      </PageContainer>
      {guideOpen && <AssessmentGuide key={`${sessionId}-${moduleId}`} moduleId={moduleId} large={activeSession.stage !== "A"} onDismiss={() => void dismissGuide()} />}
      <TeacherScoringDialog open={scoringOpen} moduleTitle={(moduleId in content.modules ? content.modules[moduleId as keyof typeof content.modules].menuTitle : undefined) ?? moduleDefinitions[moduleId]?.title ?? "评测项目"} dimensions={question?.scoringDimensions ?? []} initialScores={activeResult.teacherScores} onClose={() => setScoringOpen(false)} onSave={saveTeacherScores} />
    </div>
  );
}
