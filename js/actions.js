/* Click and change handlers for every button in the app. */
document.addEventListener("click",e=>{
  const b=e.target.closest("[data-act]");if(!b)return;
  const a=b.dataset.act,id=b.dataset.id,done=()=>{save();render()};
  const A={
    sample:()=>{if(S.subjects.length&&!confirm("Replace your current data with sample data?"))return;seed();toast("Sample data loaded")},
    addSubject:()=>subjForm(null,o=>S.subjects.push({id:uid(),topics:[],...o})),
    editSubject:()=>subjForm(subj(id),o=>Object.assign(subj(id),o)),
    delSubject:()=>{if(confirm("Delete this subject, its topics and tasks?")){S.subjects=S.subjects.filter(s=>s.id!==id);S.tasks=S.tasks.filter(k=>k.sid!==id);S.sessions=S.sessions.filter(k=>k.sid!==id);location.hash="subjects";done()}},
    addTopic:()=>topicForm(null,o=>subj(id).topics.push({id:uid(),name:o.name,diff:o.diff,conf:+o.conf,quiz:o.quiz===""?"":+o.quiz,last:""})),
    editTopic:()=>topicForm(topic(id,b.dataset.t),o=>Object.assign(topic(id,b.dataset.t),{name:o.name,diff:o.diff,conf:+o.conf,quiz:o.quiz===""?"":+o.quiz})),
    delTopic:()=>{const s=subj(id);s.topics=s.topics.filter(t=>t.id!==b.dataset.t);done()},
    addTask:()=>taskForm(null,o=>S.tasks.push({id:uid(),title:o.title,...split(o.on),due:o.due,pri:o.pri,est:+o.est,done:false})),
    editTask:()=>{const k=S.tasks.find(x=>x.id===id);taskForm(k,o=>Object.assign(k,{title:o.title,...split(o.on),due:o.due,pri:o.pri,est:+o.est}))},
    delTask:()=>{S.tasks=S.tasks.filter(k=>k.id!==id);done()},
    toggle:()=>{const k=S.tasks.find(x=>x.id===id);k.done=!k.done;done()},
    addSession:()=>form("Add study session",[{k:"on",l:"Subject / topic",t:"select",o:topicOpts(),v:""},{k:"date",l:"Date",t:"date",r:1,v:TODAY()},{k:"time",l:"Time",t:"time",v:"16:00"},{k:"dur",l:"Duration (min)",t:"number",min:5,v:S.profile.studyMin}],o=>S.sessions.push({id:uid(),...split(o.on),date:o.date,time:o.time,dur:+o.dur,done:false})),
    delSess:()=>{S.sessions=S.sessions.filter(x=>x.id!==id);done()},
    runSess:()=>{const x=S.sessions.find(s=>s.id===id);startTimer(x.sid,x.tid,x.dur,x.id)},
    rec:()=>startTimer(b.dataset.sid,b.dataset.tid,+b.dataset.min),
    wk:()=>{V.off=+b.dataset.n===0?0:(V.off||0)+ +b.dataset.n;render()},
    addGoal:()=>form("Add goal",[{k:"type",l:"Type",t:"select",o:[["minutes","Weekly study hours"],["sessions","Weekly sessions"],["confidence","Topic confidence"]],v:"minutes"},{k:"on",l:"Subject / topic (a topic is needed for confidence goals)",t:"select",o:topicOpts(),v:""},{k:"target",l:"Target (hours, sessions or 1–5)",t:"number",min:1,r:1,v:5}],o=>{const p=split(o.on),n=label(p.sid,p.tid);S.goals.push({id:uid(),type:o.type,...p,target:+o.target,label:o.type==="confidence"?"Reach "+o.target+"/5 in "+n:o.type==="sessions"?"Complete "+o.target+(p.sid?" "+n:"")+" sessions this week":"Study "+o.target+"h"+(p.sid?" of "+n:"")+" this week"})}),
    delGoal:()=>{S.goals=S.goals.filter(g=>g.id!==id);done()},
    tstart:()=>{const v=split($("#tsel").value);if(T.left===T.total){T.total=T.left=Math.max(1,+$("#tmin").value)*60}Object.assign(T,v,{run:true});clearInterval(T.iv);T.iv=setInterval(tick,1000);render()},
    tpause:()=>{T.run=false;clearInterval(T.iv);render()},
    tadd:()=>{T.total+=300;T.left+=300;render()},
    treset:()=>{T.run=false;clearInterval(T.iv);T.left=T.total;render()},
    tfinish:()=>{Object.assign(T,split($("#tsel").value));T.run=false;clearInterval(T.iv);const m=Math.max(1,Math.round((T.total-T.left)/60));
      form("Session complete: "+m+" min",[{k:"r",l:"How productive were you? (1–5)",t:"select",o:[5,4,3,2,1].map(x=>[x,x]),v:4}],o=>{
        const x=T.sess&&S.sessions.find(s=>s.id===T.sess);
        if(x)Object.assign(x,{done:true,min:m,rating:+o.r});else S.sessions.push({id:uid(),sid:T.sid,tid:T.tid,date:TODAY(),time:"",dur:m,min:m,done:true,rating:+o.r});
        const t=topic(T.sid,T.tid);if(t)t.last=TODAY();
        Object.assign(T,{sess:"",total:S.profile.studyMin*60,left:S.profile.studyMin*60});toast("Session saved");location.hash="progress"})}
  };
  A[a]&&A[a]();
});
document.addEventListener("change",e=>{
  if(e.target.id==="tmin"&&!T.run){T.total=T.left=Math.max(1,+e.target.value)*60;$("#clock").textContent=clock()}
  if(e.target.id==="tsel")Object.assign(T,split(e.target.value));
});
