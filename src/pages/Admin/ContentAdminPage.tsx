import { useEffect, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer, PageHeader } from "@/components/layout";
import { Button, Card } from "@/components/ui";
import { useSiteContent } from "@/content/useSiteContent";
import { getCourseTasks } from "@/config/courseTasks";
import type { ModuleContent, SiteContent, StageAModuleId } from "@/content/types";

const moduleIds: StageAModuleId[] = ["A1", "A2", "A5"];

async function imageFileToDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("请选择图片文件");
  const source = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = source;
    await image.decode();
    const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/webp", .86);
  } finally {
    URL.revokeObjectURL(source);
  }
}

function TextEditor({ label, value, onChange, multiline = false }: { label: string; value: string; onChange: (value: string) => void; multiline?: boolean }) {
  return <label className="field"><span className="field__label">{label}</span>{multiline ? <textarea className="field-control admin-textarea" value={value} onChange={(event) => onChange(event.target.value)} /> : <input className="field-control" value={value} onChange={(event) => onChange(event.target.value)} />}</label>;
}

function ImageEditor({ label, value, alt, onChange }: { label: string; value: string; alt: string; onChange: (value: string) => void }) {
  const [error, setError] = useState("");
  const choose = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    try { onChange(await imageFileToDataUrl(file)); } catch { setError("图片读取失败，请换一张图片重试。 "); }
    event.target.value = "";
  };
  return <div className="admin-image-editor"><div className="admin-image-editor__preview">{value ? <img src={value} alt={alt} /> : <span>暂无图片<br /><small>前台使用默认图形</small></span>}</div><div><strong>{label}</strong><p>支持 JPG、PNG 等常见格式，上传后自动转为 WebP 压缩保存。</p><label className="button button--secondary admin-upload">选择图片<input type="file" accept="image/*" onChange={choose} /></label>{value && <Button type="button" variant="danger" size="small" onClick={() => onChange("")}>移除图片</Button>}{error && <span className="field__error">{error}</span>}</div></div>;
}

export function ContentAdminPage() {
  const navigate = useNavigate();
  const { content, ready, replaceContent, resetContent } = useSiteContent();
  const [draft, setDraft] = useState<SiteContent>(() => structuredClone(content));
  const [active, setActive] = useState<"home" | StageAModuleId>("home");
  const [taskStage, setTaskStage] = useState<"A" | "B">("A");
  const updateTask = (id: string, key: "title" | "text" | "image" | "imageFemale", value: string) => setDraft((current) => ({ ...current, taskOverrides: { ...current.taskOverrides, [id]: { ...current.taskOverrides?.[id], [key]: value } } }));
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => { if (ready) setDraft(structuredClone(content)); }, [content, ready]);

  if (!ready) return <div className="app-shell"><PageContainer><p className="loading-state">正在读取内容配置…</p></PageContainer></div>;

  const updateHome = (key: keyof SiteContent["home"], value: string) => setDraft((current) => ({ ...current, home: { ...current.home, [key]: value } }));
  const updateBrand = (key: keyof SiteContent["brand"], value: string) => setDraft((current) => ({ ...current, brand: { ...current.brand, [key]: value } }));
  const updateStage = (id: "A" | "B" | "C", key: keyof SiteContent["stages"]["A"], value: string) => setDraft((current) => ({ ...current, stages: { ...current.stages, [id]: { ...current.stages[id], [key]: value } } }));
  const updateModule = (id: StageAModuleId, key: keyof ModuleContent, value: string) => setDraft((current) => ({ ...current, modules: { ...current.modules, [id]: { ...current.modules[id], [key]: value } } }));
  const updateSequence = (index: number, key: "connector" | "title" | "symbol" | "imageUrl", value: string) => setDraft((current) => {
    const items = [...(current.modules.A3.sequenceItems ?? [])];
    items[index] = { ...items[index], [key]: value };
    return { ...current, modules: { ...current.modules, A3: { ...current.modules.A3, sequenceItems: items } } };
  });

  const save = async () => { setState("saving"); await replaceContent(structuredClone(draft)); setState("saved"); window.setTimeout(() => setState("idle"), 1800); };
  const restore = async () => { if (!window.confirm("确定恢复全部默认文字和图片吗？当前自定义内容会被覆盖。")) return; await resetContent(); setActive("home"); setState("saved"); };
  const module = active === "home" ? undefined : draft.modules[active];

  return <div className="app-shell admin-page"><PageContainer><PageHeader actions={<><Button variant="ghost" size="small" onClick={() => navigate("/")}>查看前台</Button><Button size="small" onClick={save} disabled={state === "saving"}>{state === "saving" ? "保存中…" : state === "saved" ? "已保存 ✓" : "保存并发布"}</Button></>} />
    <div className="admin-heading"><div><p className="eyebrow">内容管理后台</p><h1>自由修改评测内容</h1><p>修改后点击“保存并发布”，前台刷新即可看到最新内容。</p></div><Button variant="danger" size="small" onClick={restore}>恢复全部默认</Button></div>
    <div className="admin-layout"><aside className="admin-sidebar"><button className={active === "home" ? "is-active" : ""} onClick={() => setActive("home")}><span>封</span><div><strong>封面与品牌</strong><small>首页标题、介绍和封面图</small></div></button>{moduleIds.map((id) => <button key={id} className={active === id ? "is-active" : ""} onClick={() => setActive(id)}><span>{id}</span><div><strong>{draft.modules[id].menuTitle}</strong><small>{draft.modules[id].summary}</small></div></button>)}</aside>
      <Card className="admin-editor">{active !== "home" && active !== "A2" && <section><h2>分阶段题目</h2><div className="dialog-actions"><Button variant={taskStage === "A" ? "primary" : "secondary"} onClick={() => setTaskStage("A")}>小阶段</Button><Button variant={taskStage === "B" ? "primary" : "secondary"} onClick={() => setTaskStage("B")}>大阶段</Button></div>{getCourseTasks(taskStage, active).map((task) => { const value = { ...task, ...draft.taskOverrides?.[task.id] }; return <div key={task.id}><h3>{task.title}</h3><TextEditor label={`${task.title} · 题目内容`} value={value.text} onChange={(text) => updateTask(task.id, "text", text)} multiline />{task.examples?.map((fallback, i) => <TextEditor key={i} label={`例句 ${i + 1} · ${i < 2 ? "着急" : "开心"}`} value={value.examples?.[i] ?? fallback} onChange={(text) => setDraft((current) => ({ ...current, taskOverrides: { ...current.taskOverrides, [task.id]: { ...current.taskOverrides?.[task.id], examples: task.examples!.map((sentence, index) => index === i ? text : current.taskOverrides?.[task.id]?.examples?.[index] ?? sentence) } } }))} multiline />)}{task.image && <ImageEditor label={`${task.title} · ${task.imageFemale ? "男孩配图" : "配图"}`} value={value.image ?? ""} alt={value.title} onChange={(image) => updateTask(task.id, "image", image)} />}{task.imageFemale && <ImageEditor label={`${task.title} · 女孩配图`} value={value.imageFemale ?? ""} alt={`${value.title}的女孩`} onChange={(image) => updateTask(task.id, "imageFemale", image)} />}</div>; })}</section>}{active === "home" ? <><div className="section-heading"><div><p className="eyebrow">首页内容</p><h2>封面、品牌与阶段图标</h2></div></div><div className="admin-form-grid"><TextEditor label="品牌简称" value={draft.brand.mark} onChange={(value) => updateBrand("mark", value)} /><TextEditor label="系统名称" value={draft.brand.name} onChange={(value) => updateBrand("name", value)} /><TextEditor label="封面引导语" value={draft.home.eyebrow} onChange={(value) => updateHome("eyebrow", value)} /><TextEditor label="封面标题（第一行）" value={draft.home.title} onChange={(value) => updateHome("title", value)} /><TextEditor label="封面标题（强调行）" value={draft.home.accentTitle} onChange={(value) => updateHome("accentTitle", value)} /><TextEditor label="封面说明" value={draft.home.description} multiline onChange={(value) => updateHome("description", value)} /></div><ImageEditor label="顶部 Logo 图片" value={draft.brand.logoImageUrl} alt={draft.brand.logoImageAlt} onChange={(value) => updateBrand("logoImageUrl", value)} /><ImageEditor label="封面图片" value={draft.home.coverImageUrl} alt={draft.home.coverImageAlt} onChange={(value) => updateHome("coverImageUrl", value)} /><div className="admin-stage-icons"><h3>小阶段 / 大阶段图标</h3>{(["A", "B"] as const).map((id) => <div className="admin-stage-icon" key={id}><div className="admin-form-grid"><TextEditor label={`${id} 段名称`} value={draft.stages[id].name} onChange={(value) => updateStage(id, "name", value)} /><TextEditor label={`${id} 段能力文字`} value={draft.stages[id].tagline} onChange={(value) => updateStage(id, "tagline", value)} /></div><ImageEditor label={`${id} 段小图标`} value={draft.stages[id].iconImageUrl} alt={draft.stages[id].iconImageAlt} onChange={(value) => updateStage(id, "iconImageUrl", value)} /></div>)}</div></> : module ? <><div className="section-heading"><div><p className="eyebrow">{active} 评测模块</p><h2>{module.menuTitle}</h2></div></div><div className="admin-form-grid"><TextEditor label="模块名称" value={module.menuTitle} onChange={(value) => updateModule(active, "menuTitle", value)} /><TextEditor label="模块简介" value={module.summary} onChange={(value) => updateModule(active, "summary", value)} /><TextEditor label="题目前缀" value={module.eyebrow} onChange={(value) => updateModule(active, "eyebrow", value)} /><TextEditor label="题目标题" value={module.title} onChange={(value) => updateModule(active, "title", value)} /><TextEditor label="孩子引导语" value={module.prompt} multiline onChange={(value) => updateModule(active, "prompt", value)} /><TextEditor label="教师提示" value={module.teacherNote} multiline onChange={(value) => updateModule(active, "teacherNote", value)} /><TextEditor label={active === "A4" ? "人物标记" : "图片内文字"} value={module.visualText} onChange={(value) => updateModule(active, "visualText", value)} /><TextEditor label={active === "A4" ? "情境对话" : active === "A2" ? "终点文字" : "辅助文字"} value={module.secondaryText} onChange={(value) => updateModule(active, "secondaryText", value)} /></div>{active !== "A3" && <ImageEditor label="模块主图片" value={module.imageUrl} alt={module.imageAlt} onChange={(value) => updateModule(active, "imageUrl", value)} />}{active === "A3" && <div className="admin-sequence"><h3>三张排序图片与文字</h3>{(module.sequenceItems ?? []).map((item, index) => <div className="admin-sequence__item" key={item.key}><ImageEditor label={`第 ${index + 1} 张图片`} value={item.imageUrl} alt={item.title} onChange={(value) => updateSequence(index, "imageUrl", value)} /><div className="admin-form-grid"><TextEditor label="连接词" value={item.connector} onChange={(value) => updateSequence(index, "connector", value)} /><TextEditor label="图片文字" value={item.title} onChange={(value) => updateSequence(index, "title", value)} /><TextEditor label="无图片时显示字" value={item.symbol} onChange={(value) => updateSequence(index, "symbol", value)} /></div></div>)}</div>}</> : null}</Card></div>
  </PageContainer></div>;
}
