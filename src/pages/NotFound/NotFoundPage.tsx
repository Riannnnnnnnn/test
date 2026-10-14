import { useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/layout";
import { Button, Card } from "@/components/ui";

export function NotFoundPage() {
  const navigate = useNavigate();
  return <div className="app-shell"><PageContainer><Card><h1>页面走丢了</h1><p>这个地址暂时不存在。</p><Button onClick={() => navigate("/")}>返回首页</Button></Card></PageContainer></div>;
}
