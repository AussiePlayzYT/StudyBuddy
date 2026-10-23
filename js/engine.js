/* Study engine: statistics, rule-based recommendations, alerts and the persistent timer state. */
const CONF=["","Not started","Learning","Developing","Confident","Mastered"];
const Eng={
  subj:id=>DB.S.subjects.find(s=>s.id===id),
  topic:id=>DB.S.topics.find(t=>t.id===id),
  label(sid,tid){const s=Eng.subj(sid);if(!s)return"General";const t=Eng.topic(tid);return s.name+(t&&t.sid===sid?" – "+t.name:"")},
  stOpts(){const o=[[":","No subject"]];DB.S.subjects.forEach(s=>{o.push([s.id+":",s.name+" (general)"]);DB.S.topics.filter(t=>t.sid===s.id).forEach(t=>o.push([s.id+":"+t.id,s.name+" – "+t.name]))});return o},
  mins(from,to,sid){return DB.S.sessions.filter(x=>x.done&&x.date>=from&&x.date<=to&&(!sid||x.sid===sid)).reduce((a,x)=>a+(+x.min||0),0)},
  sessCount(from,to,sid){return DB.S.sessions.filter(x=>x.done&&x.date>=from&&x.date<=to&&(!sid||x.sid===sid)).length},
  dues(){
    const S=DB.S;
    return[...S.tasks.map(t=>({...t,kind:"task",page:"tasks.html"})),
      ...S.assignments.map(a=>({id:a.id,title:a.title,sid:a.sid,tid:a.tid,due:a.due,done:a.stage==="Completed",pri:"Medium",est:"",kind:"assignment",page:"assignments.html"}))];
  },
  streak(){const days=new Set(DB.S.sessions.filter(x=>x.done).map(x=>x.date));let d=TODAY(),n=0;if(!days.has(d))d=addDays(d,-1);while(days.has(d)){n++;d=addDays(d,-1)}return n},
  subjProg(sid){const t=DB.S.topics.filter(x=>x.sid===sid);return t.length?t.reduce((a,x)=>a+(+x.conf||1)*20,0)/t.length:0},
  cardsDue(){return DB.S.cards.filter(c=>!c.due||c.due<=TODAY())},
  nextExam(sid){return DB.S.exams.filter(e=>e.date&&daysTo(e.date)>=0&&(!sid||e.sid===sid)).sort((a,b)=>a.date<b.date?-1:1)[0]},
  quizAvg(tid){const r=DB.S.results.filter(x=>x.tid===tid);return r.length?Math.round(r.reduce((a,x)=>a+x.score/x.total*100,0)/r.length):""},
  recommend(n=3){
    const S=DB.S,out=[];
    S.topics.forEach(t=>{
      if(!Eng.subj(t.sid))return;
      let sc=(5-(+t.conf||1))*8;const why=[];
      if((+t.conf||1)<=2)why.push("Low confidence");
      if(t.quiz!==""&&t.quiz!=null&&t.quiz<60){sc+=20;why.push("Quiz average "+t.quiz+"%")}
      if(!t.last){sc+=10;why.push("Not studied yet")}else{const d=-daysTo(t.last);if(d>14){sc+=15;why.push("Not studied for "+d+" days")}}
      const e=Eng.nextExam(t.sid);if(e){const d=daysTo(e.date);if(d<=14){sc+=(15-d)*2;why.push(e.name+" in "+d+" day"+(d===1?"":"s"))}}
      Eng.dues().filter(k=>!k.done&&k.tid===t.id&&daysTo(k.due)<=3).forEach(k=>{sc+=25;why.push(k.title+(daysTo(k.due)<0?" is overdue":" due in "+daysTo(k.due)+"d"))});
      if(sc>0)out.push({sid:t.sid,tid:t.id,title:Eng.label(t.sid,t.id),sc,why,min:+S.profile.studyMin||45});
    });
    Eng.dues().filter(k=>!k.done&&!k.tid&&daysTo(k.due)<=3).forEach(k=>out.push({sid:k.sid,tid:"",title:k.title,sc:25-daysTo(k.due),why:[daysTo(k.due)<0?"Overdue":"Due in "+daysTo(k.due)+" day"+(daysTo(k.due)===1?"":"s")],min:+k.est||+S.profile.studyMin||45}));
    const c=Eng.cardsDue().length;if(c)out.push({title:"Review "+c+" flashcard"+(c===1?"":"s"),sc:15+c,why:["Spaced repetition says they are due"],min:Math.min(20,Math.max(5,c)),href:"flashcards.html"});
    return out.sort((a,b)=>b.sc-a.sc).slice(0,n);
  },
  alerts(){
    const S=DB.S,a=[];if(!S.settings.reminders)return a;
    Eng.dues().filter(k=>!k.done).forEach(k=>{const d=daysTo(k.due);if(d<0)a.push({lvl:"High",t:`${k.title} is overdue (was due ${fmtD(k.due)})`,href:k.page});else if(d<=2)a.push({lvl:"Medium",t:`${k.title} is due ${d===0?"today":d===1?"tomorrow":"in 2 days"}`,href:k.page})});
    S.exams.forEach(e=>{const d=e.date?daysTo(e.date):-1;if(d>=0&&d<=7)a.push({lvl:"High",t:`${e.name} is ${d===0?"today":"in "+d+" day"+(d===1?"":"s")}`,href:"exams.html"})});
    const missed=S.sessions.filter(x=>!x.done&&x.date<TODAY()).length;if(missed)a.push({lvl:"Medium",t:`${missed} planned study session${missed===1?"":"s"} missed`,href:"planner.html"});
    const c=Eng.cardsDue().length;if(c)a.push({lvl:"Low",t:`${c} flashcard${c===1?"":"s"} due for review`,href:"flashcards.html"});
    if(Eng.streak()>0&&!Eng.mins(TODAY(),TODAY())&&new Date().getHours()>=17)a.push({lvl:"Medium",t:`Study today to keep your ${Eng.streak()}-day streak`,href:"timer.html"});
    return a;
  }
};
/* Timer state lives in localStorage so it survives page changes. */
const Tm={
  k:()=>"sp:timer:"+Auth.user().id,
  get(){try{return JSON.parse(localStorage.getItem(Tm.k()))}catch(e){return null}},
  set(o){try{o?localStorage.setItem(Tm.k(),JSON.stringify(o)):localStorage.removeItem(Tm.k())}catch(e){}},
  left:s=>s.end?Math.max(0,Math.ceil((s.end-Date.now())/1000)):s.left
};
