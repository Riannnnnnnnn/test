import { AudioLines, BookOpenText, Brain, Ear, Eye, Flame, Languages, Lightbulb, MessageCircleMore, Mic2, Puzzle, Sparkles } from "lucide-react";

export const abilities = [
  { id: 1, name: "识词能力", short: "识词", group: "语言", icon: BookOpenText, color: "#48c6ff" },
  { id: 2, name: "吐字归音", short: "吐字", group: "声音", icon: Mic2, color: "#ff7848" },
  { id: 3, name: "气息状态", short: "气息", group: "声音", icon: AudioLines, color: "#8d70ff" },
  { id: 4, name: "声音条件", short: "声音", group: "声音", icon: Ear, color: "#35d4a0" },
  { id: 5, name: "语义感知力", short: "语感", group: "语言", icon: Languages, color: "#ffab38" },
  { id: 6, name: "记忆力", short: "记忆", group: "认知", icon: Brain, color: "#fc64a4" },
  { id: 7, name: "专注力", short: "专注", group: "认知", icon: Eye, color: "#5d8bff" },
  { id: 8, name: "逻辑组织", short: "组织", group: "逻辑", icon: Puzzle, color: "#49c4c6" },
  { id: 9, name: "思维逻辑", short: "思维", group: "逻辑", icon: Lightbulb, color: "#f2c63d" },
  { id: 10, name: "逻辑表达", short: "表达", group: "表达", icon: MessageCircleMore, color: "#6c7df0" },
  { id: 11, name: "表现力", short: "表现", group: "表达", icon: Sparkles, color: "#ff7b91" },
  { id: 12, name: "沟通应变", short: "应变", group: "沟通", icon: Flame, color: "#32bbed" },
] as const;

export const radarValues = [4.3, 4.6, 3.7, 4.5, 4.2, 3.8, 4.0, 3.6, 3.9, 4.4, 4.7, 4.1];
export const quizOptions = [{ word: "蝴蝶", emoji: "🦋" }, { word: "小鸟", emoji: "🐦" }, { word: "花朵", emoji: "🌼" }];
