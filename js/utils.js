/* Shared helpers: dates, lookups, progress bars, dialogs. */
const $=s=>document.querySelector(s);
const uid=()=>Math.random().toString(36).slice(2,8);
const esc=v=>String(v??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const iso=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const TODAY=()=>iso(new Date());
const daysTo=s=>Math.round((new Date(s+"T00:00")-new Date(TODAY()+"T00:00"))/864e5);
const addDays=(s,n)=>{const d=new Date(s+"T00:00");d.setDate(d.getDate()+n);return iso(d)};
const monday=s=>{const d=new Date(s+"T00:00");d.setDate(d.getDate()-((d.getDay()+6)%7));return iso(d)};
const fmtD=s=>new Date(s+"T00:00").toLocaleDateString(undefined,{day:"numeric",month:"short"});
const hm=m=>m>=60?Math.floor(m/60)+"h "+(m%60)+"m":m+"m";
const subj=id=>S.subjects.find(s=>s.id===id);
const topic=(sid,tid)=>subj(sid)?.topics.find(t=>t.id===tid);
const label=(sid,tid)=>{const s=subj(sid);if(!s)return "General";const t=topic(sid,tid);return s.name+(t?" – "+t.name:"")};
const bar=(p,ok)=>`<div class="bar ${ok?"ok":""}" role="progressbar" aria-valuenow="${Math.round(p)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${Math.min(100,Math.max(0,p))}%"></i></div>`;
const toast=m=>{const t=$("#toast");t.textContent=m;t.style.display="block";clearTimeout(toast.h);toast.h=setTimeout(()=>t.style.display="none",2200)};
const mins=(from,to,sid)=>S.sessions.filter(x=>x.done&&x.date>=from&&x.date<=to&&(!sid||x.sid===sid)).reduce((a,x)=>a+(x.min||0),0);
const topicOpts=(withNone=true)=>{const o=withNone?[["","No subject"]]:[];S.subjects.forEach(s=>{o.push([s.id+":",s.name+" (general)"]);s.topics.forEach(t=>o.push([s.id+":"+t.id,s.name+" – "+t.name]))});return o};
const split=v=>{const [a,b]=(v||"").split(":");return{sid:a||"",tid:b||""}};
const subjProg=s=>s.topics.length?s.topics.reduce((a,t)=>a+t.conf*20,0)/s.topics.length:0;

function form(title,fields,cb){
  const d=$("#dlg");
  d.innerHTML=`<form method="dialog"><h3>${title}</h3>${fields.map(f=>`<label>${f.l}${f.t==="select"
    ?`<select name="${f.k}">${f.o.map(o=>`<option value="${esc(o[0])}" ${o[0]==f.v?"selected":""}>${esc(o[1])}</option>`).join("")}</select>`
    :`<input name="${f.k}" type="${f.t||"text"}" value="${esc(f.v)}" ${f.r?"required":""} ${f.min!=null?`min="${f.min}"`:""} ${f.max!=null?`max="${f.max}"`:""}>`}</label>`).join("")}
    <div class="row"><button class="btn ghost" value="x" formnovalidate>Cancel</button><button class="btn" value="ok">Save</button></div></form>`;
  d.showModal();
  d.querySelector("form").onsubmit=e=>{if(e.submitter.value==="ok"){cb(Object.fromEntries(new FormData(e.target)));save();render()}};
}
