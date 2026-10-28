import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { StageBadge } from "@/assessment/common/StageBadge/StageBadge";
import { PageContainer, PageHeader } from "@/components/layout";
import { Button, Card } from "@/components/ui";
import { moduleDefinitions } from "@/config/modules";
import { stageConfigs } from "@/config/stages";
import { getStudent, saveSession } from "@/services/storage";
import { useAssessmentStore } from "@/stores/assessmentStore";
import type { AssessmentSession, StageId } from "@/types";
import { createId } from "@/utils/id";
import { useSiteContent } from "@/content/useSiteContent";
import { MicrophoneCheck } from "@/assessment/common/MicrophoneCheck/MicrophoneCheck";
import { shutdownMicrophone } from "@/services/audio/microphone";
import { assessmentImageUrls, preloadImage, preloadImages } from "@/services/assets/preloadImages";

export function StageIntroPage() {
  const { stage: stageParam } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const student = useAssessmentStore((state) => state.student);
  const setStudent = useAssessmentStore((state) => state.setStudent);
  const setSession = useAssessmentStore((state) => state.setSession);
  const [loading, setLoading] = useState(!student);
  const [starting, setStarting] = useState(false);
  const [microphoneDialogOpen, setMicrophoneDialogOpen] = useState(false);
  const [microphonePassedFor, setMicrophonePassedFor] = useState("");
  const [imageError, setImageError] = useState("");
  const microphoneDialogRef = useRef<HTMLDialogElement>(null);
  const { content } = useSiteContent();
  const stage = (stageParam === "B" ? "B" : "A") as StageId;
  const config = stageConfigs[stage];
  const microphoneCheckKey = `${student?.id ?? ""}:${stage}`;
  const microphonePassed = microphonePassedFor === microphoneCheckKey;

  useEffect(() => {
    const studentId = searchParams.get("student");
    if (!student && studentId) getStudent(studentId).then((found) => { if (found) setStudent(found); setLoading(false); });
    else setLoading(false);
  }, [searchParams, setStudent, student]);

  useEffect(() => {
    const urls = config.moduleIds.flatMap((id) => assessmentImageUrls(stage, id, content, student?.gender));
    void preloadImage(urls[0]).then(() => preloadImages(urls.slice(1)));
  }, [config.moduleIds, content, stage, student?.gender]);

  useEffect(() => {
    if (!microphoneDialogOpen) return;
    const dialog = microphoneDialogRef.current;
    dialog?.showModal();
    return () => { if (dialog?.open) dialog.close(); };
  }, [microphoneDialogOpen]);

  function closeMicrophoneDialog() {
    if (starting) return;
    setMicrophoneDialogOpen(false);
    setMicrophonePassedFor("");
    shutdownMicrophone();
  }

  async function startAssessment(previewOnly = false) {
    if (!student || config.availability !== "available" || (!microphonePassed && !(import.meta.env.DEV && previewOnly))) return;
    setStarting(true);
    setImageError("");
    const firstImage = assessmentImageUrls(stage, config.moduleIds[0], content, student.gender)[0];
    if (!(await preloadImage(firstImage))) {
      setImageError("题目图片暂时没有加载好，请检查网络后再试一次。");
      setStarting(false);
      return;
    }
    try {
      const session: AssessmentSession = {
      id: createId("session"), studentId: student.id, stage, courseVersion: 3, startTime: new Date().toISOString(), status: "running",
      results: config.moduleIds.map((moduleId) => ({ moduleId, questionId: `${moduleId}-001`, status: "not_started" })),
      };
      await saveSession(session);
      setSession(session);
      navigate(`/assessment/${session.id}/${config.moduleIds[0]}`);
    } catch {
      setImageError("评测暂时无法开始，请检查浏览器存储权限后重试。");
      setStarting(false);
    }
  }

  if (loading) return <div className="app-shell"><PageContainer><p className="loading-state">正在读取评测资料…</p></PageContainer></div>;
  if (!student) return <div className="app-shell"><PageContainer><Card><h1>没有找到学生资料</h1><p>请先填写基础信息。</p><Button onClick={() => navigate("/profile")}>返回填写</Button></Card></PageContainer></div>;

  return (
    <div className="app-shell stage-intro-page">
      <PageContainer>
        <PageHeader actions={<Button variant="ghost" size="small" onClick={() => navigate(`/profile?edit=${encodeURIComponent(student.id)}`)}>修改信息</Button>} />
        <Card className="intro-card">
          <div className="intro-card__top"><StageBadge stage={stage} /><span>为 {student.name} 准备</span></div>
          <h1>{config.name}</h1><p className="intro-card__lead">{config.description}</p>
          <div className="ability-chips">{config.tagline.map((item) => <span key={item}>{item}</span>)}</div>
          <div className="module-list">
            {config.moduleIds.map((id, index) => { const editable = id in content.modules ? content.modules[id as keyof typeof content.modules] : undefined; return <div className="module-list__item" key={id}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{({ A1: "正音", A2: "气息", A5: "表现力" } as Record<string, string>)[id] ?? editable?.menuTitle ?? moduleDefinitions[id].title}</strong><p>{id === "A1" ? stage === "A" ? "23 个声母 · 看图读词" : "平翘舌与 d、t、n、l 句子朗读" : id === "A5" ? stage === "A" ? "开心、难过、害羞、生气四种表情模仿" : "森林广播员情境表演" : editable?.summary ?? moduleDefinitions[id].summary}</p></div></div>; })}
          </div>
          <div className="intro-card__footer">
            <div><strong>{config.moduleIds.length} 个评测项目</strong><p>{config.availability === "available" ? "点击开始后，先在弹窗中测试麦克风" : "模块定义已经建立，完整交互将在后续阶段开放"}</p></div>
            <Button onClick={() => { setMicrophonePassedFor(""); setImageError(""); setMicrophoneDialogOpen(true); }} disabled={starting || config.availability !== "available"}>{config.availability === "available" ? "开始正式评测" : "本阶段即将开放"}</Button>
          </div>
          {imageError && <p className="assessment-image-error" role="alert">{imageError}</p>}
        </Card>
      </PageContainer>
      {microphoneDialogOpen && <dialog ref={microphoneDialogRef} className="microphone-check-dialog" aria-labelledby="microphone-dialog-title" onCancel={(event) => { event.preventDefault(); closeMicrophoneDialog(); }}>
        <div className="microphone-check-dialog__panel">
          <div className="microphone-check-dialog__head">
            <div><span>开始评测前</span><h2 id="microphone-dialog-title">先检查麦克风</h2></div>
            <button type="button" className="microphone-check-dialog__close" aria-label="关闭麦克风测试" onClick={closeMicrophoneDialog} disabled={starting}>×</button>
          </div>
          <MicrophoneCheck key={microphoneCheckKey} onPassedChange={(passed) => setMicrophonePassedFor(passed ? microphoneCheckKey : "")} />
          {imageError && <p className="assessment-image-error" role="alert">{imageError}</p>}
          <div className="microphone-check-dialog__footer">
            <Button variant="secondary" onClick={closeMicrophoneDialog} disabled={starting}>稍后再测</Button>
            {import.meta.env.DEV && <Button variant="secondary" onClick={() => void startAssessment(true)} disabled={starting}>跳过，预览页面</Button>}
            <Button onClick={() => void startAssessment()} disabled={!microphonePassed || starting}>{starting ? "正在准备评测…" : "进入评测"}</Button>
          </div>
          {import.meta.env.DEV && <p>本地预览可跳过麦克风测试，语音评分需要安全连接及正常收音。</p>}
        </div>
      </dialog>}
    </div>
  );
}
