import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from "recharts";
import { StageBadge } from "@/assessment/common/StageBadge/StageBadge";
import { PageContainer, PageHeader } from "@/components/layout";
import { Button, Card } from "@/components/ui";
import { abilityDimensions } from "@/config/scoring";
import { getAbilityBand, getDimensionAnalysis, stageAReportDimensions, type AbilityBand } from "@/config/scoring/reportRules";
import { getCourseTask } from "@/config/courseTasks";
import { getGradeLabel } from "@/config/stages";
import { decodeSharedReport, downloadReportImage, encodeSharedReport } from "@/services/export";
import { getSession, getStudent } from "@/services/storage";
import type { XfyunIseResult } from "@/services/speech/xfyunIse";
import { getReadingPracticeAdvice } from "@/services/speech/readingPractice";
import type { AssessmentSession, StudentProfile } from "@/types";
import { formatDate } from "@/utils/date";

interface TeacherIssue { id: string; reading: string; pattern: string; hint: string; text: string }

interface AbilityView {
  dimension: (typeof stageAReportDimensions)[number];
  subject: string;
  value: number;
  band: AbilityBand | "待观察";
}

export function ReportPage() {
  const { sessionId = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const reportRef = useRef<HTMLDivElement>(null);
  const sharedReport = useMemo(() => decodeSharedReport(new URLSearchParams(location.search).get("report")), [location.search]);
  const [session, setSession] = useState<AssessmentSession>();
  const [student, setStudent] = useState<StudentProfile>();
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  useEffect(() => {
    if (sharedReport) {
      const sharedStudent: StudentProfile = {
        id: "shared-student",
        gender: "other",
        recommendedStage: sharedReport.stage,
        selectedStage: sharedReport.stage,
        ...sharedReport.student,
      };
      const sharedSession: AssessmentSession = {
        id: "shared",
        studentId: sharedStudent.id,
        stage: sharedReport.stage,
        courseVersion: sharedReport.courseVersion,
        startTime: sharedReport.student.assessmentDate,
        status: "completed",
        results: [{ moduleId: "shared", questionId: "shared", status: "completed", finalScores: sharedReport.abilityValues }],
      };
      setStudent(sharedStudent);
      setSession(sharedSession);
      setLoading(false);
      return;
    }

    getSession(sessionId).then(async (found) => {
      if (found) {
        setSession(found);
        setStudent(await getStudent(found.studentId));
      }
      setLoading(false);
    });
  }, [sessionId, sharedReport]);

  const abilityValues = useMemo(() => {
    if (!session) return {} as Record<string, number>;
    const buckets: Record<string, number[]> = {};
    session.results.forEach((result) => {
      const scores = result.finalScores ?? result.teacherScores ?? result.autoScores ?? {};
      if (session.courseVersion === 3 && result.moduleId === "A5") {
        const observed = [scores.performance, scores.languageExpression].filter((value): value is number => value !== undefined);
        if (observed.length) (buckets.performance ??= []).push(observed.reduce((sum, value) => sum + value, 0) / observed.length);
        return;
      }
      const articulation = ["initialStrength", "vowelFullness", "finalClosure"].map((key) => scores[key]).filter((value): value is number => value !== undefined);
      const breathing = ["sustainedPhonation", "breathContinuity", "voiceStability"].map((key) => scores[key]).filter((value): value is number => value !== undefined);
      if (result.moduleId === "A1" && session.courseVersion === 3 && scores.pronunciationClarity !== undefined) {
        (buckets.pronunciationClarity ??= []).push(scores.pronunciationClarity);
      } else if (result.moduleId === "A1" && articulation.length) {
        (buckets.pronunciationClarity ??= []).push(Math.round(articulation.reduce((sum, value) => sum + value, 0) / articulation.length));
      }
      if (result.moduleId === "A2" && breathing.length) (buckets.breathAndVoice ??= []).push(Math.round(breathing.reduce((sum, value) => sum + value, 0) / breathing.length));
      Object.entries(scores).filter(([dimension]) => {
        if (["initialStrength", "vowelFullness", "finalClosure", "sustainedPhonation", "breathContinuity", "voiceStability"].includes(dimension)) return false;
        if (result.moduleId === "A1" && (articulation.length || session.courseVersion === 3) && dimension === "pronunciationClarity") return false;
        if (result.moduleId === "A2" && breathing.length && dimension === "breathAndVoice") return false;
        return true;
      }).forEach(([dimension, value]) => { (buckets[dimension] ??= []).push(value); });
    });
    return Object.fromEntries(Object.entries(buckets).map(([dimension, values]) => [dimension, Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)]));
  }, [session]);

  const a1Items = session?.results.flatMap((result) => result.items ? Object.values(result.items) : [result]).filter((result) => result.moduleId === "A1") ?? [];
  // 老师在“跳过”时勾选的具体读音问题：直接使用评测话术，并在报告结语中汇总。
  const teacherIssues = a1Items.map((item) => ({ questionId: item.questionId, word: String(item.rawResult?.referenceText ?? getCourseTask(item.questionId)?.text ?? item.questionId), issues: (item.rawResult?.skipIssues as TeacherIssue[] | undefined) ?? [] })).filter((item) => item.issues.length);
  const teacherIssueIds = new Set(teacherIssues.map((item) => item.questionId));
  const closingParts = teacherIssues.flatMap((item) => item.issues.map((issue) => /^B1-/.test(item.questionId) ? `句子朗读（${issue.pattern}）` : `“${item.word}”读成“${issue.reading}”（${issue.pattern}）`));
  const readingEvidence = a1Items
    .filter((result) => !teacherIssueIds.has(result.questionId) && result.rawResult?.scoringVersion === "ise-evidence-v2" && (result.rawResult?.evidence as XfyunIseResult | undefined)?.reviewReasons?.length);
  const reportDimensions = session?.courseVersion === 3 ? stageAReportDimensions.filter((id) => ["pronunciationClarity", "breathAndVoice", "performance"].includes(id)) : stageAReportDimensions;
  const measuredValues = reportDimensions.map((id) => abilityValues[id]).filter((value) => value !== undefined);
  const average = measuredValues.length ? measuredValues.reduce((sum, value) => sum + value, 0) / measuredValues.length : 0;
  const highest = measuredValues.length ? Math.max(...measuredValues) : 0;
  const abilities: AbilityView[] = reportDimensions.map((dimension) => {
    const value = abilityValues[dimension] ?? 0;
    return { dimension, subject: abilityDimensions[dimension], value, band: abilityValues[dimension] !== undefined ? getAbilityBand(value, highest, average) : "待观察" };
  });
  const grouped = abilities.reduce<Record<string, AbilityView[]>>((result, ability) => { (result[ability.band] ??= []).push(ability); return result; }, {});
  const prominentNames = (grouped["突出能力"] ?? []).map((item) => item.subject);
  const analyses = reportDimensions.filter((dimension) => abilityValues[dimension] !== undefined).map((dimension) => getDimensionAnalysis(dimension, abilityValues[dimension]));
  const shareUrl = useMemo(() => {
    if (!student || !session) return "";
    const url = new URL("/report/shared", window.location.origin);
    url.searchParams.set("report", encodeSharedReport({
      version: 1,
      student: {
        name: student.name,
        age: student.age,
        grade: student.grade,
        assessmentDate: student.assessmentDate,
      },
      stage: session.stage,
      courseVersion: session.courseVersion,
      abilityValues,
    }));
    return url.toString();
  }, [abilityValues, session, student]);
  const isLocalAddress = ["localhost", "127.0.0.1"].includes(window.location.hostname);

  const handleDownload = async () => {
    if (!reportRef.current || !student) return;
    setDownloading(true);
    setDownloadError("");
    try {
      await downloadReportImage(reportRef.current, `${student.name}-口才能力评测报告.png`);
    } catch {
      setDownloadError("图片生成失败，请稍后重试或使用打印报告。 ");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <div className="app-shell"><PageContainer><p className="loading-state">正在生成能力画像…</p></PageContainer></div>;
  if (!session || !student) return <div className="app-shell"><PageContainer><Card><h1>没有找到评测报告</h1><Button onClick={() => navigate("/")}>返回首页</Button></Card></PageContainer></div>;

  return (
    <div className="app-shell"><PageContainer><PageHeader actions={<><Button variant="secondary" size="small" onClick={handleDownload} disabled={downloading}>{downloading ? "正在生成…" : "下载报告图片"}</Button><Button variant="ghost" size="small" onClick={() => window.print()}>打印报告</Button></>} />
      {sharedReport ? <section className="shared-report-download"><div><strong>报告已成功打开</strong><p>点击按钮即可保存高清报告图片到手机。</p></div><Button onClick={handleDownload} disabled={downloading}>{downloading ? "正在生成图片…" : "下载报告图片"}</Button></section> : <section className="report-qr-panel"><div className="report-qr-panel__copy"><span className="report-qr-panel__icon">⌁</span><div><p className="eyebrow">手机保存</p><h2>扫描二维码下载报告图片</h2><p>使用手机扫码打开报告，再点击“下载报告图片”保存高清图片。</p>{isLocalAddress && <small>当前为本机预览地址；正式发布后，手机扫码即可访问。</small>}</div></div><div className="report-qr-panel__code" aria-label="报告下载二维码" data-share-url={shareUrl}><QRCodeSVG value={shareUrl} size={142} level="M" marginSize={2} fgColor="#45208f" /></div></section>}
      {downloadError && <p className="report-download-error" role="alert">{downloadError}</p>}
      <Card ref={reportRef} className="report-card report-card--wide"><div className="report-heading"><div><p className="eyebrow">口才能力评测报告</p><h1>{student.name} 的表达成长报告</h1><div className="report-meta"><span>{student.age} 岁</span><span>{getGradeLabel(student.grade)}</span><StageBadge stage={session.stage} /><span>{formatDate(student.assessmentDate)}</span></div></div><div className="ability-summary"><span>本次能力亮点</span><strong>{prominentNames.length ? prominentNames.slice(0, 2).join(" · ") : "等待完整观察"}</strong><b>{prominentNames.length ? "表现更为突出" : "完成评价后生成"}</b></div></div>
      {teacherIssues.length > 0 && <section className="reading-evidence reading-evidence--teacher"><h2>发音问题与练习建议</h2>{teacherIssues.map((item) => <article key={item.questionId}><h3>{/^B1-/.test(item.questionId) ? item.word : `“${item.word}”`}</h3>{item.issues.map((issue) => <p key={issue.id}>{issue.text}</p>)}</article>)}<p className="reading-evidence__closing">本次练习中，老师记录了{closingParts.join("、")}等发音练习重点。建议每天选一两个词，先听辨、再模仿，逐步练到词语和完整句子；多鼓励孩子开口，留意每次的小进步。</p></section>}
      {readingEvidence.length > 0 && <section className="reading-evidence"><h2>读音练习建议</h2><p>每天选一两个词，先慢慢读清楚，再自然地连起来读。和老师一起听、一起练，会越来越棒。</p>{readingEvidence.map((item) => {
        const evidence = item.rawResult?.evidence as XfyunIseResult | undefined;
        if (!evidence) return null;
        const referenceText = String(item.rawResult?.referenceText ?? item.questionId);
        return <article key={item.questionId}><h3>{referenceText}</h3><p>{getReadingPracticeAdvice(referenceText, evidence, item.questionId)}</p></article>;
      })}</section>}{measuredValues.length === 0 ? <div className="report-empty-score"><strong>有效评价尚未完成</strong><p>返回各评测项目完成教师复核后，报告会生成能力画像。未通过复核的朗读不计自动成绩。</p><Button variant="secondary" onClick={() => navigate(`/assessment/${session.id}/A1`)}>返回评测</Button></div> : <><div className="ability-groups">{(["突出能力", "表现较为普通", "正在发展"] as AbilityBand[]).map((band) => <section className={`ability-group ability-group--${band === "突出能力" ? "strong" : band === "正在发展" ? "growing" : "steady"}`} key={band}><span>{band}</span><div>{(grouped[band] ?? []).length ? grouped[band].map((item) => <strong key={item.dimension}>{item.subject}</strong>) : <em>暂无</em>}</div></section>)}</div><div className="report-grid"><section><h2>能力画像</h2><p className="chart-caption">图形仅展示各项能力的相对表现，不代表考试分数。</p><div className="radar-wrap"><ResponsiveContainer width="100%" height="100%"><RadarChart data={abilities} outerRadius="70%"><PolarGrid stroke="#ded4f1" /><PolarAngleAxis dataKey="subject" tick={{ fill: "#4f4764", fontSize: 12 }} /><Radar dataKey="value" stroke="#6336bd" fill="#6336bd" fillOpacity={.28} strokeWidth={3} /></RadarChart></ResponsiveContainer></div></section><section className="ability-observations"><h2>能力表现</h2>{abilities.map((item) => <div key={item.dimension}><span>{item.subject}</span><div><i className={`ability-fill ability-fill--${item.band === "突出能力" ? "strong" : item.band === "正在发展" ? "growing" : item.band === "待观察" ? "pending" : "steady"}`} style={{ width: item.value ? `${Math.max(28, item.value)}%` : "12%" }} /></div><strong>{item.band}</strong></div>)}</section></div><section className="analysis-section"><div className="section-heading"><div><p className="eyebrow">单项能力分析</p><h2>具体表现与训练建议</h2></div></div><div className="analysis-list">{analyses.map((analysis) => <article key={analysis.label}><header><h3>{analysis.label}</h3></header><p><b>当前表现</b>{analysis.current}</p><p><b>优势</b>{analysis.strength}</p><p><b>需要提升</b>{analysis.improvement}</p><div><b>训练建议</b>{analysis.training}</div></article>)}</div></section></>}
      <div className="form-actions report-actions" data-export-exclude="true"><Button onClick={() => navigate("/")}>返回首页</Button></div></Card></PageContainer></div>
  );
}
