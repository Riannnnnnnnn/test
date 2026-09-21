import { useState } from 'react'
import { Mic, MicOff } from 'lucide-react'
import { requestMicrophone } from '../services/audioAnalyzer'
import { useAssessmentStore } from '../store/useAssessmentStore'
export function MicrophonePermission({onReady}:{onReady:(stream?:MediaStream)=>void}){const [status,setStatus]=useState<'ask'|'denied'>('ask');const mock=useAssessmentStore(s=>s.debugMockMic);const open=async()=>{if(mock){onReady();return}try{onReady(await requestMicrophone())}catch{setStatus('denied')}};return <div className="permission-card">{status==='ask'?<Mic/>:<MicOff/>}<h3>{status==='ask'?'这个游戏需要听到你的声音哦！':'还没有打开麦克风'}</h3><p>{status==='ask'?'我们只会在本次小游戏中使用声音。':'可以检查浏览器权限后再试，或在调试面板开启模拟模式。'}</p><button className="primary" onClick={open}>{status==='ask'?'打开麦克风':'重新打开'}</button></div>}
