import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Mic, Square } from 'lucide-react'
import { createEnergyMeter } from '../services/audioAnalyzer'
import { MicrophonePermission } from '../components/MicrophonePermission'

export function GameIntro({title,text,onStart}:{title:string;text:string;onStart:()=>void}) {
  return <div className="game-intro"><span>MISSION</span><h2>{title}</h2><p>{text}</p><button className="primary big" onClick={onStart}>开始挑战</button></div>
}
type VoiceMetrics={duration:number;active:number;average:number}
export function VoiceSession({seconds=8,onDone,visual}:{seconds?:number;onDone:(m:VoiceMetrics)=>void;visual?:(level:number,elapsed:number)=>ReactNode}) {
  const [stream,setStream]=useState<MediaStream>()
  const [ready,setReady]=useState(false),[running,setRunning]=useState(false)
  const [elapsed,setElapsed]=useState(0),[level,setLevel]=useState(0)
  const active=useRef(0),samples=useRef<number[]>([])
  const metrics=():VoiceMetrics=>({duration:elapsed,active:active.current,average:samples.current.reduce((a,b)=>a+b,0)/Math.max(1,samples.current.length)})
  useEffect(()=>{if(!running)return;let stop=()=>{};if(stream)stop=createEnergyMeter(stream,l=>setLevel(l));else{const id=setInterval(()=>setLevel(.18+Math.random()*.38),160);stop=()=>clearInterval(id)}const timer=setInterval(()=>setElapsed(e=>e+.1),100);return()=>{stop();clearInterval(timer)}},[running,stream])
  useEffect(()=>{if(!running)return;samples.current.push(level);if(level>.12)active.current+=.1;if(elapsed>=seconds){setRunning(false);onDone(metrics())}},[elapsed,level,running,seconds,onDone])
  if(!ready)return <MicrophonePermission onReady={s=>{setStream(s);setReady(true)}}/>
  const toggle=()=>{if(running){setRunning(false);onDone(metrics())}else{setElapsed(0);active.current=0;samples.current=[];setRunning(true)}}
  return <div className="voice-session">{visual?.(level,elapsed)}<div className="voice-stats"><b>{elapsed.toFixed(1)}s</b><div><i style={{width:`${Math.min(100,level*210)}%`}}/></div><span>{level<.1?'我在认真听…':level<.5?'声音状态很好！':'声音太用力啦'}</span></div><button className={running?'stop-button':'primary'} onClick={toggle}>{running?<><Square/>停止测试</>:<><Mic/>开始测试</>}</button></div>
}
export function ResultButton({onClick,label='完成测试'}:{onClick:()=>void;label?:string}) {return <button className="primary big finish-button" onClick={onClick}>{label} ✦</button>}
