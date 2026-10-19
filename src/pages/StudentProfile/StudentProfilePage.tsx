import { useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { StageBadge } from "@/assessment/common/StageBadge/StageBadge";
import { PageContainer, PageHeader } from "@/components/layout";
import { Button, Card, Dialog, Input, Select } from "@/components/ui";
import { gradeOptions, recommendStage, selectableStageConfigs, stageConfigs } from "@/config/stages";
import { saveStudent } from "@/services/storage";
import { useAssessmentStore } from "@/stores/assessmentStore";
import type { Gender, GradeLevel, StageId, StudentProfile } from "@/types";
import { createId } from "@/utils/id";
import { useSiteContent } from "@/content/useSiteContent";

interface FormState {
  name: string;
  gender: Gender | "";
  age: string;
  grade: GradeLevel | "";
}

const initialForm: FormState = { name: "", gender: "", age: "", grade: "" };
const ageOptions = Array.from({ length: 16 }, (_, index) => ({ value: String(index + 3), label: `${index + 3} 岁` }));

export function StudentProfilePage() {
  const navigate = useNavigate();
  const setStudent = useAssessmentStore((state) => state.setStudent);
  const [form, setForm] = useState(initialForm);
  const [selectedStage, setSelectedStage] = useState<StageId | null>(null);
  const [stageDialogOpen, setStageDialogOpen] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const { content } = useSiteContent();

  const recommendedStage = useMemo(() => form.grade ? recommendStage(form.grade) : null, [form.grade]);
  const activeStage = selectedStage ?? recommendedStage;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    if (key === "grade") setSelectedStage(null);
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const age = Number(form.age);
    if (!form.name.trim() || !form.gender || !form.grade || !activeStage) {
      setError("请完整填写姓名、性别、年龄和当前年级。");
      return;
    }
    if (!Number.isInteger(age) || age < 3 || age > 18) {
      setError("请选择 3—18 岁之间的年龄。");
      return;
    }
    setSaving(true);
    const student: StudentProfile = {
      id: createId("student"),
      name: form.name.trim(),
      gender: form.gender,
      age,
      grade: form.grade,
      assessmentDate: new Date().toISOString(),
      recommendedStage: recommendedStage!,
      selectedStage: activeStage,
    };
    try {
      await saveStudent(student);
      setStudent(student);
      navigate(`/stage/${activeStage}/intro?student=${encodeURIComponent(student.id)}`);
    } catch {
      setError("资料暂时无法保存，请检查浏览器存储权限后重试。");
      setSaving(false);
    }
  }

  return (
    <div className="app-shell profile-page">
      <PageContainer>
        <PageHeader actions={<Button variant="ghost" size="small" onClick={() => navigate("/")}>返回首页</Button>} />
        <section className="profile-layout">
          <div className="profile-layout__intro">
            <p className="eyebrow hero__eyebrow">开始一次新评测</p>
            <h1>口才能力评测</h1>
            <p>填写基础信息，系统会根据当前年级推荐合适的评测阶段。老师可以在开始前调整。</p>
            <ol className="step-list"><li className="is-active"><span>1</span>基础信息</li><li><span>2</span>确认阶段</li><li><span>3</span>正式评测</li></ol>
          </div>
          <Card className="profile-card">
            <div className="section-heading"><div><p className="eyebrow">学生信息</p><h2>先认识一下孩子</h2></div><span>测评日期自动记录</span></div>
            <form onSubmit={handleSubmit} noValidate>
              <div className="form-grid">
                <Input label="姓名" name="name" required placeholder="请输入孩子姓名" autoComplete="off" value={form.name} onChange={(event) => update("name", event.target.value)} />
                <Select label="性别" name="gender" required value={form.gender} onChange={(event) => update("gender", event.target.value as Gender)} options={[{ value: "male", label: "男" }, { value: "female", label: "女" }]} />
                <Select label="年龄" name="age" required value={form.age} onChange={(event) => update("age", event.target.value)} options={ageOptions} />
                <Select label="当前年级" name="grade" required value={form.grade} onChange={(event) => update("grade", event.target.value as GradeLevel)} options={gradeOptions} />
              </div>

              <div className={`recommendation ${activeStage ? "recommendation--ready" : ""}`}>
                {activeStage ? <><div className="recommendation__main"><span className="recommendation__caption">推荐测评阶段</span><StageBadge stage={activeStage} /><strong>{stageConfigs[activeStage].positioning}</strong><p>{content.stages[activeStage].tagline}</p></div><Button type="button" variant="secondary" size="small" onClick={() => setStageDialogOpen(true)}>调整阶段</Button></> : <div><strong>选择当前年级后，将自动推荐评测阶段</strong><p>推荐结果可以由老师手动调整。</p></div>}
              </div>
              {error && <p className="form-error" role="alert">{error}</p>}
              <div className="form-actions"><Button type="submit" disabled={saving}>{saving ? "正在保存…" : "开始评测"}<span aria-hidden="true">→</span></Button></div>
            </form>
          </Card>
        </section>
      </PageContainer>

      <Dialog open={stageDialogOpen} title="调整评测阶段" onClose={() => setStageDialogOpen(false)}>
        <div className="stage-picker">
          {selectableStageConfigs.map((stage) => (
            <button type="button" key={stage.id} className={`stage-picker__option ${activeStage === stage.id ? "is-selected" : ""}`} onClick={() => { setSelectedStage(stage.id); setStageDialogOpen(false); }}>
              <span className={content.stages[stage.id].iconImageUrl ? "has-image" : ""}>{content.stages[stage.id].iconImageUrl ? <img src={content.stages[stage.id].iconImageUrl} alt={content.stages[stage.id].iconImageAlt} /> : stage.id}</span><div><strong>{content.stages[stage.id].name}</strong><small>{content.stages[stage.id].tagline}</small></div>
            </button>
          ))}
        </div>
      </Dialog>
    </div>
  );
}
