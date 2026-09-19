"use client";
import Image from "next/image";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const sources = { welcome: "/assets/character/mascot-welcome.png", encourage: "/assets/character/mascot-encourage.png", thinking: "/assets/character/mascot-thinking.png", celebrate: "/assets/character/mascot-celebrate.png" };

export function Character({ state = "welcome", className, priority = false }: { state?: keyof typeof sources; className?: string; priority?: boolean }) {
  return <motion.div className={cn("relative select-none", className)} animate={{ y: [0, -9, 0], rotate: state === "celebrate" ? [0, -2, 2, 0] : [0, 1, 0] }} transition={{ duration: state === "celebrate" ? 1.25 : 3.2, repeat: Infinity, ease: "easeInOut" }}>
    <div className="absolute inset-x-[12%] bottom-[2%] h-[12%] rounded-full bg-[#071b54]/25 blur-xl" />
    <Image src={sources[state]} alt={`星语岛向导小蓝-${state}`} fill priority={priority} sizes="(max-width: 768px) 70vw, 38vw" className="object-contain drop-shadow-[0_18px_22px_rgba(5,34,98,.25)]" />
  </motion.div>;
}
