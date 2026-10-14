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

export function StageIntroPage() {
  const { stage: stageParam } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const student = useAssessmentStore((state) => state.student);
  const setStudent = useAssessmentStore((state) => state.setStudent);
  const setSession = useAssessmentStore((state) => state.setSession);
  const [loading, setLoading] = useState(!student);
  const { content } = useSiteContent();
  const stage = (stageParam && stageParam in stageConfigs ? stageParam : "A") as StageId;
  const config = stageConfigs[stage];

  useEffect(() => {
    const studentId = searchParams.get("student");
    if (!student && studentId) getStudent(studentId).then((found) => { if (found) setStudent(found); setLoading(false); });
    else setLoading(false);
  }, [searchParams, setStudent, student]);

  async function startAssessment() {
    if (!student || config.availability !== "available") return;
    const session: AssessmentSession = {
      id: createId("session"), studentId: student.id, stage, startTime: new Date().toISOString(), status: "running",
      results: config.moduleIds.map((moduleId) => ({ moduleId, questionId: `${moduleId}-001`, status: "not_started" })),
    };
    await saveSession(session);
    setSession(session);
    navigate(`/assessment/${session.id}/${config.moduleIds[0]}`);
  }

  if (loading) return <div className="app-shell"><PageContainer><p className="loading-state">正在读取评测资料…</p></PageContainer></div>;
  if (!student) return <div className="app-shell"><PageContainer><Card><h1>没有找到学生资料</h1><p>请先填写基础信息。</p><Button onClick={() => navigate("/profile")}>返回填写</Button></Card></PageContainer></div>;

  return (
    <div className="app-shell">
      <PageContainer>
        <PageHeader actions={<Button variant="ghost" size="small" onClick={() => navigate("/profile")}>修改信息</Button>} />
        <Card className="intro-card">
          <div className="intro-card__top"><StageBadge stage={stage} /><span>为 {student.name} 准备</span></div>
          <h1>{config.name}</h1><p className="intro-card__lead">{config.description}</p>
          <div className="ability-chips">{config.tagline.map((item) => <span key={item}>{item}</span>)}</div>
          <div className="module-list">
            {config.moduleIds.map((id, index) => { const editable = id in content.modules ? content.modules[id as keyof typeof content.modules] : undefined; return <div className="module-list__item" key={id}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{editable?.menuTitle ?? moduleDefinitions[id].title}</strong><p>{editable?.summary ?? moduleDefinitions[id].summary}</p></div></div>; })}
          </div>
          <div className="intro-card__footer">
            <div><strong>{config.moduleIds.length} 个评测项目</strong><p>{config.availability === "available" ? "过程会自动保存，可以中途继续" : "模块定义已经建立，完整交互将在后续阶段开放"}</p></div>
            <Button onClick={startAssessment} disabled={config.availability !== "available"}>{config.availability === "available" ? "开始正式评测" : "本阶段即将开放"}</Button>
          </div>
        </Card>
      </PageContainer>
    </div>
  );
}
