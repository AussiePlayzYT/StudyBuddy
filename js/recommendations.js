/* Rule-based recommendation engine (what to study next). */
function recommend(){
  const out=[];
  S.subjects.forEach(s=>{
    const ed=s.exam?daysTo(s.exam):null;
    s.topics.forEach(t=>{
      let sc=(5-t.conf)*8,why=[];
      if(t.conf<=2)why.push("Low confidence");
      if(t.quiz!=null&&t.quiz!==""&&t.quiz<60){sc+=20;why.push("Quiz average "+t.quiz+"%")}
      if(!t.last){sc+=10;why.push("Not studied yet")}
      else{const n=-daysTo(t.last);if(n>14){sc+=15;why.push("Not studied for "+n+" days")}}
      if(ed!=null&&ed>=0&&ed<=14){sc+=(15-ed)*2;why.push("Exam in "+ed+" day"+(ed===1?"":"s"))}
      S.tasks.filter(k=>!k.done&&k.tid===t.id&&daysTo(k.due)<=3).forEach(k=>{sc+=25+(k.pri==="High"?10:0);why.push(k.title+" due "+(daysTo(k.due)<0?"(overdue)":"in "+daysTo(k.due)+"d"))});
      out.push({sid:s.id,tid:t.id,sc,why,min:S.profile.studyMin});
    });
  });
  S.tasks.filter(k=>!k.done&&!k.tid&&daysTo(k.due)<=3).forEach(k=>out.push({sid:k.sid,tid:"",title:k.title,sc:25+(k.pri==="High"?10:0)-daysTo(k.due),why:["Due "+(daysTo(k.due)<0?"(overdue)":"in "+daysTo(k.due)+" days")],min:k.est||S.profile.studyMin}));
  return out.sort((a,b)=>b.sc-a.sc).slice(0,3);
}
