/* Page views: dashboard, planner, tasks, subjects, timer, progress, goals, settings. */
const NAV=[["dashboard","Dashboard"],["planner","Planner"],["tasks","Tasks"],["subjects","Subjects"],["timer","Study timer"],["progress","Progress"],["goals","Goals"],["–"],["soon-notes","Notes"],["soon-quizzes","Quizzes"],["soon-flashcards","Flashcards"],["soon-ai","AI assistant"],["–"],["settings","Profile & settings"]];
const empty=(msg,btn)=>`<div class="card empty"><p>${msg}</p>${btn||""}</div>`;
const sampleBtn=`<button class="btn ghost" data-act="sample">Load sample data</button>`;
const taskRow=(k,extra="")=>`<div class="item"><input type="checkbox" style="width:auto;margin:0" data-act="toggle" data-id="${k.id}" ${k.done?"checked":""} aria-label="Complete ${esc(k.title)}"><div class="grow"><span class="${k.done?"done":""}">${esc(k.title)}</span><div class="muted">${esc(label(k.sid,k.tid))} · due ${fmtD(k.due)}${k.est?" · "+k.est+" min":""}</div></div><span class="tag ${k.pri}">${k.pri}</span>${extra}</div>`;

const V={
dashboard(){
  const p=S.profile,t=TODAY(),done=mins(t,t),pct=done/p.dailyGoal*100,h=new Date().getHours();
  const due=S.tasks.filter(k=>k.due<=t&&(!k.done||k.due===t)),exams=S.subjects.filter(s=>s.exam&&daysTo(s.exam)>=0).sort((a,b)=>a.exam<b.exam?-1:1);
  const up=S.tasks.filter(k=>!k.done&&k.due>t).sort((a,b)=>a.due<b.due?-1:1).slice(0,4);
  const rec=recommend();
  return `<h2>Good ${h<12?"morning":h<18?"afternoon":"evening"}, ${esc(p.name)}</h2><p class="sub">${new Date().toLocaleDateString(undefined,{weekday:"long",day:"numeric",month:"long"})}</p>
  ${!S.subjects.length?empty("Start by adding a subject, or explore with sample data.",`<button class="btn" data-act="addSubject">Add subject</button> ${sampleBtn}`)+"<br>":""}
  <div class="grid">
  <div class="card"><h3>Today’s progress</h3>${bar(pct,pct>=100)}<p class="muted">${done} / ${p.dailyGoal} minutes</p></div>
  <div class="card"><h3>Quick actions</h3><div class="row" style="justify-content:flex-start"><button class="btn sm" data-act="addTask">Add task</button><button class="btn sm" data-act="addSession">Add study session</button><button class="btn sm" data-act="addSubject">Add subject</button><a class="btn sm" href="#timer" style="text-decoration:none">Start timer</a></div></div>
  <div class="card"><h3>Today’s tasks</h3>${due.length?due.map(k=>taskRow(k)).join(""):'<p class="muted">Nothing due today.</p>'}</div>
  <div class="card"><h3>Upcoming</h3>${exams.slice(0,3).map(s=>`<div class="item"><div class="grow"><b>${esc(s.name)} exam</b></div><span class="tag">${daysTo(s.exam)} days</span></div>`).join("")}${up.map(k=>`<div class="item"><div class="grow">${esc(k.title)}</div><span class="tag">${daysTo(k.due)} days</span></div>`).join("")||(exams.length?"":'<p class="muted">Nothing coming up.</p>')}</div>
  <div class="card" style="grid-column:1/-1"><h3>Recommended study</h3>${rec.length?rec.map(r=>`<div class="item"><div class="grow"><b>${esc(r.title||label(r.sid,r.tid))}</b><div class="muted">${esc(r.why.join(" · ")||"Keep your revision ticking over")}</div></div><span class="muted">${r.min} min</span><button class="btn sm" data-act="rec" data-sid="${r.sid}" data-tid="${r.tid}" data-min="${r.min}">Start session</button></div>`).join(""):'<p class="muted">Add subjects with topics to get recommendations.</p>'}</div>
  </div>`;
},
planner(){
  const ws=addDays(monday(TODAY()),(V.off||0)*7),days=[...Array(7)].map((_,i)=>addDays(ws,i));
  return `<div class="row"><div><h2>Planner</h2><p class="sub">Week of ${fmtD(ws)}</p></div><div class="row"><button class="btn ghost sm" data-act="wk" data-n="-1">Previous</button><button class="btn ghost sm" data-act="wk" data-n="0">This week</button><button class="btn ghost sm" data-act="wk" data-n="1">Next</button><button class="btn sm" data-act="addSession">Add study session</button></div></div>
  <div class="week">${days.map(d=>`<div class="day ${d===TODAY()?"today":""}"><b>${new Date(d+"T00:00").toLocaleDateString(undefined,{weekday:"short"})} ${new Date(d+"T00:00").getDate()}</b>
  ${S.sessions.filter(x=>x.date===d).sort((a,b)=>(a.time||"")<(b.time||"")?-1:1).map(x=>`<span class="chip"><span class="${x.done?"done":""}">${esc(x.time||"")} ${esc(label(x.sid,x.tid))}</span><br><span class="muted">${x.done?x.min:x.dur} min</span> ${x.done?"":`<button class="btn sm" data-act="runSess" data-id="${x.id}">Start</button>`} <button class="btn ghost sm" data-act="delSess" data-id="${x.id}" aria-label="Delete session">×</button></span>`).join("")}
  ${S.tasks.filter(k=>k.due===d).map(k=>`<span class="chip t"><span class="${k.done?"done":""}">Due: ${esc(k.title)}</span></span>`).join("")}
  ${S.subjects.filter(s=>s.exam===d).map(s=>`<span class="chip t"><b>${esc(s.name)} exam</b></span>`).join("")}</div>`).join("")}</div>`;
},
tasks(){
  const t=[...S.tasks].sort((a,b)=>a.done-b.done||(a.due<b.due?-1:1)),od=S.tasks.filter(k=>!k.done&&daysTo(k.due)<0).length;
  return `<div class="row"><div><h2>Tasks</h2><p class="sub">${S.tasks.filter(k=>!k.done).length} to do${od?" · "+od+" overdue":""}</p></div><button class="btn" data-act="addTask">Add task</button></div>
  <div class="card">${t.length?t.map(k=>taskRow(k,`<button class="btn ghost sm" data-act="editTask" data-id="${k.id}">Edit</button><button class="btn ghost sm" data-act="delTask" data-id="${k.id}">Delete</button>`)).join(""):'<p class="muted">No tasks yet. Add your first one.</p>'}</div>`;
},
subjects(){
  return `<div class="row"><div><h2>Subjects</h2><p class="sub">Your subjects, topics and progress</p></div><button class="btn" data-act="addSubject">Add subject</button></div>
  ${S.subjects.length?`<div class="grid">${S.subjects.map(s=>{const p=subjProg(s);return `<div class="card" style="border-top:4px solid ${esc(s.color)}"><h3>${esc(s.name)}</h3><p class="muted">${s.topics.length} topics · ${S.tasks.filter(k=>k.sid===s.id&&!k.done).length} tasks open${s.target?" · target "+esc(s.target):""}</p>${bar(p)}<div class="row" style="margin-top:10px"><span class="muted">${Math.round(p)}% confidence</span><a class="btn sm" href="#subject-${s.id}" style="text-decoration:none">Open subject</a></div></div>`}).join("")}</div>`:empty("No subjects yet.",`<button class="btn" data-act="addSubject">Add subject</button> ${sampleBtn}`)}`;
},
subject(id){
  const s=subj(id);if(!s)return empty("Subject not found.");
  return `<div class="row"><div><h2>${esc(s.name)}</h2><p class="sub">${esc(s.teacher||"No teacher set")}${s.exam?" · exam "+fmtD(s.exam)+" ("+daysTo(s.exam)+" days)":""}${s.desc?" · "+esc(s.desc):""}</p></div><div class="row"><button class="btn ghost sm" data-act="editSubject" data-id="${s.id}">Edit</button><button class="btn danger sm" data-act="delSubject" data-id="${s.id}">Delete</button><button class="btn sm" data-act="addTopic" data-id="${s.id}">Add topic</button></div></div>
  <div class="card"><div class="muted" style="margin-bottom:8px">Overall ${Math.round(subjProg(s))}%</div>${bar(subjProg(s))}</div><br>
  <div class="card"><h3>Topics</h3>${s.topics.map(t=>`<div class="item"><div class="grow"><b>${esc(t.name)}</b><div class="muted">${esc(t.diff)} · last studied ${t.last?fmtD(t.last):"never"}${t.quiz!==""&&t.quiz!=null?" · quiz "+t.quiz+"%":""}</div>${bar(t.conf*20)}</div><span class="muted">${t.conf}/5</span><button class="btn ghost sm" data-act="editTopic" data-id="${s.id}" data-t="${t.id}">Edit</button><button class="btn ghost sm" data-act="delTopic" data-id="${s.id}" data-t="${t.id}">Delete</button><button class="btn sm" data-act="rec" data-sid="${s.id}" data-tid="${t.id}" data-min="${S.profile.studyMin}">Study</button></div>`).join("")||'<p class="muted">Add topics such as Algebra or Cells to track them.</p>'}</div><br>
  <div class="card"><h3>Open tasks</h3>${S.tasks.filter(k=>k.sid===s.id&&!k.done).map(k=>taskRow(k)).join("")||'<p class="muted">No open tasks.</p>'}</div>`;
},
timer(){
  const opts=topicOpts();
  return `<h2>Study timer</h2><p class="sub">Pick what you’re studying, then start.</p>
  <div class="card" style="max-width:480px"><label>Studying<select id="tsel">${opts.map(o=>`<option value="${esc(o[0])}" ${o[0]===T.sid+":"+T.tid?"selected":""}>${esc(o[1])}</option>`).join("")}</select></label>
  <label>Minutes<input id="tmin" type="number" min="1" max="240" value="${Math.round(T.total/60)}" ${T.run||T.left<T.total?"disabled":""}></label>
  <div class="big" id="clock">${clock()}</div>
  ${bar(T.total?(1-T.left/T.total)*100:0)}
  <div class="row" style="margin-top:14px;justify-content:center" id="tbtn">${T.run?'<button class="btn" data-act="tpause">Pause</button>':`<button class="btn" data-act="tstart">${T.left<T.total?"Resume":"Start"}</button>`}<button class="btn ghost" data-act="tadd">Add 5 min</button><button class="btn ghost" data-act="treset">Reset</button><button class="btn ghost" data-act="tfinish">Finish session</button></div></div>`;
},
progress(){
  const all=S.sessions.filter(x=>x.done),tot=all.reduce((a,x)=>a+x.min,0),od=S.tasks.filter(k=>!k.done&&daysTo(k.due)<0).length;
  return `<h2>Progress</h2><p class="sub">Built from your sessions, tasks and topics</p>
  <div class="grid" style="margin-bottom:16px"><div class="card"><div class="muted">Total study time</div><h2>${hm(tot)}</h2></div><div class="card"><div class="muted">Sessions</div><h2>${all.length}</h2></div><div class="card"><div class="muted">Tasks completed</div><h2>${S.tasks.filter(k=>k.done).length}</h2></div><div class="card"><div class="muted">Tasks overdue</div><h2 style="color:${od?"var(--danger)":"inherit"}">${od}</h2></div></div>
  <div class="grid">${S.subjects.map(s=>{const m=mins("0000","9999",s.id),ts=S.tasks.filter(k=>k.sid===s.id),tp=ts.length?ts.filter(k=>k.done).length/ts.length*100:0;return `<div class="card"><h3 style="color:${esc(s.color)}">${esc(s.name)}</h3><div class="muted">Study time ${hm(m)}</div>${bar(Math.min(100,m/6))}<div class="muted" style="margin-top:8px">Tasks ${Math.round(tp)}%</div>${bar(tp)}<div class="muted" style="margin-top:8px">Topic progress ${Math.round(subjProg(s))}%</div>${bar(subjProg(s))}</div>`}).join("")||empty("Add subjects to see progress.")}</div>`;
},
goals(){
  const ws=monday(TODAY()),we=addDays(ws,6),wm=mins(ws,we),p=S.profile;
  const prog=g=>{if(g.type==="confidence"){const tp=topic(g.sid,g.tid);return{v:tp?tp.conf:0,t:g.target,u:" of 5 confidence"}}
    if(g.type==="sessions")return{v:S.sessions.filter(x=>x.done&&x.date>=ws&&x.date<=we&&(!g.sid||x.sid===g.sid)).length,t:g.target,u:" sessions"};
    return{v:Math.round(mins(ws,we,g.sid)/60*10)/10,t:g.target,u:" hours"}};
  return `<div class="row"><div><h2>Goals</h2><p class="sub">Weekly and subject goals</p></div><button class="btn" data-act="addGoal">Add goal</button></div>
  <div class="grid"><div class="card"><h3>Weekly study goal</h3>${bar(wm/(p.weeklyGoal*60)*100,wm>=p.weeklyGoal*60)}<p class="muted">${(wm/60).toFixed(1)} / ${p.weeklyGoal} hours</p></div>
  <div class="card"><h3>Daily study goal</h3>${bar(mins(TODAY(),TODAY())/p.dailyGoal*100)}<p class="muted">${mins(TODAY(),TODAY())} / ${p.dailyGoal} minutes today</p></div>
  ${S.goals.map(g=>{const r=prog(g);return `<div class="card"><div class="row"><h3>${esc(g.label)}</h3><button class="btn ghost sm" data-act="delGoal" data-id="${g.id}">Delete</button></div>${bar(r.v/r.t*100,r.v>=r.t)}<p class="muted">${r.v} / ${r.t}${r.u}</p></div>`}).join("")}</div>`;
},
settings(){
  const p=S.profile;
  return `<h2>Profile & settings</h2><p class="sub">Stored in this browser only</p>
  <div class="card" style="max-width:560px"><p><b>${esc(p.name)}</b> · Year ${p.year}${p.school?" · "+esc(p.school):""} · class of ${p.grad}</p><p class="muted">Daily goal ${p.dailyGoal} min · weekly ${p.weeklyGoal} h · sessions ${p.studyMin} min with ${p.breakMin} min breaks</p>
  <div class="row" style="justify-content:flex-start"><button class="btn" data-act="editProfile">Edit profile</button><button class="btn ghost" data-act="export">Export data</button><button class="btn ghost" data-act="sample">Load sample data</button><button class="btn danger" data-act="reset">Reset all data</button></div></div>`;
},
soon(n){return `<h2>${esc(n[0].toUpperCase()+n.slice(1))}</h2><div class="card empty"><p>This feature is currently under development. It’s planned for a later wave.</p></div>`}
};
