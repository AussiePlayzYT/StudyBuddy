/* Shared helpers and the app shell (sidebar, top bar, breadcrumbs, dialogs, toasts) used by every page. */
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const iso=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const TODAY=()=>iso(new Date());
const dt=s=>new Date(s+"T00:00");
const daysTo=s=>Math.round((dt(s)-dt(TODAY()))/864e5);
const addDays=(s,n)=>{const d=dt(s);d.setDate(d.getDate()+n);return iso(d)};
const monday=s=>{const d=dt(s);d.setDate(d.getDate()-((d.getDay()+6)%7));return iso(d)};
const fmtD=s=>s?dt(s).toLocaleDateString(undefined,{day:"numeric",month:"short"}):"";
const hm=m=>m>=60?Math.floor(m/60)+"h "+(m%60)+"m":m+"m";
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const safeUrl=u=>/^https?:\/\//i.test(u||"")?u:"";
const safeCol=c=>/^#[0-9a-f]{6}$/i.test(c||"")?c:"#0f766e";
const bar=(p,ok)=>`<div class="bar ${ok?"ok":""}" role="progressbar" aria-valuenow="${Math.round(clamp(p||0,0,100))}" aria-valuemin="0" aria-valuemax="100"><i style="width:${clamp(p||0,0,100)}%"></i></div>`;
const tag=(t,c="")=>`<span class="tag ${c}">${esc(t)}</span>`;
const empty=(msg,btn="")=>`<div class="card empty"><p>${msg}</p>${btn}</div>`;
const toast=m=>{const t=$("#toast");if(!t)return;t.textContent=m;t.style.display="block";clearTimeout(toast.h);toast.h=setTimeout(()=>t.style.display="none",2600)};
const A={};            // click/change actions, keyed by data-act
let PAGE=null;         // current page function

const NAV=[
 ["",[["dashboard","Dashboard"]]],
 ["Plan",[["planner","Planner"],["calendar","Calendar"],["tasks","Tasks"],["assignments","Assignments"],["exams","Exams"]]],
 ["Learn",[["subjects","Subjects"],["topics","Topics"],["notes","Notes"],["resources","Resources"],["sticky-notes","Sticky notes"],["noteboard","Noteboard"]]],
 ["Practise",[["quizzes","Quizzes"],["flashcards","Flashcards"],["exam-mode","Exam mode"]]],
 ["Track",[["goals","Goals"],["progress","Progress"],["analytics","Analytics"],["achievements","Achievements"]]],
 ["Smart",[["recommendations","Recommendations"],["ai-assistant","Study assistant"]]],
 ["Tools",[["timer","Study timer"],["writing","Writing"],["plagiarism","Similarity checker"],["grade-calculator","Grade calculator"],["tools","More tools"]]],
 ["Account",[["notifications","Notifications"],["profile","Profile"],["settings","Settings"],["privacy","Privacy"],["help","Help"]]]
];
const TITLES={};NAV.forEach(g=>g[1].forEach(([k,t])=>TITLES[k]=[g[0],t]));

function applyPrefs(){
  const s=DB.S.settings,r=document.documentElement;
  if(s.theme==="auto")r.removeAttribute("data-theme");else r.setAttribute("data-theme",s.theme);
  r.style.setProperty("--fsn",clamp((+s.font||100)/100,.85,1.5));
}

function mount(P){
  const u=Auth.user(),nm=(DB.S.profile.name||u.name||"Me").split(" ")[0];
  const nav=NAV.map(([g,l])=>{
    const links=l.map(([k,t])=>`<a href="${k}.html"${k===P?' aria-current="page"':""}>${t}</a>`).join("");
    return g?`<details open><summary>${g}</summary>${links}</details>`:links;
  }).join("");
  $("#app").innerHTML=`<a class="skip" href="#main">Skip to main content</a><div class="app">
  <aside id="side" aria-label="Sidebar"><div class="brand"><a href="dashboard.html">Study Platform</a></div><nav aria-label="Main">${nav}<a href="#" data-act="logout" style="margin-top:10px">Log out</a></nav></aside>
  <div class="col"><header class="topbar"><button type="button" class="btn ghost sm" id="menu" aria-expanded="false" aria-controls="side">Menu</button>
  <form class="sf" action="search.html" role="search"><label class="sr" for="q">Search everything</label><input id="q" type="search" name="q" placeholder="Search everything"></form>
  <a class="btn ghost sm" href="notifications.html" id="nb">Notifications</a><a class="btn ghost sm" href="profile.html">${esc(nm)}</a></header>
  <main id="main" tabindex="-1"></main></div></div><dialog id="dlg"></dialog><div id="toast" role="status" aria-live="polite"></div>`;
  $("#menu").onclick=()=>{const o=$("#side").classList.toggle("open");$("#menu").setAttribute("aria-expanded",o)};
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&$("#side").classList.contains("open")){$("#side").classList.remove("open");$("#menu").setAttribute("aria-expanded","false");$("#menu").focus()}});
  $("#main").addEventListener("click",()=>{$("#side").classList.remove("open");$("#menu").setAttribute("aria-expanded","false")});
}

function draw(){
  const p=PAGE(),P=document.body.dataset.page,[g,t]=TITLES[P]||["",p.t];
  const crumbs=p.crumb||[g,t].filter(Boolean);
  const bc=`<nav class="crumb" aria-label="Breadcrumb"><a href="dashboard.html">Home</a>${crumbs.map((c,i)=>" › "+(Array.isArray(c)?`<a href="${c[0]}">${esc(c[1])}</a>`:i===crumbs.length-1?`<span aria-current="page">${esc(c)}</span>`:esc(c))).join("")}</nav>`;
  $("#main").innerHTML=`${bc}<div class="row ph"><div><h1>${esc(p.t||t)}</h1>${p.sub?`<p class="sub">${p.sub}</p>`:""}</div><div class="row">${p.act||""}</div></div>${p.html}`;
  document.title=(p.t||t)+" · Study Platform";
  const n=Eng.alerts().length;$("#nb").innerHTML="Notifications"+(n?`<span class="badge" aria-label="${n} new">${n}</span>`:"");
  if(DB.failed){DB.failed=false;toast("Couldn’t save: your browser is blocking storage.")}
  if(p.after)p.after();
}

document.addEventListener("click",e=>{
  const el=e.target.closest("[data-act]");if(!el||el.type==="checkbox")return;
  const f=A[el.dataset.act];if(f){e.preventDefault();f(el.dataset,el)}
});
document.addEventListener("change",e=>{
  const el=e.target.closest("[data-act]");if(!el||el.type!=="checkbox")return;
  const f=A[el.dataset.act];if(f)f(el.dataset,el);
});
A.logout=()=>Auth.logout();

/* Dialog form. fields: {k,l,t,o,r,v,min,max,p}. cb(values) may return an error string to keep the dialog open. */
const subjOpts=none=>[["",none||"No subject"],...DB.S.subjects.map(s=>[s.id,s.name])];
const fld=(f,vals)=>{
  let v=vals[f.k];if(v==null)v=typeof f.v==="function"?f.v():f.v??"";
  const a=`name="${f.k}" ${f.r?"required":""}`;
  if(f.t==="check")return`<label class="chk"><input type="checkbox" ${a} ${v?"checked":""}>${f.l}</label>`;
  let body;
  if(f.t==="textarea")body=`<textarea ${a} placeholder="${esc(f.p||"")}">${esc(v)}</textarea>`;
  else if(f.t==="select"||f.t==="subj"||f.t==="st"){
    const o=f.t==="subj"?subjOpts(f.none):f.t==="st"?Eng.stOpts():f.o;
    if(f.t==="st")v=(vals.sid||"")+":"+(vals.tid||"");
    body=`<select ${a}>${o.map(x=>`<option value="${esc(x[0])}" ${String(x[0])===String(v)?"selected":""}>${esc(x[1])}</option>`).join("")}</select>`;
  }else body=`<input ${a} type="${f.t||"text"}" value="${esc(v)}" placeholder="${esc(f.p||"")}" ${f.min!=null?`min="${f.min}"`:""} ${f.max!=null?`max="${f.max}"`:""} ${f.t==="number"?'step="1"':""} ${f.t==="text"||!f.t?'maxlength="200"':""}>`;
  return`<label>${f.l}${body}</label>`;
};
function form(title,fields,vals,cb){
  const d=$("#dlg");vals=vals||{};
  d.innerHTML=`<form method="dialog"><h2>${title}</h2>${fields.map(f=>fld(f,vals)).join("")}<p class="err" role="alert"></p><div class="row"><button class="btn ghost" value="x" formnovalidate>Cancel</button><button class="btn" value="ok">Save</button></div></form>`;
  d.showModal();
  $("form",d).onsubmit=e=>{
    if(!e.submitter||e.submitter.value!=="ok")return;
    const fd=new FormData(e.target),o={};
    fields.forEach(f=>{
      if(f.t==="check")o[f.k]=fd.has(f.k);
      else if(f.t==="st"){const[a,b]=String(fd.get(f.k)||"").split(":");o.sid=a||"";o.tid=b||""}
      else if(f.t==="number"||f.num){const n=fd.get(f.k);o[f.k]=n===""||n==null?"":+n}
      else o[f.k]=String(fd.get(f.k)??"").trim();
    });
    const m=cb(o);if(m){e.preventDefault();$(".err",d).textContent=m}
  };
}
function ask(msg,okLabel,cb){
  const d=$("#dlg");
  d.innerHTML=`<form method="dialog"><h2>Are you sure?</h2><p>${esc(msg)}</p><div class="row"><button class="btn ghost" value="x">Cancel</button><button class="btn danger" value="ok">${esc(okLabel||"Delete")}</button></div></form>`;
  d.showModal();$("form",d).onsubmit=e=>{if(e.submitter&&e.submitter.value==="ok")cb()};
}
