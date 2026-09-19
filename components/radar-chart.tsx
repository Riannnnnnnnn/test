"use client";
import { useEffect, useRef } from "react";
import { abilities, radarValues } from "@/lib/assessment-data";

export function RadarChart({ compact = false }: { compact?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let chart: import("echarts").ECharts | undefined;
    let disposed = false;
    const resize = () => chart?.resize();
    import("echarts").then((echarts) => {
      if (!ref.current || disposed) return;
      chart = echarts.init(ref.current, undefined, { renderer: "svg" });
      chart.setOption({ animationDuration: 1100, radar: { radius: compact ? "61%" : "65%", center: ["50%", "51%"], splitNumber: 5, indicator: abilities.map((item) => ({ name: item.short, max: 5 })), name: { color: compact ? "#d9eaff" : "#092a65", fontSize: compact ? 10 : 12, fontWeight: 700 }, axisLine: { lineStyle: { color: compact ? "rgba(124,211,255,.35)" : "rgba(20,83,160,.20)" } }, splitLine: { lineStyle: { color: compact ? "rgba(124,211,255,.20)" : "rgba(20,83,160,.16)" } }, splitArea: { areaStyle: { color: compact ? ["rgba(23,72,153,.15)", "rgba(18,60,135,.28)"] : ["rgba(255,255,255,.45)", "rgba(77,188,255,.08)"] } } }, series: [{ type: "radar", symbol: "circle", symbolSize: compact ? 5 : 7, lineStyle: { color: "#ffd52f", width: 3 }, itemStyle: { color: "#fff", borderColor: "#ffb703", borderWidth: 2 }, areaStyle: { color: "rgba(255,213,47,.45)" }, data: [{ value: radarValues }] }] });
      window.addEventListener("resize", resize);
    });
    return () => { disposed = true; window.removeEventListener("resize", resize); chart?.dispose(); };
  }, [compact]);
  return <div ref={ref} className="h-full min-h-[250px] w-full" aria-label="十二维口才能力星图" />;
}
