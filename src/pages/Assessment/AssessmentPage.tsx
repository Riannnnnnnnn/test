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
import { getCourseTasks } from "@/config/courseTasks";
import type { AssessmentResult } from "@/types";
import { getSession, getStudent, saveAudio, saveSession } from "@/services/storage";
import { useAssessmentStore } from "@/stores/assessmentStore";
import { useSiteContent } from "@/content/useSiteContent";
import { AssessmentGuide } from "@/assessment/common/AssessmentGuide/AssessmentGuide";
import "@/styles/course-assessment.css";
import { upgradeSession } from "@/services/storage/upgradeSession";

export function AssessmentPage() {
  const { sessionId = "", moduleId = "" } = useParams();
  const navigate = useNavigate();
  const session = useAssessmentStore((state) => state.session);
  const student = useAssessmentStore((state) => state.student);
  const setSession = useAssessmentStore((state) => state.setSession);
  const setStudent = useAssessmentStore((state) => state.setStudent);
  const [loading, setLoading] = useState(!session);
  const [scoringOpen, setScoringOpen] = useState(false);
  const [attemptRevision, setAttemptRevision] = useState(0);
  const [manualGuide, setManualGuide] = useState(false);
  const { content } = useSiteContent();

  useEffect(() => {
    if (session?.id === sessionId) { const upgraded = upgradeSession(session); if (upgraded !== session) { setSession(upgraded); void saveSession(upgraded); } setLoading(false); return; }
    getSession(sessionId).then(async (found) => {
      if (found) {
        const upgraded = upgradeSession(found);
        setSession(upgraded);
        if (upgraded !== found) await saveSession(upgraded);
        if (!student) { const owner = await getStudent(found.studentId); if (owner) setStudent(owner); }
      }
      setLoading(false);
    });
  }, [session, sessionId, setSession, setStudent, student]);

  if (loading) return <div className="app-shell"><PageContainer><p className="loading-state">正在恢复评测进度…</p></PageContainer></div>;
  if (!session) return <div className="app-shell"><PageContainer><Card><h1>评测记录不存在</h1><Button onClick={() => navigate("/profile")}>开始新评测</Button></Card></PageContainer></div>;

  const activeSession = session;
  const modules = activeSession.courseVersion === 3 ? stageConfigs[activeSession.stage].moduleIds : activeSession.results.map((result) => result.moduleId);
  const index = Math.max(0, modules.indexOf(moduleId));
  if (!modules.includes(moduleId)) return <Navigate to={`/assessment/${activeSession.id}/${modules[0]}`} replace />;
  const ActiveModule = assessmentModuleRegistry[moduleId];
  const activeResult = activeSession.results.find((result) => result.moduleId === moduleId) ?? { moduleId, questionId: `${moduleId}-001`, status: "not_started" as const };
  const question = getStageAQuestion(moduleId);
  const tasks = activeSession.courseVersion === 3 ? getCourseTasks(activeSession.stage, moduleId) : [];
  const selectedTask = tasks.find((task) => task.id === activeResult.activeItemId) ?? tasks[0];
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
    if (!tasks.some((task) => task.id === id)) return;
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
        return { ...result, items, status: "running" as const,
          autoScores: averageScoreRecords(values.map((value) => value.autoScores)),
          teacherScores: averageScoreRecords(values.map((value) => value.teacherScores)),
          finalScores: averageScoreRecords(values.map((value) => value.finalScores)) };
      }
      const merged = { ...result, ...patch };
      if ("autoScores" in patch || "teacherScores" in patch) merged.finalScores = mergeFinalScores(merged.autoScores, merged.teacherScores);
      return merged;
    }) };
    setSession(updated);
    await saveSession(updated);
  }

  async function handleRecorded(recording: AudioRecording) {
    const audioId = `audio_${activeSession.id}_${moduleId}_${Date.now()}`;
    await saveAudio(audioId, recording.blob);
    await updateResult({ audioFile: audioId, duration: Number((recording.duration / 1000).toFixed(1)), status: "running", startTime: activeResult.startTime ?? new Date().toISOString() });
  }

  async function saveTeacherScores(teacherScores: Record<string, number>) {
    await updateResult({ teacherScores });
  }

  async function retry() { setAttemptRevision((value) => value + 1); await updateResult({ status: "not_started", startTime: undefined, endTime: undefined, duration: undefined, audioFile: undefined, transcript: undefined, rawResult: undefined, autoScores: undefined, teacherScores: undefined, finalScores: undefined }); }

  async function finishAndGo(status: "completed" | "skipped" = "completed") {
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
    <div className={`app-shell assessment-page ${activeSession.courseVersion === 3 ? "assessment-page--guided" : ""}`}>
      <PageContainer>
        <PageHeader actions={<><Button variant="ghost" size="small" onClick={() => { setScoringOpen(false); setManualGuide(true); }}>评测说明</Button><Button variant="ghost" size="small" onClick={() => navigate("/")}>保存并退出</Button></>} />
        <div className="assessment-layout">
          <AssessmentHeader studentName={student?.name ?? "学生"} stage={activeSession.stage} moduleId={moduleId} current={index + 1} total={modules.length} />
          <section className="assessment-stage">{ActiveModule ? <ActiveModule key={`${moduleId}-${selectedTask?.id ?? "legacy"}-${attemptRevision}`} stage={activeSession.courseVersion === 3 ? activeSession.stage : undefined} items={activeResult.items} onSelectItem={selectItem} result={displayResult} onResultChange={updateResult} onRecorded={handleRecorded} /> : <Card><h2>模块准备中</h2><p>该模块已完成配置，交互将在后续阶段开放。</p></Card>}</section>
          <AssessmentFooter canGoBack={index > 0} isLast={index === modules.length - 1} hasEvaluation={Boolean(displayResult.teacherScores && Object.keys(displayResult.teacherScores).length)} intelligentScore={moduleId === "A2" ? displayResult.autoScores?.breathAndVoice : displayResult.autoScores?.pronunciationClarity} showIntelligentRating={false} onBack={() => navigate(`/assessment/${activeSession.id}/${modules[index - 1]}`)} onNext={() => finishAndGo()} onRetry={retry} onSkip={() => finishAndGo("skipped")} onScore={() => setScoringOpen(true)} />
        </div>
      </PageContainer>
      {guideOpen && <AssessmentGuide key={`${sessionId}-${moduleId}`} moduleId={moduleId} large={activeSession.stage !== "A"} onDismiss={() => void dismissGuide()} />}
      <TeacherScoringDialog open={scoringOpen} moduleTitle={selectedTask?.title ?? (moduleId in content.modules ? content.modules[moduleId as keyof typeof content.modules].menuTitle : undefined) ?? moduleDefinitions[moduleId]?.title ?? "评测项目"} dimensions={question?.scoringDimensions ?? []} initialScores={displayResult.teacherScores} onClose={() => setScoringOpen(false)} onSave={saveTeacherScores} />
    </div>
  );
}
