import type { AbilityId } from '../types/assessment'
import { WordRadar,PronunciationIsland,BalloonChallenge } from './suiteOne'
import { VoiceEnergy,SemanticEmotion,MemoryRoom } from './suiteTwo'
import { AttentionTracker,TaskCommander,LogicDetective } from './suiteThree'
import { StoryPuzzle,LittleActor,CommunicationChallenge } from './suiteFour'
export function GameRenderer({id}:{id:AbilityId}){switch(id){case'wordRecognition':return <WordRadar/>;case'pronunciation':return <PronunciationIsland/>;case'breath':return <BalloonChallenge/>;case'voice':return <VoiceEnergy/>;case'semantic':return <SemanticEmotion/>;case'memory':return <MemoryRoom/>;case'attention':return <AttentionTracker/>;case'organization':return <TaskCommander/>;case'thinking':return <LogicDetective/>;case'expression':return <StoryPuzzle/>;case'performance':return <LittleActor/>;case'communication':return <CommunicationChallenge/>}}
