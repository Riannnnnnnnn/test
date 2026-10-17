import { useEffect, useState } from "react";
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
  const [microphonePassedFor, setMicrophonePassedFor] = useState("");
  const [imageError, setImageError] = useState("");
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
    const urls = config.moduleIds.flatMap((id) => assessmentImageUrls(stage, id, content));
    void preloadImage(urls[0]).then(() => preloadImages(urls.slice(1)));
  }, [config.moduleIds, content, stage]);

  async function startAssessment() {
    if (!student || config.availability !== "available" || !microphonePassed) return;
    setStarting(true);
    setImageError("");
    const firstImage = assessmentImageUrls(stage, config.moduleIds[0], content)[0];
    if (!(await preloadImage(firstImage))) {
      setImageError("题目图片暂时没有加载好，请检查网络后再试一次。");
      setStarting(false);
      return;
    }
    const session: AssessmentSession = {
      id: createId("session"), studentId: student.id, stage, courseVersion: 3, startTime: new Date().toISOString(), status: "running",
      results: config.moduleIds.map((moduleId) => ({ moduleId, questionId: `${moduleId}-001`, status: "not_started" })),
    };
    await saveSession(session);
    setSession(session);
    navigate(`/assessment/${session.id}/${config.moduleIds[0]}`);
  }

  if (loading) return <div className="app-shell"><PageContainer><p className="loading-state">正在读取评测资料…</p></PageContainer></div>;
  if (!student) return <div className="app-shell"><PageContainer><Card><h1>没有找到学生资料</h1><p>请先填写基础信息。</p><Button onClick={() => navigate("/profile")}>返回填写</Button></Card></PageContainer></div>;

  return (
    <div className="app-shell stage-intro-page">
      <PageContainer>
        <PageHeader actions={<Button variant="ghost" size="small" onClick={() => navigate("/profile")}>修改信息</Button>} />
        <Card className="intro-card">
          <div className="intro-card__top"><StageBadge stage={stage} /><span>为 {student.name} 准备</span></div>
          <h1>{config.name}</h1><p className="intro-card__lead">{config.description}</p>
          <div className="ability-chips">{config.tagline.map((item) => <span key={item}>{item}</span>)}</div>
          <div className="module-list">
            {config.moduleIds.map((id, index) => { const editable = id in content.modules ? content.modules[id as keyof typeof content.modules] : undefined; return <div className="module-list__item" key={id}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{({ A1: "正音", A2: "气息", A5: "表现力" } as Record<string, string>)[id] ?? editable?.menuTitle ?? moduleDefinitions[id].title}</strong><p>{id === "A1" ? stage === "A" ? "23 个声母 · 看图读词" : "平翘舌与 d、t、n、l 句子朗读" : id === "A5" ? stage === "A" ? "小老虎、小狗、小鸭模仿" : "森林广播员情境表演" : editable?.summary ?? moduleDefinitions[id].summary}</p></div></div>; })}
          </div>
          {config.availability === "available" && <MicrophoneCheck key={microphoneCheckKey} onPassedChange={(passed) => setMicrophonePassedFor(passed ? microphoneCheckKey : "")} />}
          <div className="intro-card__footer">
            <div><strong>{config.moduleIds.length} 个评测项目</strong><p>{config.availability === "available" ? microphonePassed ? "麦克风测试已通过，过程会自动保存" : "请先测试麦克风，通过后即可开始评测" : "模块定义已经建立，完整交互将在后续阶段开放"}</p></div>
            <Button onClick={startAssessment} disabled={starting || config.availability !== "available" || !microphonePassed}>{starting ? "正在准备评测…" : config.availability === "available" ? "开始正式评测" : "本阶段即将开放"}</Button>
          </div>
          {imageError && <p className="assessment-image-error" role="alert">{imageError}</p>}
        </Card>
      </PageContainer>
    </div>
  );
}
