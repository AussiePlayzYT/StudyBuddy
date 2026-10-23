/* Page definitions. Each HTML page sets <body data-page="name"> and the matching function below renders it. */
const Pages={},CFG={};
const bySoon=(a,b)=>(a.due||"9")<(b.due||"9")?-1:(a.due||"9")>(b.due||"9")?1:0;
const parseQs=t=>String(t||"").split("\n").map(l=>{const i=l.indexOf("|");return i>0?{q:l.slice(0,i).trim(),a:l.slice(i+1).trim()}:null}).filter(x=>x&&x.q&&x.a);
const SES=(sid,tid,min,sess)=>`timer.html?${sess?"sess="+sess+"&":""}sid=${sid||""}&tid=${tid||""}&min=${min}`;

/* ---------- Generic list page (add, edit, delete, filter, empty state) ---------- */
const itemHtml=(c,x)=>{
  const r=c.row(x);
  const acts=`${r.btn||""}<button class="btn ghost sm" data-act="edit" data-c="${c.key}" data-id="${x.id}">Edit</button><button class="btn ghost sm" data-act="del" data-c="${c.key}" data-id="${x.id}">Delete</button>`;
  const s=esc((r.t+" "+(r.m||"")).toLowerCase());
  const body=`${r.pre||""}<div class="grow"><b class="${r.done?"done":""}">${esc(r.t)}</b><div class="muted">${esc(r.m||"")}</div>${r.x||""}</div>`;
  return c.grid?`<div class="card rowi ${r.cls||""}" ${r.style?`style="${r.style}"`:""} data-s="${s}" data-sid="${esc(x.sid||"")}">${body}<div class="row l" style="margin-top:10px">${r.tag||""}${acts}</div></div>`
    :`<div class="item rowi ${r.cls||""}" data-s="${s}" data-sid="${esc(x.sid||"")}">${body}${r.tag||""}${acts}</div>`;
};
const collection=c=>{CFG[c.key]=c;return()=>{
  const S=DB.S,need=c.need&&!S[c.need].length;
  const rows=S[c.key].filter(c.filter||(()=>true)).sort(c.sort||(()=>0));
  const add=`<button class="btn" data-act="add" data-c="${c.key}">${c.add}</button>`;
  let html;
  if(need)html=empty(c.needMsg,`<a class="btn" href="${c.needHref}">${c.needLabel}</a>`);
  else if(!rows.length)html=empty(c.empty,add);
  else{
    const f=`<div class="row filt"><label class="sr" for="flt">Filter</label><input id="flt" type="search" placeholder="Filter ${c.t.toLowerCase()}">${c.subj?`<label class="sr" for="fsub">Subject</label><select id="fsub">${subjOpts("All subjects").map(o=>`<option value="${esc(o[0])}">${esc(o[1])}</option>`).join("")}</select>`:""}</div>`;
    const list=rows.map(x=>itemHtml(c,x)).join("");
    html=f+(c.grid?`<div class="grid">${list}</div>`:`<div class="card">${list}</div>`)+`<p id="none" class="muted" hidden>Nothing matches your filter.</p>`;
  }
  return{t:c.t,sub:c.sub?c.sub(rows):"",act:need?"":add,html:(c.top?c.top():"")+html,after(){
    const fl=$("#flt");if(!fl)return;
    const go=()=>{const q=fl.value.toLowerCase(),s=$("#fsub")?$("#fsub").value:"";let n=0;$$(".rowi").forEach(el=>{const ok=el.dataset.s.includes(q)&&(!s||el.dataset.sid===s);el.hidden=!ok;if(ok)n++});$("#none").hidden=n>0};
    fl.oninput=go;if($("#fsub"))$("#fsub").onchange=go;
    if(c.after)c.after();
  }};
}};
function openForm(c,id,pre){
  const x=id?DB.S[c.key].find(o=>o.id===id):null;
  form((x?"Edit ":"Add ")+c.one,c.fields,x?{...x}:{...pre},o=>{
    const m=c.check&&c.check(o);if(m)return m;
    if(x)DB.upd(c.key,id,o);else DB.add(c.key,o);
    toast("Saved");draw();
  });
}
A.add=d=>openForm(CFG[d.c],null,d.sid?{sid:d.sid}:null);
A.edit=d=>openForm(CFG[d.c],d.id);
A.del=d=>ask("This will permanently delete it.","Delete",()=>{DB.del(d.c,d.id);toast("Deleted");draw()});

const PRI=[["High","High"],["Medium","Medium"],["Low","Low"]];
const STAGES=["Planning","Research","Drafting","Editing","Proofreading","Completed"];
const subjName=id=>(Eng.subj(id)||{}).name||"No subject";

Pages.tasks=collection({key:"tasks",one:"task",t:"Tasks",add:"Add task",subj:1,
  empty:"No tasks yet. Add one and it will appear in your planner, dashboard and recommendations.",
  sub:r=>{const o=r.filter(k=>!k.done),od=o.filter(k=>k.due&&daysTo(k.due)<0).length;return o.length+" to do"+(od?" · "+od+" overdue":"")},
  sort:(a,b)=>(!!a.done-!!b.done)||bySoon(a,b),
  fields:[{k:"title",l:"Title",r:1},{k:"st",t:"st",l:"Subject / topic"},{k:"due",t:"date",l:"Due date",r:1,v:TODAY},{k:"pri",t:"select",l:"Priority",o:PRI,v:"Medium"},{k:"est",t:"number",l:"Estimated minutes",min:1,max:1440},{k:"desc",t:"textarea",l:"Notes"}],
  row:k=>({t:k.title,done:k.done,m:`${Eng.label(k.sid,k.tid)} · due ${fmtD(k.due)}${k.est?" · "+k.est+" min":""}`,
    pre:`<input type="checkbox" data-act="tog" data-id="${k.id}" ${k.done?"checked":""} aria-label="Mark ${esc(k.title)} complete">`,
    tag:tag(k.pri||"Medium",k.pri)+(!k.done&&k.due&&daysTo(k.due)<0?tag("Overdue","Overdue"):"")})});
A.tog=d=>{const k=DB.S.tasks.find(x=>x.id===d.id);if(k){DB.upd("tasks",d.id,{done:!k.done,doneAt:!k.done?TODAY():""});draw()}};

Pages.assignments=collection({key:"assignments",one:"assignment",t:"Assignments",add:"Add assignment",subj:1,
  empty:"No assignments yet. Add one to track it from planning through to submission.",
  sub:r=>r.filter(a=>a.stage!=="Completed").length+" in progress",
  sort:(a,b)=>((a.stage==="Completed")-(b.stage==="Completed"))||bySoon(a,b),
  fields:[{k:"title",l:"Title",r:1},{k:"teacher",l:"Teacher"},{k:"st",t:"st",l:"Subject / topic"},{k:"due",t:"date",l:"Due date",r:1,v:TODAY},{k:"stage",t:"select",l:"Stage",o:STAGES.map(s=>[s,s]),v:"Planning"},{k:"desc",t:"textarea",l:"Requirements and notes"}],
  row:a=>{const i=Math.max(0,STAGES.indexOf(a.stage));return{t:a.title,done:a.stage==="Completed",m:`${Eng.label(a.sid,a.tid)} · due ${fmtD(a.due)}${a.teacher?" · "+a.teacher:""}`,x:bar(i/5*100,i===5),tag:tag(a.stage||"Planning",i===5?"Done":""),btn:i<5?`<button class="btn sm" data-act="adv" data-id="${a.id}">Next stage</button>`:""}}});
A.adv=d=>{const a=DB.S.assignments.find(x=>x.id===d.id);if(a){DB.upd("assignments",d.id,{stage:STAGES[Math.min(5,Math.max(0,STAGES.indexOf(a.stage))+1)]});draw()}};

Pages.subjects=collection({key:"subjects",one:"subject",t:"Subjects",add:"Add subject",grid:1,
  sub:()=>"Your subjects, topics and progress",
  empty:"No subjects yet. Add your first subject, then break it into topics.",
  sort:(a,b)=>a.name<b.name?-1:1,
  fields:[{k:"name",l:"Subject name",r:1},{k:"code",l:"Subject code"},{k:"teacher",l:"Teacher"},{k:"color",t:"color",l:"Colour",v:"#0f766e"},{k:"target",l:"Target grade"},{k:"desc",t:"textarea",l:"Description"}],
  row:s=>{const p=Eng.subjProg(s.id),n=DB.S.topics.filter(t=>t.sid===s.id).length;return{t:s.name,style:`border-top:4px solid ${safeCol(s.color)}`,
    m:`${n} topic${n===1?"":"s"} · ${DB.S.tasks.filter(k=>k.sid===s.id&&!k.done).length} open tasks${s.target?" · target "+s.target:""}`,
    x:`<div style="margin-top:8px">${bar(p)}</div><div class="muted">${Math.round(p)}% confidence</div>`,btn:`<a class="btn sm" href="subject.html?id=${s.id}">Open</a>`}}});

const topicFields=[{k:"name",l:"Topic name",r:1},{k:"sid",t:"subj",l:"Subject",none:"Choose a subject",r:1},{k:"diff",t:"select",l:"Difficulty",o:[["Easy","Easy"],["Medium","Medium"],["Hard","Hard"]],v:"Medium"},{k:"conf",t:"select",num:1,l:"Confidence",o:[1,2,3,4,5].map(i=>[i,i+" – "+CONF[i]]),v:1},{k:"quiz",t:"number",l:"Latest quiz average (%)",min:0,max:100},{k:"last",t:"date",l:"Last studied"},{k:"desc",t:"textarea",l:"Description"}];
const topicRow=t=>({t:t.name,m:`${subjName(t.sid)} · ${CONF[+t.conf||1]} · ${t.diff||"Medium"} · last studied ${t.last?fmtD(t.last):"never"}${t.quiz!==""&&t.quiz!=null?" · quiz "+t.quiz+"%":""}`,x:bar((+t.conf||1)*20),btn:`<a class="btn sm" href="${SES(t.sid,t.id,+DB.S.profile.studyMin||45)}">Study</a>`});
Pages.topics=collection({key:"topics",one:"topic",t:"Topics",add:"Add topic",subj:1,need:"subjects",
  needMsg:"Topics live inside subjects. Add a subject first.",needHref:"subjects.html",needLabel:"Add a subject",
  empty:"No topics yet. Add topics such as Algebra or Cells to track your confidence.",
  sub:r=>r.length+" topics",sort:(a,b)=>subjName(a.sid)<subjName(b.sid)?-1:subjName(a.sid)>subjName(b.sid)?1:a.name<b.name?-1:1,
  fields:topicFields,row:topicRow});

Pages.notes=collection({key:"notes",one:"note",t:"Notes",add:"Add note",subj:1,
  empty:"No notes yet. Write your first note for a subject or topic.",sub:r=>r.length+" notes",
  sort:(a,b)=>(!!b.pinned-!!a.pinned)||(a.title<b.title?-1:1),
  fields:[{k:"title",l:"Title",r:1},{k:"st",t:"st",l:"Subject / topic"},{k:"body",t:"textarea",l:"Note"},{k:"pinned",t:"check",l:"Pin to top"}],
  row:n=>({t:n.title,m:Eng.label(n.sid,n.tid),x:n.body?`<div class="muted" style="white-space:pre-wrap">${esc(n.body.slice(0,200))}${n.body.length>200?"…":""}</div>`:"",tag:n.pinned?tag("Pinned"):""})});

Pages.resources=collection({key:"resources",one:"resource",t:"Resources",add:"Add resource",subj:1,
  empty:"No resources yet. Save links to videos, websites, worksheets and textbooks.",sub:r=>r.length+" saved",
  sort:(a,b)=>a.title<b.title?-1:1,
  fields:[{k:"title",l:"Title",r:1},{k:"url",t:"url",l:"Link (https://…)"},{k:"type",t:"select",l:"Type",o:["Link","Video","PDF","Document","Presentation","Worksheet","Textbook","Other"].map(x=>[x,x])},{k:"st",t:"st",l:"Subject / topic"}],
  check:o=>o.url&&!safeUrl(o.url)?"Links must start with http:// or https://":"",
  row:r=>({t:r.title,m:`${r.type||"Link"} · ${Eng.label(r.sid,r.tid)}`,x:safeUrl(r.url)?`<a href="${esc(safeUrl(r.url))}" target="_blank" rel="noopener noreferrer">Open link</a>`:""})});

const COLORS=[["yellow","Yellow"],["green","Green"],["blue","Blue"],["pink","Pink"]];
const stickyFields=[{k:"text",t:"textarea",l:"Note",r:1},{k:"color",t:"select",l:"Colour",o:COLORS,v:"yellow"},{k:"pinned",t:"check",l:"Pin to top"}];
Pages["sticky-notes"]=collection({key:"stickies",one:"sticky note",t:"Sticky notes",add:"Add sticky note",grid:1,
  empty:"No sticky notes yet. Jot down quick reminders here or from the dashboard.",sub:()=>"Quick reminders",
  sort:(a,b)=>!!b.pinned-!!a.pinned,fields:stickyFields,
  row:s=>({t:s.text,cls:"sticky "+(s.color||"yellow"),tag:s.pinned?tag("Pinned"):""})});

Pages.quizzes=collection({key:"quizzes",one:"quiz",t:"Quizzes",add:"Create quiz",subj:1,
  empty:"No quizzes yet. Create one with questions and answers, then test yourself.",sub:r=>r.length+" quizzes",
  sort:(a,b)=>a.title<b.title?-1:1,
  fields:[{k:"title",l:"Quiz title",r:1},{k:"st",t:"st",l:"Subject / topic"},{k:"text",t:"textarea",l:"Questions: one per line, as Question | Answer",p:"What is 2 + 2? | 4",r:1}],
  check:o=>parseQs(o.text).length?"":"Add at least one question in the form: Question | Answer",
  row:q=>{const r=DB.S.results.filter(x=>x.qid===q.id&&!x.exam).pop(),n=parseQs(q.text).length;return{t:q.title,m:`${n} question${n===1?"":"s"} · ${Eng.label(q.sid,q.tid)}${r?" · last score "+Math.round(r.score/r.total*100)+"%":""}`,btn:`<a class="btn sm" href="quiz.html?id=${q.id}">Start</a>`}}});

Pages.exams=collection({key:"exams",one:"exam",t:"Exams",add:"Add exam",
  empty:"No exams yet. Add one to get a countdown and a revision plan.",sub:r=>r.filter(e=>e.date&&daysTo(e.date)>=0).length+" upcoming",
  sort:(a,b)=>a.date<b.date?-1:1,
  fields:[{k:"name",l:"Exam name",r:1},{k:"sid",t:"subj",l:"Subject"},{k:"date",t:"date",l:"Date",r:1},{k:"time",t:"time",l:"Time"},{k:"location",l:"Location"},{k:"weight",t:"number",l:"Weighting (%)",min:0,max:100},{k:"target",l:"Target grade"}],
  row:e=>{const d=daysTo(e.date);return{t:e.name,m:`${subjName(e.sid)} · ${fmtD(e.date)}${e.time?" "+e.time:""}${e.location?" · "+e.location:""}${e.weight?" · "+e.weight+"%":""}`,tag:tag(d<0?"Past":d===0?"Today":d+" day"+(d===1?"":"s"),d<=7&&d>=0?"High":""),btn:d>=2?`<button class="btn sm" data-act="plan" data-id="${e.id}">Plan revision</button>`:""}}});
A.plan=d=>{
  const S=DB.S,e=S.exams.find(x=>x.id===d.id),tp=S.topics.filter(t=>t.sid===e.sid),days=daysTo(e.date);
  if(!tp.length){toast(e.sid?"Add topics to this subject first.":"Choose a subject for this exam, then add topics.");return}
  const T={morning:"09:00",afternoon:"15:00",evening:"19:00",night:"21:00",any:"16:00"}[S.profile.prefTime]||"16:00";
  const sorted=[...tp].sort((a,b)=>(+a.conf||1)-(+b.conf||1));let n=0;
  for(let i=0;i<Math.min(days-1,14);i++){const t=sorted[i%sorted.length],date=addDays(TODAY(),i+1);
    if(!S.sessions.some(s=>s.sid===e.sid&&s.tid===t.id&&s.date===date)){DB.add("sessions",{sid:e.sid,tid:t.id,date,time:T,dur:+S.profile.studyMin||45,min:0,done:false});n++}}
  toast(n?`Added ${n} revision session${n===1?"":"s"} to your planner, weakest topics first.`:"Your planner already has these sessions.");
};

const GK=[["minutes","Study minutes"],["sessions","Study sessions"],["tasks","Tasks completed"]],GP=[["day","Daily"],["week","Weekly"],["month","Monthly"]];
const goalVal=g=>{
  const t=TODAY(),from=g.period==="day"?t:g.period==="week"?monday(t):t.slice(0,8)+"01",to=g.period==="day"?t:g.period==="week"?addDays(from,6):t.slice(0,8)+"31";
  if(g.kind==="minutes")return Eng.mins(from,to,g.sid);
  if(g.kind==="sessions")return Eng.sessCount(from,to,g.sid);
  return DB.S.tasks.filter(k=>k.done&&k.doneAt>=from&&k.doneAt<=to&&(!g.sid||k.sid===g.sid)).length;
};
const goalCard=(title,v,target,unit)=>`<div class="card"><h2>${esc(title)}</h2>${bar(target?v/target*100:0,v>=target)}<p class="muted">${v} / ${target} ${unit}${v>=target?" · goal reached":""}</p></div>`;
Pages.goals=collection({key:"goals",one:"goal",t:"Goals",add:"Add goal",
  sub:()=>"Targets for study time, sessions and tasks",empty:"No custom goals yet. Add one, for example “Study 5 hours this week”.",
  top:()=>{const p=DB.S.profile,t=TODAY(),w=monday(t);return`<div class="grid" style="margin-bottom:16px">${goalCard("Daily study goal",Eng.mins(t,t),+p.dailyGoal||0,"min")}${goalCard("Weekly study goal",Math.round(Eng.mins(w,addDays(w,6))/6)/10,+p.weeklyGoal||0,"hours")}</div><p class="muted">Change these two on your <a href="profile.html">profile</a>.</p>`},
  fields:[{k:"title",l:"Goal",r:1},{k:"kind",t:"select",l:"Measure",o:GK,v:"minutes"},{k:"period",t:"select",l:"Period",o:GP,v:"week"},{k:"target",t:"number",l:"Target amount",r:1,min:1,max:100000},{k:"sid",t:"subj",l:"Subject",none:"All subjects"}],
  row:g=>{const v=goalVal(g),u=g.kind==="minutes"?"min":g.kind==="sessions"?"sessions":"tasks";return{t:g.title,m:`${GP.find(x=>x[0]===g.period)[1]} · ${subjName(g.sid).replace("No subject","All subjects")}`,x:bar(g.target?v/g.target*100:0,v>=g.target)+`<div class="muted">${v} / ${g.target} ${u}</div>`,tag:v>=g.target?tag("Done","Done"):""}}});
/* ---------- Dashboard, planner, calendar, timer ---------- */
const recRow=r=>`<div class="item"><div class="grow"><b>${esc(r.title)}</b><div class="muted">${esc(r.why.join(" · ")||"Keep your revision ticking over")}</div></div><span class="muted">${r.min} min</span><a class="btn sm" href="${r.href||SES(r.sid,r.tid,r.min)}">${r.href?"Open":"Start session"}</a></div>`;
const dueRow=k=>`<div class="item"><div class="grow"><a href="${k.page}">${esc(k.title)}</a><div class="muted">${esc(Eng.label(k.sid,k.tid))} · ${k.due<TODAY()?"overdue since":"due"} ${fmtD(k.due)}</div></div></div>`;

Pages.dashboard=()=>{
  const S=DB.S,p=S.profile,t=TODAY(),h=new Date().getHours(),done=Eng.mins(t,t),goal=+p.dailyGoal||0,w=monday(t);
  const name=(p.name||Auth.user().name||"").split(" ")[0];
  const due=Eng.dues().filter(k=>!k.done&&k.due&&k.due<=t).sort(bySoon);
  const up=[...Eng.dues().filter(k=>!k.done&&k.due>t&&daysTo(k.due)<=14).map(k=>({d:k.due,t:k.title,href:k.page})),
    ...S.exams.filter(e=>e.date>=t&&daysTo(e.date)<=30).map(e=>({d:e.date,t:e.name+" (exam)",href:"exams.html"}))].sort((a,b)=>a.d<b.d?-1:1).slice(0,5);
  const rec=Eng.recommend(3);
  const start=!S.subjects.length?`<div class="card span"><h2>Get set up</h2><ol style="margin:0;padding-left:20px"><li><a href="subjects.html">Add your subjects</a></li><li><a href="topics.html">Break them into topics</a> and rate your confidence</li><li><a href="tasks.html">Add a task</a> or <a href="timer.html">start a study session</a></li></ol><p class="muted" style="margin-top:8px">Your recommendations appear here as soon as you have topics.</p></div>`:"";
  return{t:`Good ${h<12?"morning":h<18?"afternoon":"evening"}${name?", "+esc(name):""}`,crumb:["Dashboard"],
    sub:new Date().toLocaleDateString(undefined,{weekday:"long",day:"numeric",month:"long",year:"numeric"}),
    html:`<div class="grid">${start}
    <div class="card"><h2>Today’s progress</h2>${bar(goal?done/goal*100:0,goal&&done>=goal)}<p class="muted">${done} / ${goal} minutes</p></div>
    <div class="card"><h2>Study streak</h2><div class="stat">${Eng.streak()} day${Eng.streak()===1?"":"s"}</div><p class="muted">This week: ${hm(Eng.mins(w,addDays(w,6)))}</p></div>
    <div class="card"><h2>Quick actions</h2><div class="row l"><a class="btn sm" href="tasks.html">Add task</a><a class="btn sm" href="planner.html">Plan session</a><a class="btn sm" href="timer.html">Start timer</a><a class="btn sm" href="subjects.html">Add subject</a></div>
      <form id="qn" style="margin-top:12px" class="row l"><label class="sr" for="qnt">Quick note</label><input id="qnt" style="flex:1;margin:0;min-width:140px" maxlength="300" placeholder="Quick note…"><button class="btn sm">Save</button></form></div>
    <div class="card"><h2>Due today and overdue</h2>${due.length?due.map(dueRow).join(""):'<p class="muted">Nothing due.</p>'}</div>
    <div class="card"><h2>Upcoming</h2>${up.length?up.map(u=>`<div class="item"><div class="grow"><a href="${u.href}">${esc(u.t)}</a></div>${tag(daysTo(u.d)+" day"+(daysTo(u.d)===1?"":"s"))}</div>`).join(""):'<p class="muted">Nothing coming up.</p>'}</div>
    <div class="card span"><h2>What should I study now?</h2>${rec.length?rec.map(recRow).join(""):'<p class="muted">Add subjects and topics to get recommendations.</p>'}</div></div>`,
    after(){const f=$("#qn");if(f)f.onsubmit=e=>{e.preventDefault();const v=$("#qnt").value.trim();if(!v)return;DB.add("stickies",{text:v,color:"yellow",pinned:false});toast("Saved to sticky notes");draw()}}};
};

let off=0,moff=0;
const chips=d=>{
  const S=DB.S;
  const ss=S.sessions.filter(x=>x.date===d).sort((a,b)=>(a.time||"")<(b.time||"")?-1:1).map(x=>{const missed=!x.done&&d<TODAY();
    return`<span class="chip ${missed?"x":""}"><span class="${x.done?"done":""}">${esc(x.time||"")} ${esc(Eng.label(x.sid,x.tid))}</span><br><span class="muted">${x.done?x.min:x.dur} min${missed?" · missed":""}</span><br>${x.done?"":missed?`<button class="btn sm" data-act="resched" data-id="${x.id}">Move to today</button> `:`<a class="btn sm" href="${SES(x.sid,x.tid,x.dur,x.id)}">Start</a> `}<button class="btn ghost sm" data-act="delsess" data-id="${x.id}" aria-label="Delete session">×</button></span>`}).join("");
  const ds=Eng.dues().filter(k=>k.due===d).map(k=>`<span class="chip t"><a href="${k.page}" class="${k.done?"done":""}">Due: ${esc(k.title)}</a></span>`).join("");
  const ex=S.exams.filter(e=>e.date===d).map(e=>`<span class="chip x"><a href="exams.html"><b>${esc(e.name)}</b></a></span>`).join("");
  return ss+ds+ex;
};
A.delsess=d=>{DB.del("sessions",d.id);draw()};
A.resched=d=>{DB.upd("sessions",d.id,{date:TODAY()});toast("Moved to today");draw()};
A.addsess=()=>{
  const p=DB.S.profile,T={morning:"09:00",afternoon:"15:00",evening:"19:00",night:"21:00",any:"16:00"}[p.prefTime]||"16:00";
  form("Add study session",[{k:"st",t:"st",l:"Subject / topic"},{k:"date",t:"date",l:"Date",r:1,v:TODAY},{k:"time",t:"time",l:"Start time",v:T},{k:"dur",t:"number",l:"Duration (minutes)",r:1,min:1,max:480,v:+p.studyMin||45}],{},o=>{
    DB.add("sessions",{sid:o.sid,tid:o.tid,date:o.date,time:o.time,dur:o.dur,min:0,done:false});toast("Session added");draw();
  });
};
A.wk=d=>{off=+d.n?off+ +d.n:0;draw()};
A.mo=d=>{moff=+d.n?moff+ +d.n:0;draw()};
const navBtns=a=>`<button class="btn ghost sm" data-act="${a}" data-n="-1">Previous</button><button class="btn ghost sm" data-act="${a}" data-n="0">Today</button><button class="btn ghost sm" data-act="${a}" data-n="1">Next</button>`;
Pages.planner=()=>{
  const ws=addDays(monday(TODAY()),off*7),days=[...Array(7)].map((_,i)=>addDays(ws,i));
  return{t:"Planner",sub:"Week of "+fmtD(ws),act:navBtns("wk")+`<button class="btn sm" data-act="addsess">Add study session</button>`,
    html:`<div class="week">${days.map(d=>`<div class="day ${d===TODAY()?"today":""}"><b>${dt(d).toLocaleDateString(undefined,{weekday:"short"})} ${dt(d).getDate()}</b>${chips(d)}</div>`).join("")}</div>
    <p class="muted" style="margin-top:12px">Sessions, task and assignment deadlines and exams appear here. Missed sessions can be moved to today.</p>`};
};
Pages.calendar=()=>{
  const b=dt(TODAY());b.setDate(1);b.setMonth(b.getMonth()+moff);
  const first=iso(b),ym=first.slice(0,7),start=monday(first),cells=[...Array(42)].map((_,i)=>addDays(start,i)).filter((d,i)=>i<35||d.slice(0,7)===ym||addDays(start,35).slice(0,7)===ym);
  const heads=[...Array(7)].map((_,i)=>dt(addDays("2024-01-01",i)).toLocaleDateString(undefined,{weekday:"short"}));
  return{t:"Calendar",sub:b.toLocaleDateString(undefined,{month:"long",year:"numeric"}),act:navBtns("mo")+`<button class="btn sm" data-act="addsess">Add study session</button>`,
    html:`<div class="week" role="group" aria-label="Month view">${heads.map(h=>`<div class="muted"><b>${h}</b></div>`).join("")}${cells.map(d=>`<div class="day ${d===TODAY()?"today":""} ${d.slice(0,7)!==ym?"off":""}"><b>${dt(d).getDate()}</b>${chips(d)}</div>`).join("")}</div>`};
};

/* ---------- Study timer ---------- */
const mmss=s=>String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0");
const tcur=()=>Tm.get()||{sid:"",tid:"",sess:"",total:(+DB.S.profile.studyMin||45)*60,left:(+DB.S.profile.studyMin||45)*60,end:0};
let tv=null;
Pages.timer=()=>{
  const q=new URLSearchParams(location.search);
  if(q.has("sid")||q.has("min")||q.has("sess")){
    const m=clamp(+q.get("min")||+DB.S.profile.studyMin||45,1,240);
    Tm.set({sid:q.get("sid")||"",tid:q.get("tid")||"",sess:q.get("sess")||"",total:m*60,left:m*60,end:0});
    history.replaceState(null,"","timer.html");
  }
  const s=tcur(),l=Tm.left(s),started=s.end||l<s.total,run=!!s.end;
  return{t:"Study timer",sub:`Pick what you’re studying, then start. Suggested break after a session: ${DB.S.profile.breakMin||10} min.`,
    html:`<div class="card" style="max-width:520px"><label>Studying<select id="tsel" ${started?"disabled":""}>${Eng.stOpts().map(o=>`<option value="${esc(o[0])}" ${o[0]===s.sid+":"+s.tid?"selected":""}>${esc(o[1])}</option>`).join("")}</select></label>
    <label>Minutes<input id="tmin" type="number" min="1" max="240" value="${Math.round(s.total/60)}" ${started?"disabled":""}></label>
    <div class="big" id="clock" role="timer">${mmss(l)}</div>${bar(s.total?(1-l/s.total)*100:0)}
    <div class="row" style="margin-top:14px;justify-content:center">${run?'<button class="btn" data-act="tpause">Pause</button>':`<button class="btn" data-act="tstart" ${l<=0?"disabled":""}>${started?"Resume":"Start"}</button>`}<button class="btn ghost" data-act="tadd">Add 5 min</button><button class="btn ghost" data-act="treset">Reset</button><button class="btn ghost" data-act="tfinish">Finish session</button></div></div>`,
    after(){
      clearInterval(tv);const c=tcur();if(!c.end)return;
      tv=setInterval(()=>{const x=tcur(),l=Tm.left(x);if($("#clock"))$("#clock").textContent=mmss(l);document.title=mmss(l)+" · Study timer";
        if(l<=0){clearInterval(tv);A.tpause();toast("Time’s up. Finish the session to save it.")}},500);
    }};
};
A.tstart=()=>{
  const s=tcur(),l=Tm.left(s);
  if(!(s.end||l<s.total)){const[a,b]=($("#tsel").value||":").split(":");s.sid=a;s.tid=b||"";s.total=s.left=clamp(+$("#tmin").value||45,1,240)*60}
  s.end=Date.now()+Tm.left(s)*1000;Tm.set(s);draw();
};
A.tpause=()=>{const s=tcur();s.left=Tm.left(s);s.end=0;Tm.set(s);draw()};
A.tadd=()=>{const s=tcur();if(s.end)s.end+=3e5;else s.left+=300;s.total+=300;Tm.set(s);draw()};
A.treset=()=>{clearInterval(tv);Tm.set(null);draw()};
A.tfinish=()=>{
  const s=tcur(),el=s.total-Tm.left(s);
  if(el<30){toast("Run the timer for at least 30 seconds to save a session.");return}
  s.left=Tm.left(s);s.end=0;Tm.set(s);
  form("Session complete",[{k:"rating",t:"select",num:1,l:"How productive were you? (1 low, 5 high)",o:[1,2,3,4,5].map(i=>[i,String(i)]),v:4}],{},o=>{
    const min=Math.max(1,Math.round(el/60)),n=new Date(),tm=String(n.getHours()).padStart(2,"0")+":"+String(n.getMinutes()).padStart(2,"0");
    const ex=s.sess&&DB.S.sessions.find(x=>x.id===s.sess);
    if(ex)DB.upd("sessions",s.sess,{done:true,min,rating:o.rating,date:TODAY()});
    else DB.add("sessions",{sid:s.sid,tid:s.tid,date:TODAY(),time:tm,dur:min,min,done:true,rating:o.rating});
    if(s.tid&&Eng.topic(s.tid))DB.upd("topics",s.tid,{last:TODAY()});
    clearInterval(tv);Tm.set(null);toast(`Saved ${min} minute session`);draw();
  });
};

/* ---------- Subject page ---------- */
Pages.subject=()=>{
  const id=new URLSearchParams(location.search).get("id"),s=Eng.subj(id);
  if(!s)return{t:"Subject",crumb:[["subjects.html","Subjects"],"Not found"],html:empty("That subject doesn’t exist.",`<a class="btn" href="subjects.html">Back to subjects</a>`)};
  const S=DB.S,tp=S.topics.filter(t=>t.sid===id),ex=Eng.nextExam(id),p=Eng.subjProg(id);
  const cnt=(k,l,pg)=>`<a class="btn ghost sm" href="${pg}.html">${S[k].filter(x=>x.sid===id).length} ${l}</a>`;
  return{t:s.name,crumb:[["subjects.html","Subjects"],s.name],sub:esc([s.code,s.teacher,s.target&&"target "+s.target].filter(Boolean).join(" · ")||"No details yet")+(ex?` · next exam ${fmtD(ex.date)}`:""),
    act:`<button class="btn ghost sm" data-act="editsub" data-id="${id}">Edit subject</button><button class="btn dango sm" data-act="delsub" data-id="${id}">Delete</button><button class="btn sm" data-act="add" data-c="topics" data-sid="${id}">Add topic</button>`,
    html:`<div class="card"><div class="muted" style="margin-bottom:6px">Overall confidence ${Math.round(p)}% · ${hm(Eng.mins("0000","9999",id))} studied</div>${bar(p)}${s.desc?`<p>${esc(s.desc)}</p>`:""}</div>
    <div class="card"><h2>Topics</h2>${tp.length?tp.map(t=>itemHtml(CFG.topics,t)).join(""):'<p class="muted">Add topics such as Algebra or Cells to track them.</p>'}</div>
    <div class="card"><h2>Open tasks</h2>${Eng.dues().filter(k=>k.sid===id&&!k.done).map(dueRow).join("")||'<p class="muted">No open tasks.</p>'}</div>
    <div class="card"><h2>Everything for this subject</h2><div class="row l">${cnt("notes","notes","notes")}${cnt("resources","resources","resources")}${cnt("quizzes","quizzes","quizzes")}${cnt("cards","flashcards","flashcards")}${cnt("exams","exams","exams")}${cnt("goals","goals","goals")}</div></div>`};
};
A.editsub=d=>openForm(CFG.subjects,d.id);
A.delsub=d=>ask("This deletes the subject and its topics. Tasks, notes and other items stay but lose their subject.","Delete",()=>{DB.del("subjects",d.id);location.href="subjects.html"});

/* ---------- Progress, analytics, achievements ---------- */
Pages.progress=()=>{
  const S=DB.S,all=S.sessions.filter(x=>x.done),tot=all.reduce((a,x)=>a+(+x.min||0),0),du=Eng.dues(),dn=du.filter(k=>k.done).length,od=du.filter(k=>!k.done&&k.due&&daysTo(k.due)<0).length;
  const subs=S.subjects.map(s=>{const k=du.filter(x=>x.sid===s.id),d=k.filter(x=>x.done).length,m=Eng.mins("0000","9999",s.id);
    return`<div class="card"><h2>${esc(s.name)}</h2><p class="muted">Study time ${hm(m)}</p><p class="muted" style="margin:6px 0 2px">Tasks ${d}/${k.length}</p>${bar(k.length?d/k.length*100:0,k.length&&d===k.length)}<p class="muted" style="margin:6px 0 2px">Topic confidence</p>${bar(Eng.subjProg(s.id))}</div>`}).join("");
  return{t:"Progress",sub:"Totals across everything you’ve logged",
    html:`<div class="grid"><div class="card"><h2>Total study time</h2><div class="stat">${hm(tot)}</div></div><div class="card"><h2>Study sessions</h2><div class="stat">${all.length}</div></div><div class="card"><h2>Tasks completed</h2><div class="stat">${dn}</div></div><div class="card"><h2>Tasks overdue</h2><div class="stat" style="${od?"color:var(--danger)":""}">${od}</div></div></div>
    <h2 style="margin:20px 0 10px">By subject</h2>${subs?`<div class="grid">${subs}</div>`:empty("Add subjects and study sessions to see progress here.",`<a class="btn" href="subjects.html">Add a subject</a>`)}`};
};
Pages.analytics=()=>{
  const S=DB.S,t=TODAY(),days=[...Array(7)].map((_,i)=>addDays(t,i-6)),v=days.map(d=>Eng.mins(d,d)),mx=Math.max(1,...v);
  const all=S.sessions.filter(x=>x.done),avg=all.length?Math.round(all.reduce((a,x)=>a+x.min,0)/all.length):0,rated=all.filter(x=>x.rating),pr=rated.length?(rated.reduce((a,x)=>a+x.rating,0)/rated.length).toFixed(1):"–";
  const tp=[...S.topics].sort((a,b)=>(+a.conf||1)-(+b.conf||1)||((a.quiz===""?101:a.quiz)-(b.quiz===""?101:b.quiz)));
  const li=(arr)=>arr.length?arr.map(x=>`<div class="item"><div class="grow">${esc(Eng.label(x.sid,x.id))}</div>${tag(CONF[+x.conf||1])}</div>`).join(""):'<p class="muted">Add topics to see this.</p>';
  const qr=S.results.length?Math.round(S.results.reduce((a,x)=>a+x.score/x.total*100,0)/S.results.length):null;
  return{t:"Analytics",sub:"Your last 7 days and where to focus",
    html:`<div class="card"><h2>Study minutes, last 7 days</h2><div class="chart" role="img" aria-label="${days.map((d,i)=>dt(d).toLocaleDateString(undefined,{weekday:"short"})+" "+v[i]+" minutes").join(", ")}">${days.map((d,i)=>`<div><span>${v[i]}</span><i style="height:${v[i]/mx*100*.75}%"></i><span>${dt(d).toLocaleDateString(undefined,{weekday:"short"}).slice(0,3)}</span></div>`).join("")}</div></div>
    <div class="grid" style="margin-top:16px"><div class="card"><h2>Average session</h2><div class="stat">${avg} min</div></div><div class="card"><h2>Average productivity</h2><div class="stat">${pr}${pr==="–"?"":" / 5"}</div></div><div class="card"><h2>Quiz average</h2><div class="stat">${qr==null?"–":qr+"%"}</div></div>
    <div class="card"><h2>Needs attention</h2>${li(tp.slice(0,3))}</div><div class="card"><h2>Strongest topics</h2>${li([...tp].reverse().slice(0,3))}</div></div>`};
};
Pages.achievements=()=>{
  const S=DB.S,all=S.sessions.filter(x=>x.done),tot=all.reduce((a,x)=>a+(+x.min||0),0),st=Eng.streak();
  const L=[["First study session","Complete a timed session",all.length>=1],["10 hours studied","Log 10 hours in total",tot>=600],["50 hours studied","Log 50 hours in total",tot>=3000],["3-day streak","Study three days in a row",st>=3],["7-day streak","Study seven days in a row",st>=7],["First subject","Add a subject",S.subjects.length>=1],["Five tasks done","Complete five tasks",S.tasks.filter(k=>k.done).length>=5],["First quiz","Finish a quiz",S.results.length>=1],["Perfect score","Score 100% on a quiz",S.results.some(r=>r.score===r.total)],["Card collector","Create 20 flashcards",S.cards.length>=20]];
  const n=L.filter(x=>x[2]).length;
  return{t:"Achievements",sub:`${n} of ${L.length} earned`,html:`<div class="grid">${L.map(([a,b,ok])=>`<div class="card ach ${ok?"on":""}"><h2>${a}</h2><p class="muted">${b}</p>${ok?tag("Earned","Done"):tag("Locked")}</div>`).join("")}</div>`};
};

/* ---------- Recommendations and notifications ---------- */
Pages.recommendations=()=>{
  const r=Eng.recommend(8);
  return{t:"Recommendations",sub:"Ranked by deadlines, exams, confidence, quiz results and time since you last studied",
    html:r.length?`<div class="card">${r.map(recRow).join("")}</div>`:empty("Nothing to recommend yet. Add subjects, topics, tasks or exams and your priorities appear here.",`<a class="btn" href="subjects.html">Add a subject</a>`)};
};
Pages.notifications=()=>{
  const a=Eng.alerts(),on=DB.S.settings.reminders;
  return{t:"Notifications",sub:on?"Reminders based on your deadlines, exams, sessions and cards":"Reminders are turned off in settings",
    html:!on?empty("Reminders are off.",`<a class="btn" href="settings.html">Open settings</a>`):a.length?`<div class="card">${a.map(x=>`<div class="item"><div class="grow"><a href="${x.href}">${esc(x.t)}</a></div>${tag(x.lvl,x.lvl)}</div>`).join("")}</div>`:empty("You’re all caught up.")};
};
/* ---------- Flashcards ---------- */
let FR=null;
Pages.flashcards=collection({key:"cards",one:"flashcard",t:"Flashcards",add:"Add flashcard",subj:1,
  empty:"No flashcards yet. Add a question and answer, then review them with spaced repetition.",
  sub:r=>r.length+" cards · "+Eng.cardsDue().length+" due",sort:(a,b)=>a.front<b.front?-1:1,
  fields:[{k:"front",t:"textarea",l:"Front (question)",r:1},{k:"back",t:"textarea",l:"Back (answer)",r:1},{k:"st",t:"st",l:"Subject / topic"}],
  row:c=>({t:c.front,m:`${(c.back||"").slice(0,80)} · ${Eng.label(c.sid,c.tid)} · due ${c.due&&c.due>TODAY()?fmtD(c.due):"now"}`}),
  top:()=>{
    if(!DB.S.cards.length)return"";
    const due=Eng.cardsDue();
    if(!FR)return`<div class="card row" style="margin-bottom:16px"><div><h2 style="margin:0">Review</h2><p class="muted" style="margin:0">${due.length} card${due.length===1?"":"s"} due today</p></div><button class="btn" data-act="revstart" ${due.length?"":"disabled"}>Start review</button></div>`;
    const c=DB.S.cards.find(x=>x.id===FR.q[0]);
    return`<div class="card" style="margin-bottom:16px"><div class="row"><span class="muted">${FR.q.length} left</span><button class="btn ghost sm" data-act="revend">End review</button></div><div class="fcard" aria-live="polite">${esc(c.front)}${FR.shown?`<hr><b>${esc(c.back)}</b>`:""}</div><div class="row" style="justify-content:center">${FR.shown?["again","hard","good","easy"].map(r=>`<button class="btn ${r==="again"?"dango":"ghost"}" data-act="rate" data-r="${r}">${r[0].toUpperCase()+r.slice(1)}</button>`).join(""):'<button class="btn" data-act="show">Show answer</button>'}</div></div>`;
  }});
A.revstart=()=>{FR={q:Eng.cardsDue().map(c=>c.id),shown:false};draw()};
A.revend=()=>{FR=null;draw()};
A.show=()=>{FR.shown=true;draw()};
A.rate=d=>{
  const id=FR.q[0],c=DB.S.cards.find(x=>x.id===id),I=[1,3,7,14,30];
  if(!c)FR.q.shift();
  else if(d.r==="again"){DB.upd("cards",id,{box:0,due:TODAY()});FR.q.push(FR.q.shift())}
  else{const b=(+c.box||0)+(d.r==="hard"?0:d.r==="good"?1:2);DB.upd("cards",id,{box:b,due:addDays(TODAY(),d.r==="hard"?1:I[Math.min(b,4)])});FR.q.shift()}
  FR.shown=false;if(!FR.q.length){FR=null;toast("Review complete")}draw();
};

/* ---------- Quiz and exam mode ---------- */
let QR=null,EX=null,xv=null;
const norm=s=>String(s).toLowerCase().replace(/[.,!?;:"']/g," ").replace(/\s+/g," ").trim();
const shuffle=n=>{const a=[...Array(n).keys()];for(let i=n-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const qid=()=>new URLSearchParams(location.search).get("id");
function finishQuiz(q,exam,fd){
  const rows=parseQs(q.text).map((x,i)=>{const g=String(fd.get("a"+i)||"");return{q:x.q,a:x.a,g,ok:norm(g)===norm(x.a)}});
  const score=rows.filter(r=>r.ok).length;
  DB.add("results",{qid:q.id,sid:q.sid||"",tid:q.tid||"",date:TODAY(),score,total:rows.length,exam:!!exam});
  if(q.tid&&Eng.topic(q.tid))DB.upd("topics",q.tid,{quiz:Eng.quizAvg(q.tid),last:TODAY()});
  QR={id:q.id,exam,score,total:rows.length,rows};EX=null;clearInterval(xv);draw();
}
const quizList=exam=>{
  const Q=DB.S.quizzes;
  return{t:exam?"Exam mode":"Quiz",html:Q.length?`<div class="card">${Q.map(q=>`<div class="item"><div class="grow"><b>${esc(q.title)}</b><div class="muted">${parseQs(q.text).length} questions</div></div><a class="btn sm" href="${exam?"exam-mode":"quiz"}.html?id=${q.id}">${exam?"Start exam":"Start"}</a></div>`).join("")}</div>`:empty("You need a quiz first. Create one with questions and answers.",`<a class="btn" href="quizzes.html">Create a quiz</a>`),
    sub:exam?"Timed, shuffled, no hints. Answers are shown after you submit.":"Pick a quiz to take"};
};
const quizPage=exam=>()=>{
  const q=DB.S.quizzes.find(x=>x.id===qid());
  if(!q)return quizList(exam);
  const qs=parseQs(q.text),pg=exam?"exam-mode":"quiz",crumb=[[exam?"exam-mode.html":"quizzes.html",exam?"Exam mode":"Quizzes"],q.title];
  if(QR&&QR.id===q.id&&QR.exam===exam){
    const pc=Math.round(QR.score/QR.total*100);
    return{t:q.title,crumb,sub:"Results",act:`<button class="btn" data-act="retry">Try again</button><a class="btn ghost" href="${exam?"exam-mode":"quizzes"}.html">Back</a>`,
      html:`<div class="card"><div class="stat">${QR.score} / ${QR.total} (${pc}%)</div><p class="muted">${pc>=80?"Strong result.":pc>=50?"Getting there. Review the ones you missed.":"Worth revising this topic."} Your topic’s quiz average and recommendations have been updated.</p></div>
      <div class="card" style="margin-top:16px">${QR.rows.map((r,i)=>`<div class="item"><div class="grow"><b>${i+1}. ${esc(r.q)}</b><div class="muted">Your answer: ${esc(r.g||"(blank)")}${r.ok?"":" · Correct: "+esc(r.a)}</div></div>${tag(r.ok?"Correct":"Incorrect",r.ok?"Done":"High")}</div>`).join("")}</div>`};
  }
  if(exam&&!(EX&&EX.id===q.id))return{t:q.title,crumb,sub:`${qs.length} questions · ${Math.max(1,qs.length)} minute${qs.length===1?"":"s"} · no hints`,html:`<div class="card empty"><p>The timer starts when you begin. Questions are shuffled and answers are shown after you submit.</p><button class="btn" data-act="exbegin">Begin exam</button></div>`};
  const order=exam?EX.order:[...qs.keys()];
  return{t:q.title,crumb,sub:exam?"":`${qs.length} questions. Type each answer, then submit.`,
    html:`${exam?'<div class="card"><div class="big" id="exclock" role="timer"></div></div><br>':""}<form id="qf" class="card">${order.map((i,n)=>`<label for="a${i}"><b style="color:var(--text)">${n+1}. ${esc(qs[i].q)}</b><input id="a${i}" name="a${i}" autocomplete="off"></label>`).join("")}<button class="btn">Submit answers</button></form>`,
    after(){
      $("#qf").onsubmit=e=>{e.preventDefault();finishQuiz(q,exam,new FormData(e.target))};
      clearInterval(xv);
      if(exam)xv=setInterval(()=>{const l=Math.max(0,Math.ceil((EX.end-Date.now())/1000));$("#exclock").textContent=mmss(l);if(l<=0){clearInterval(xv);$("#qf").requestSubmit()}},250);
    }};
};
Pages.quiz=quizPage(false);Pages["exam-mode"]=quizPage(true);
A.retry=()=>{QR=null;draw()};
A.exbegin=()=>{const q=DB.S.quizzes.find(x=>x.id===qid()),n=parseQs(q.text).length;EX={id:q.id,order:shuffle(n),end:Date.now()+Math.max(1,n)*6e4};draw()};

/* ---------- Noteboard ---------- */
Pages.noteboard=()=>{
  const n=DB.S.stickies,add=`<button class="btn" data-act="add" data-c="stickies">Add note</button>`;
  return{t:"Noteboard",sub:"Drag notes anywhere, or focus a note and use the arrow keys.",act:add,
    html:n.length?`<div class="board" id="board">${n.map((s,i)=>`<div class="bn sticky ${esc(s.color||"yellow")}" tabindex="0" role="group" aria-label="Sticky note" data-id="${s.id}" style="left:${s.x??(i%4)*185+10}px;top:${s.y??Math.floor(i/4)*150+10}px"><p>${esc(s.text)}</p><button class="btn ghost sm" data-act="edit" data-c="stickies" data-id="${s.id}">Edit</button> <button class="btn ghost sm" data-act="del" data-c="stickies" data-id="${s.id}">Delete</button></div>`).join("")}</div>`:empty("The board is empty. Add your first note.",add),
    after(){$$(".bn").forEach(el=>{
      let sx,sy,ox,oy,drag=false;const put=()=>DB.upd("stickies",el.dataset.id,{x:el.offsetLeft,y:el.offsetTop});
      el.onpointerdown=e=>{if(e.target.closest("button"))return;drag=true;sx=e.clientX;sy=e.clientY;ox=el.offsetLeft;oy=el.offsetTop;el.setPointerCapture(e.pointerId)};
      el.onpointermove=e=>{if(!drag)return;el.style.left=Math.max(0,ox+e.clientX-sx)+"px";el.style.top=Math.max(0,oy+e.clientY-sy)+"px"};
      el.onpointerup=()=>{if(drag){drag=false;put()}};
      el.onkeydown=e=>{const m={ArrowLeft:[-10,0],ArrowRight:[10,0],ArrowUp:[0,-10],ArrowDown:[0,10]}[e.key];if(!m||e.target!==el)return;e.preventDefault();el.style.left=Math.max(0,el.offsetLeft+m[0])+"px";el.style.top=Math.max(0,el.offsetTop+m[1])+"px";put()};
    })}};
};

/* ---------- Settings and profile ---------- */
Pages.settings=()=>{
  const s=DB.S.settings,sel=(n,o,v)=>`<label>${n[1]}<select name="${n[0]}">${o.map(x=>`<option value="${x[0]}" ${String(x[0])===String(v)?"selected":""}>${x[1]}</option>`).join("")}</select></label>`;
  return{t:"Settings",sub:"Appearance, text size and reminders",html:`<div class="card" style="max-width:560px"><form id="sf2">
    ${sel(["theme","Theme"],[["auto","Match my device"],["light","Light"],["dark","Dark"],["contrast","High contrast"]],s.theme)}
    ${sel(["font","Text size"],[[90,"Small"],[100,"Default"],[115,"Large"],[130,"Extra large"],[150,"Huge"]],s.font)}
    <label class="chk"><input type="checkbox" name="reminders" ${s.reminders?"checked":""}>Show study and deadline reminders</label></form>
    <p class="muted">Study durations and goals are on your <a href="profile.html">profile</a>. Animations are reduced automatically if your device asks for it. Everything here works with the keyboard and screen readers.</p></div>`,
    after(){$("#sf2").onchange=()=>{const f=new FormData($("#sf2"));DB.S.settings={theme:f.get("theme"),font:+f.get("font"),reminders:f.has("reminders")};DB.save();applyPrefs();toast("Settings saved")}}};
};
const YEARS=[["","Not set"],...[5,6,7,8,9,10,11,12,13].map(i=>[String(i),"Year "+i]),["college","College or university"],["other","Other"]];
const PREF=[["any","No preference"],["morning","Morning"],["afternoon","Afternoon"],["evening","Evening"],["night","Late night"]];
Pages.profile=()=>{
  const p=DB.S.profile,u=Auth.user(),init=(p.name||u.name||"?").trim()[0].toUpperCase();
  const opt=(o,v)=>o.map(x=>`<option value="${x[0]}" ${x[0]===String(v)?"selected":""}>${x[1]}</option>`).join("");
  const num=(k,l,min,max,unit,hint)=>`<div><label for="${k}">${l}</label><input id="${k}" name="${k}" type="number" inputmode="numeric" min="${min}" max="${max}" value="${esc(p[k])}" required><p class="muted">${hint} (${unit}, ${min}–${max})</p></div>`;
  return{t:"Profile",sub:"Your details and how the platform plans your study",
    html:`<div class="card idcard"><div class="avatar" aria-hidden="true">${p.avatar?`<img alt="" src="${esc(p.avatar)}">`:esc(init)}</div><div class="grow" style="flex:1"><h2 style="margin:0">${esc(p.name||u.name)}</h2><p class="muted" style="margin:0">${esc([YEARS.find(y=>y[0]===String(p.year))?.[1]!=="Not set"&&YEARS.find(y=>y[0]===String(p.year))?.[1],p.school,p.grad&&"Class of "+p.grad].filter(Boolean).join(" · ")||"Add your details below")}</p></div>
    <div class="row l"><button type="button" class="btn ghost" data-act="pick">Upload photo</button>${p.avatar?'<button type="button" class="btn ghost" data-act="rmav">Remove</button>':""}<input type="file" id="file" accept="image/*" hidden></div></div>
    <form id="pf" class="card" style="margin-top:16px" novalidate><div class="fields">
      <div class="full"><label for="name">Name</label><input id="name" name="name" required maxlength="60" autocomplete="name" value="${esc(p.name)}"></div>
      <div><label for="year">Year level</label><select id="year" name="year">${opt(YEARS,p.year)}</select></div>
      <div><label for="grad">Graduation year</label><input id="grad" name="grad" type="number" min="2000" max="2100" value="${esc(p.grad)}"></div>
      <div class="full"><label for="school">School</label><input id="school" name="school" maxlength="80" autocomplete="organization" value="${esc(p.school)}"></div>
      <div class="full"><label for="prefTime">Preferred study time</label><select id="prefTime" name="prefTime">${opt(PREF,p.prefTime)}</select></div>
      ${num("studyMin","Default study duration",1,240,"minutes","Starting length on the timer")}${num("breakMin","Break duration",1,60,"minutes","Suggested rest")}
      ${num("dailyGoal","Daily study goal",5,720,"minutes","Drives your dashboard progress")}${num("weeklyGoal","Weekly study goal",1,100,"hours","Shown on Goals")}</div>
      <p class="err" id="perr" role="alert"></p>
      <div class="savebar"><span id="pstate" role="status">All changes saved</span><div class="row"><button type="button" class="btn ghost" id="pdis" disabled>Discard</button><button class="btn" id="psave" disabled>Save changes</button></div></div></form>
    <div class="card" style="margin-top:16px"><h2>Account</h2><div class="row"><div><b>${esc(u.guest?"Guest profile":u.email)}</b><div class="muted">${u.guest?"Data is kept in this browser only. Create an account to keep separate data for each person.":"Signed in on this device. Your data stays in this browser."}</div></div><div class="row"><button class="btn ghost" data-act="logout">Log out</button>${u.guest?"":'<button class="btn dango" data-act="delacct">Delete account</button>'}</div></div><p class="muted">Export, restore or delete your study data on the <a href="privacy.html">privacy page</a>.</p></div>`,
    after(){
      const f=$("#pf"),mark=()=>{$("#pstate").textContent="Unsaved changes";$("#pstate").className="dirty";$("#psave").disabled=$("#pdis").disabled=false};
      f.oninput=f.onchange=mark;$("#pdis").onclick=()=>draw();
      f.onsubmit=e=>{e.preventDefault();$$("input",f).forEach(i=>i.removeAttribute("aria-invalid"));
        if(!f.checkValidity()){const bad=$$("input,select",f).find(i=>!i.checkValidity());bad.setAttribute("aria-invalid","true");$("#perr").textContent=(bad.labels[0]?bad.labels[0].textContent:"A field")+": "+bad.validationMessage;bad.focus();return}
        const d=Object.fromEntries(new FormData(f));["studyMin","breakMin","dailyGoal","weeklyGoal"].forEach(k=>d[k]=+d[k]);d.name=d.name.trim();
        Object.assign(DB.S.profile,d);DB.save();toast("Profile saved");draw()};
      $("#file").onchange=e=>{const fl=e.target.files[0];if(!fl)return;const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const c=document.createElement("canvas");c.width=c.height=128;const x=c.getContext("2d"),s=Math.min(im.width,im.height);x.drawImage(im,(im.width-s)/2,(im.height-s)/2,s,s,0,0,128,128);DB.S.profile.avatar=c.toDataURL("image/jpeg",.8);DB.save();draw()};im.onerror=()=>toast("That image couldn’t be read.");im.src=r.result};r.readAsDataURL(fl)};
    }};
};
A.pick=()=>$("#file").click();
A.rmav=()=>{DB.S.profile.avatar="";DB.save();draw()};
A.delacct=()=>ask("This permanently deletes your account and all of its study data from this device.","Delete account",()=>Auth.deleteAccount());

/* ---------- Privacy and help ---------- */
Pages.privacy=()=>{
  const S=DB.S,rows=[["Subjects","subjects"],["Topics","topics"],["Tasks","tasks"],["Assignments","assignments"],["Study sessions","sessions"],["Goals","goals"],["Notes","notes"],["Resources","resources"],["Sticky notes","stickies"],["Quizzes","quizzes"],["Quiz results","results"],["Flashcards","cards"],["Exams","exams"]];
  return{t:"Privacy",sub:"What is stored and where",html:`<div class="card"><h2>What is stored</h2><p>Everything you enter is saved in this browser on this device (local storage). Nothing is sent to a server, and there are no analytics or advertising trackers.</p>
    <table class="tbl"><tbody>${rows.map(([l,k])=>`<tr><th scope="row">${l}</th><td>${S[k].length}</td></tr>`).join("")}</tbody></table></div>
    <div class="card"><h2>Your data</h2>
    <div class="item"><div class="grow"><b>Export a backup</b><div class="muted">Download everything as a JSON file.</div></div><button class="btn ghost" data-act="export">Export</button></div>
    <div class="item"><div class="grow"><b>Restore from a backup</b><div class="muted">Replaces your current data with a backup file.</div></div><button class="btn ghost" data-act="impick">Choose file</button><input type="file" id="imp" accept="application/json,.json" hidden></div>
    <div class="item"><div class="grow"><b>Delete all study data</b><div class="muted">Removes subjects, tasks, sessions, goals, notes and profile details. Your sign-in stays.</div></div><button class="btn dango" data-act="wipe">Delete data</button></div></div>
    <p class="muted" style="margin-top:12px">Clearing your browser’s site data also removes this information, so export a backup first. Sign-in on this site is a local prototype and is not a substitute for a secure online account.</p>`,
    after(){$("#imp").onchange=e=>{const f=e.target.files[0];e.target.value="";if(!f)return;if(f.size>5e6){toast("That file is too large.");return}
      f.text().then(t=>ask("This replaces all your current data with the backup.","Restore",()=>{try{DB.import(t);applyPrefs();toast("Backup restored");draw()}catch(x){toast("Couldn’t read that file as a backup.")}}))}}};
};
A.export=()=>{const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([DB.export()],{type:"application/json"}));a.download="study-platform-backup-"+TODAY()+".json";document.body.appendChild(a);a.click();a.remove();toast("Backup downloaded")};
A.impick=()=>$("#imp").click();
A.wipe=()=>ask("This permanently deletes your subjects, tasks, sessions, goals, notes and profile details from this device. Export a backup first if you might want them.","Delete data",()=>{DB.wipe();Tm.set(null);applyPrefs();toast("Data deleted");draw()});
const FAQ=[["How do I get started?","Add a subject, break it into topics, rate your confidence, then add tasks and exams. The dashboard then tells you what to study next."],["How are recommendations chosen?","Each topic gets a score from your confidence, latest quiz average, how long since you studied it, nearby exams and task deadlines. The highest scores appear first."],["How do I record study time?","Use the study timer, or open a planned session from the planner and press Start. When you finish, rate your productivity and the session is saved."],["How do quizzes work?","Create a quiz with one question per line as Question | Answer. Answers are marked ignoring capitals and punctuation, and results update the topic’s quiz average."],["How do flashcards schedule reviews?","After each card choose Again, Hard, Good or Easy. Easier answers push the next review further away."],["Can I use this on my phone?","Yes. The layout adapts to small screens and the menu button opens the navigation."],["Where is my data?","Only in this browser. Use Privacy to export a backup before clearing browser data or switching device."],["I forgot my password.","Passwords can’t be recovered because nothing leaves your device. You can create a new account, or restore a backup into it from the Privacy page."]];
Pages.help=()=>({t:"Help",sub:"Answers to common questions",html:`<div class="card">${FAQ.map(([q,a])=>`<details class="faq"><summary>${q}</summary><p>${a}</p></details>`).join("")}</div>`});

/* ---------- Tools: grade calculator, general tools, writing, similarity ---------- */
let GR=[{n:"",w:"",m:""}];
Pages["grade-calculator"]=()=>({t:"Grade calculator",sub:"Enter assessment weights and marks. Leave a mark empty if it hasn’t happened yet.",
  html:`<div class="card"><table class="tbl"><thead><tr><th>Assessment</th><th>Weight (%)</th><th>Mark (%)</th><th><span class="sr">Remove</span></th></tr></thead><tbody>${GR.map((r,i)=>`<tr><td><input aria-label="Assessment name" data-i="${i}" data-f="n" value="${esc(r.n)}"></td><td><input aria-label="Weight" type="number" min="0" max="100" data-i="${i}" data-f="w" value="${esc(r.w)}"></td><td><input aria-label="Mark" type="number" min="0" max="100" data-i="${i}" data-f="m" value="${esc(r.m)}"></td><td><button class="btn ghost sm" data-act="gdel" data-i="${i}" aria-label="Remove row">×</button></td></tr>`).join("")}</tbody></table>
  <div class="row l" style="margin-top:12px"><button class="btn ghost" data-act="gadd">Add assessment</button><label style="margin:0">Target grade (%)<input id="gt" type="number" min="0" max="100" value="${esc(GR.t??80)}" style="width:110px"></label></div></div>
  <div class="card" id="gres" role="status" style="margin-top:16px"></div>`,
  after(){
    const calc=()=>{
      const t=+$("#gt").value;GR.t=t;
      const kn=GR.filter(r=>r.m!==""&&+r.w>0),W=kn.reduce((a,r)=>a+ +r.w,0),pts=kn.reduce((a,r)=>a+r.w*r.m/100,0),rem=100-W;let h="";
      if(W>100)h="<p>Your weights add up to more than 100%. Check them.</p>";
      else{
        h=W?`<p>Current weighted average: <b>${(pts/W*100).toFixed(1)}%</b> across ${W}% of the course.</p>`:"<p class='muted'>Add a weight and a mark to see your average.</p>";
        if(W&&rem>0){const need=(t-pts)/(rem/100);h+=need>100?`<p>You would need ${need.toFixed(1)}% on the remaining ${rem}%, so ${t}% is out of reach. Aim for the next best target.</p>`:need<=0?`<p>You have already secured ${t}%.</p>`:`<p>To reach ${t}% you need <b>${need.toFixed(1)}%</b> on the remaining ${rem}%.</p>`}
        else if(W&&rem===0)h+=`<p>Final grade: <b>${pts.toFixed(1)}%</b>.</p>`;
      }
      $("#gres").innerHTML=h;
    };
    $$("[data-f]").forEach(i=>i.oninput=()=>{GR[+i.dataset.i][i.dataset.f]=i.value;calc()});$("#gt").oninput=calc;calc();
  }});
A.gadd=()=>{GR.push({n:"",w:"",m:""});draw()};
A.gdel=d=>{GR.splice(+d.i,1);if(!GR.length)GR=[{n:"",w:"",m:""}];draw()};

const CONV=[["Kilometres to miles",v=>v*.621371,"mi"],["Miles to kilometres",v=>v/.621371,"km"],["Kilograms to pounds",v=>v*2.20462,"lb"],["Pounds to kilograms",v=>v/2.20462,"kg"],["Celsius to Fahrenheit",v=>v*9/5+32,"°F"],["Fahrenheit to Celsius",v=>(v-32)*5/9,"°C"],["Centimetres to inches",v=>v/2.54,"in"],["Inches to centimetres",v=>v*2.54,"cm"]];
Pages.tools=()=>({t:"More tools",sub:"Quick calculators",html:`<div class="grid">
  <div class="card"><h2>Percentage</h2><label>Number<input id="pa" type="number"></label><label>Of / out of<input id="pb" type="number"></label><div id="pr" role="status" class="muted">Enter two numbers.</div></div>
  <div class="card"><h2>Unit converter</h2><label>Conversion<select id="cs">${CONV.map((c,i)=>`<option value="${i}">${c[0]}</option>`).join("")}</select></label><label>Value<input id="cv" type="number"></label><div id="cr" role="status" class="muted">Enter a value.</div></div>
  <div class="card"><h2>Days between dates</h2><label>From<input id="d1" type="date" value="${TODAY()}"></label><label>To<input id="d2" type="date"></label><div id="dr" role="status" class="muted">Choose both dates.</div></div>
  <div class="card"><h2>Random number</h2><label>Min<input id="r1" type="number" value="1"></label><label>Max<input id="r2" type="number" value="100"></label><button class="btn sm" id="rb">Pick</button> <span id="rr" role="status" class="stat" style="font-size:1.4rem"></span></div></div>
  <p class="muted" style="margin-top:12px">See also the <a href="grade-calculator.html">grade calculator</a>, <a href="writing.html">writing tools</a> and <a href="timer.html">study timer</a>.</p>`,
  after(){
    const n=x=>x.value===""?NaN:+x.value,r2=v=>Math.round(v*100)/100;
    const pc=()=>{const a=n($("#pa")),b=n($("#pb"));$("#pr").innerHTML=isNaN(a)||isNaN(b)?"Enter two numbers.":`${a}% of ${b} = <b>${r2(a*b/100)}</b><br>${a} is <b>${b?r2(a/b*100):"–"}%</b> of ${b}`};
    const cv=()=>{const v=n($("#cv")),c=CONV[+$("#cs").value];$("#cr").innerHTML=isNaN(v)?"Enter a value.":`<b>${r2(c[1](v))} ${c[2]}</b>`};
    const dd=()=>{const a=$("#d1").value,b=$("#d2").value;$("#dr").innerHTML=a&&b?`<b>${Math.round((dt(b)-dt(a))/864e5)}</b> days`:"Choose both dates."};
    ["pa","pb"].forEach(i=>$("#"+i).oninput=pc);["cv","cs"].forEach(i=>$("#"+i).oninput=cv);["d1","d2"].forEach(i=>$("#"+i).oninput=dd);dd();
    $("#rb").onclick=()=>{let a=Math.ceil(n($("#r1"))),b=Math.floor(n($("#r2")));if(isNaN(a)||isNaN(b)||a>b){$("#rr").textContent="Check min and max";return}$("#rr").textContent=a+Math.floor(Math.random()*(b-a+1))};
  }});

const WORD=/[\p{L}\p{N}']+/gu;
Pages.writing=()=>({t:"Writing",sub:"Counts and basic checks, done on your device",html:`<div class="grid"><div class="card span"><label for="wt">Your text<textarea id="wt" style="min-height:220px"></textarea></label></div>
  <div class="card"><h2>Counts</h2><div id="wc" role="status" aria-live="polite" class="muted">Start typing.</div></div><div class="card"><h2>Suggestions</h2><div id="ws" class="muted">Nothing to check yet.</div></div></div>`,
  after(){$("#wt").oninput=()=>{
    const t=$("#wt").value,w=t.toLowerCase().match(WORD)||[],ss=t.split(/(?<=[.!?])\s+/).filter(s=>s.trim()),pp=t.split(/\n\s*\n/).filter(s=>s.trim());
    $("#wc").innerHTML=`Words <b>${w.length}</b> · Characters <b>${t.length}</b><br>Sentences <b>${ss.length}</b> · Paragraphs <b>${pp.length}</b><br>Reading time <b>${Math.max(w.length?1:0,Math.round(w.length/200))} min</b>`;
    const f={};w.filter(x=>x.length>4).forEach(x=>f[x]=(f[x]||0)+1);const rep=Object.entries(f).filter(x=>x[1]>=3).sort((a,b)=>b[1]-a[1]).slice(0,5);
    const pas=(t.match(/\b(was|were|is|are|been|being|be)\s+\w+ed\b/gi)||[]).length,lg=ss.filter(s=>(s.match(WORD)||[]).length>30).length,L=[];
    if(rep.length)L.push("Often repeated: "+rep.map(x=>esc(x[0])+" ("+x[1]+")").join(", "));if(pas)L.push(pas+" possible passive-voice phrase"+(pas===1?"":"s"));if(lg)L.push(lg+" sentence"+(lg===1?"":"s")+" over 30 words");
    $("#ws").innerHTML=w.length?(L.length?L.map(x=>"<div>"+x+"</div>").join(""):"No issues found by these basic checks."):"Nothing to check yet.";
  }}});
Pages.plagiarism=()=>({t:"Similarity checker",sub:"Compares your text with your saved notes and assignments on this device. It can’t search the internet.",
  html:`<div class="card"><label for="pt">Paste your text<textarea id="pt" style="min-height:200px"></textarea></label><button class="btn" id="pgo">Check similarity</button></div><div id="pres" role="status" style="margin-top:16px"></div>`,
  after(){$("#pgo").onclick=()=>{
    const text=$("#pt").value,toks=text.split(/([\p{L}\p{N}']+)/u),idx=[];toks.forEach((x,i)=>{if(i%2)idx.push(i)});
    const W=idx.map(i=>toks[i].toLowerCase()),K=4,sh=a=>{const s=[];for(let i=0;i+K<=a.length;i++)s.push(a.slice(i,i+K).join(" "));return s};
    if(W.length<K){$("#pres").innerHTML=empty("Paste at least four words to compare.");return}
    const mine=sh(W),S=DB.S,src=[...S.notes.map(n=>[n.title,n.body]),...S.assignments.map(a=>[a.title,a.desc]),...S.tasks.map(k=>[k.title,k.desc])].filter(s=>s[1]);
    const cov=new Array(W.length).fill(false),hits=[];
    src.forEach(([title,body])=>{const set=new Set(sh((String(body).toLowerCase().match(WORD)||[]))),m=[];mine.forEach((k,i)=>{if(set.has(k))m.push(i)});if(m.length){hits.push([title,Math.round(m.length/mine.length*100)]);m.forEach(i=>{for(let j=0;j<K;j++)cov[i+j]=true})}});
    const pct=Math.round(cov.filter(Boolean).length/W.length*100),mark=new Set(idx.filter((_,j)=>cov[j]));
    $("#pres").innerHTML=`<div class="card"><h2>${pct?"Similarity detected":"No similarity detected"}: ${pct}%</h2><p class="muted">${pct?"Matching phrases are highlighted. Similarity is not proof of copying, so check the sources yourself.":"Nothing in your saved notes or assignments matches."}</p>${hits.length?hits.sort((a,b)=>b[1]-a[1]).map(h=>`<div class="item"><div class="grow">${esc(h[0])}</div>${tag(h[1]+"% overlap")}</div>`).join(""):""}</div>${pct?`<div class="card" style="white-space:pre-wrap;margin-top:16px">${toks.map((x,i)=>mark.has(i)?`<mark>${esc(x)}</mark>`:esc(x)).join("")}</div>`:""}`;
  }}});

/* ---------- Study assistant (rule-based, no external AI) ---------- */
let CHAT=[];
const reply=q=>{
  q=q.toLowerCase();const S=DB.S,L=a=>a.join("\n");
  if(/study|next|recommend|what should|focus/.test(q)){const r=Eng.recommend(3);return r.length?L(["Here is what I’d do first:",...r.map((x,i)=>`${i+1}. ${x.title}, ${x.min} min (${x.why.join(", ")||"keep it ticking over"})`)]):"Add subjects and topics first, then I can rank what to study."}
  if(/exam/.test(q)){const e=S.exams.filter(x=>x.date&&daysTo(x.date)>=0).sort((a,b)=>a.date<b.date?-1:1).slice(0,4);return e.length?L(e.map(x=>`${x.name}: ${daysTo(x.date)} day${daysTo(x.date)===1?"":"s"} (${fmtD(x.date)})`)):"You have no upcoming exams saved."}
  if(/task|due|deadline|homework|assignment/.test(q)){const d=Eng.dues().filter(k=>!k.done&&k.due).sort(bySoon).slice(0,5);return d.length?L(d.map(k=>`${k.title}: ${daysTo(k.due)<0?"overdue":"due "+fmtD(k.due)}`)):"Nothing is due. Nice."}
  if(/weak|struggl|revise|topic|confiden/.test(q)){const t=[...S.topics].sort((a,b)=>(+a.conf||1)-(+b.conf||1)).slice(0,3);return t.length?L(["Your lowest-confidence topics:",...t.map(x=>`${Eng.label(x.sid,x.id)}: ${CONF[+x.conf||1]}`)]):"You haven’t added any topics yet."}
  if(/streak|progress|how am i|doing/.test(q)){const t=TODAY(),w=monday(t);return`Streak: ${Eng.streak()} day(s). Today: ${Eng.mins(t,t)} of ${S.profile.dailyGoal} min. This week: ${hm(Eng.mins(w,addDays(w,6)))}.`}
  if(/flash|card/.test(q))return`You have ${Eng.cardsDue().length} flashcard(s) due.`;
  return"I’m a simple built-in helper, not a language-model AI. I can tell you what to study next, what’s due, upcoming exams, your weakest topics, your streak, and flashcards due.";
};
Pages["ai-assistant"]=()=>({t:"Study assistant",sub:"A basic rule-based helper that answers from your own data",
  html:`<div class="card" style="max-width:720px"><div class="chat" id="chat" aria-live="polite"><div class="msg">${esc(reply("help"))}</div>${CHAT.map(m=>`<div class="msg ${m.me?"me":""}">${esc(m.t)}</div>`).join("")}</div>
  <div class="row l" style="margin-bottom:10px">${["What should I study?","What’s due?","How am I doing?","Weakest topics"].map(q=>`<button class="btn ghost sm" data-act="ask" data-q="${esc(q)}">${esc(q)}</button>`).join("")}</div>
  <form id="cf" class="row l"><label class="sr" for="cq">Ask a question</label><input id="cq" style="flex:1;margin:0;min-width:160px" maxlength="200" placeholder="Ask about your study…"><button class="btn">Ask</button></form></div>`,
  after(){const c=$("#chat");c.scrollTop=c.scrollHeight;$("#cf").onsubmit=e=>{e.preventDefault();const v=$("#cq").value.trim();if(v)A.ask({q:v})}}});
A.ask=d=>{CHAT.push({me:1,t:d.q},{t:reply(d.q)});draw();$("#cq")&&$("#cq").focus()};

/* ---------- Search ---------- */
const SRCH=[["subjects","Subjects","subjects.html",x=>x.name],["topics","Topics","topics.html",x=>x.name],["tasks","Tasks","tasks.html",x=>x.title],["assignments","Assignments","assignments.html",x=>x.title],["notes","Notes","notes.html",x=>x.title],["resources","Resources","resources.html",x=>x.title],["quizzes","Quizzes","quizzes.html",x=>x.title],["cards","Flashcards","flashcards.html",x=>x.front],["exams","Exams","exams.html",x=>x.name],["goals","Goals","goals.html",x=>x.title],["stickies","Sticky notes","sticky-notes.html",x=>x.text]];
Pages.search=()=>{
  const raw=(new URLSearchParams(location.search).get("q")||"").trim(),q=raw.toLowerCase();
  const g=q?SRCH.map(([k,l,pg,f])=>[l,pg,f,DB.S[k].filter(x=>JSON.stringify(Object.values(x)).toLowerCase().includes(q))]).filter(x=>x[3].length):[];
  return{t:"Search",sub:q?`Results for “${esc(raw)}”`:"Search subjects, topics, tasks, notes, resources and more",
    html:`<form action="search.html" class="row l" role="search" style="margin-bottom:16px"><label class="sr" for="sq">Search</label><input id="sq" name="q" type="search" value="${esc(raw)}" style="max-width:420px;margin:0"><button class="btn">Search</button></form>${q?(g.length?g.map(([l,pg,f,r])=>`<div class="card"><h2>${l}</h2>${r.slice(0,10).map(x=>`<div class="item"><a href="${pg}">${esc(f(x))}</a></div>`).join("")}</div>`).join(""):empty("Nothing found. Try a different word.")):""}`};
};

/* ---------- Start ---------- */
(function(){
  if(!Auth.user())return;
  const P=document.body.dataset.page;
  DB.init(Auth.user().id);applyPrefs();mount(P);
  PAGE=Pages[P];
  if(!PAGE){$("#main").textContent="Page not found.";return}
  draw();
})();
