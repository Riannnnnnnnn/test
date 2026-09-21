import { motion } from 'framer-motion'
import mascot from '../assets/ip/starvoice-mascot.png'
export function IPGuide({message,state='default',compact=false}:{message:string;state?:'default'|'thinking'|'cheering'|'speaking'|'success'|'warning';compact?:boolean}){return <div className={`ip-guide ${compact?'compact':''} ip-${state}`}><motion.img src={mascot} alt="STARVOICE 蓝色单眼小怪兽" animate={{y:[0,-7,0],rotate:state==='thinking'?[0,-2,0]:[0,1,0]}} transition={{duration:3,repeat:Infinity}}/><div className="speech-bubble">{message}</div></div>}
