import React,{useState,useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {Play,Pause,Timer,Minus,X,Moon,Sun,Smartphone} from 'lucide-react';
import '@/styles/app.css';import '@/styles/additions.css';import '@/styles/theme.css';import '@/styles/polish.css';import '@/styles/v2.css';import './prototype.css';import './fullscreen.css';
const PHASES=[['idle','Ready','25:00','Focus session'],['running','Running','18:42','Focus session'],['paused','Paused','18:42','Paused'],['break','Break','04:12','Short break'],['done','Done','00:00','Session complete']] as const;
const KICKER:Record<string,string>={idle:'POMODORO',running:'POMODORO',paused:'PAUSED',break:'SHORT BREAK',done:'SESSION COMPLETE'};
const TASK={name:'Rebuild the home page',project:'Website',description:'Three blocks, one idea per block.\n\nKeep the promise clear, show the work, make the next step obvious.',minutes:45,horizon:'This week',steps:['Write the copy','Choose the images','Build the layout']};
function Controls({phase}:{phase:string}){return <div className="timer-controls">{phase==='idle'?<button className="btn primary"><Play size={15}/>Start focus</button>:phase==='done'?<button className="btn primary"><Play size={15}/>Start a break</button>:<button className="btn primary">{phase==='paused'?<Play size={15}/>:<Pause size={15}/>}{phase==='paused'?'Resume':'Pause'}</button>}{phase!=='idle'&&<button className="btn">End session</button>}</div>}
const PROJECT_COLOR='#6c67c9';
function Screen({mode,phase}:{mode:'free'|'linked';phase:string}){
 const p=PHASES.find(x=>x[0]===phase)!;
 const timer=<><div className="focus-digits">{p[2]}</div><span className="focus-phase">{p[3]}</span><Controls phase={phase}/></>;
 return <section className={'proto-focus '+mode} aria-label={`${mode} ${p[1]}`}><header><span><Timer size={15}/>Focus</span><div><button>Back to my tasks<X size={15}/></button></div></header>
 {mode==='free'?<div className="focus-center">{timer}</div>
 :<div className="focus-center"><div className="timer-side">{timer}</div><article className="task-side"><div className="focus-project" style={{color:PROJECT_COLOR}}><span>#</span>{TASK.project}</div><h1>{TASK.name}</h1><p className="focus-description">{TASK.description}</p><h2>Checklist</h2>{TASK.steps.map(s=><div className="task-line" key={s}><span className="focus-circle"/>{s}</div>)}<h2>Subtasks</h2>{['Draft the hero section','Review with the client'].map(s=><div className="task-line" key={s}><span className="focus-circle sub"/>{s}</div>)}<div className="focus-context"><span><Timer size={13}/>{TASK.minutes} min estimated</span><span>{TASK.horizon}</span></div></article></div>}
 </section>}
function App(){
 const [theme,T]=useState('light'),[narrow,W]=useState(false),[layout,L]=useState<'free'|'linked'>('free');
 useEffect(()=>{document.documentElement.dataset.theme=theme},[theme]);
 return <><div className="gallery-bar"><div className="gallery-brand"><strong>Enhanced</strong><span>Pomodoro · plein écran · deux versions, états distincts</span></div><div className="gallery-families"><button aria-pressed={layout==='free'} onClick={()=>L('free')}>Depuis une vue</button><button aria-pressed={layout==='linked'} onClick={()=>L('linked')}>Depuis une tâche</button></div><div className="gallery-tools"><button onClick={()=>T(theme==='light'?'dark':'light')}>{theme==='light'?<Moon size={14}/>:<Sun size={14}/>}{theme==='light'?'Sombre':'Clair'}</button><button aria-pressed={narrow} onClick={()=>W(!narrow)}><Smartphone size={14}/>Étroit</button></div></div>
 <main className="fs-list">{PHASES.map(([id,name])=><figure key={id}><figcaption><b>{name}</b></figcaption><div className={'fs-frame'+(narrow?' narrow':'')}><Screen mode={layout} phase={id}/></div></figure>)}</main></>}
createRoot(document.getElementById('root')!).render(<App/>);
