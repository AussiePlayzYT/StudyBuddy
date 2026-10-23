/* Data layer: every page reads and writes through DB. To move to a cloud database later, change only this file. */
const DB=(()=>{
  const blank=()=>({
    profile:{name:"",year:"",grad:"",school:"",avatar:"",dailyGoal:120,weeklyGoal:10,studyMin:45,breakMin:10,prefTime:"any"},
    settings:{theme:"auto",font:100,reminders:true},
    subjects:[],topics:[],tasks:[],assignments:[],sessions:[],goals:[],notes:[],resources:[],stickies:[],quizzes:[],results:[],cards:[],exams:[]
  });
  const LINKED=["tasks","assignments","sessions","notes","resources","quizzes","cards","exams","goals","results"];
  let S=blank(),key="sp:data:guest";
  const merge=o=>{
    const b=blank();if(!o||typeof o!=="object"||Array.isArray(o))return b;
    for(const k of Object.keys(b)){
      if(Array.isArray(b[k]))b[k]=Array.isArray(o[k])?o[k].filter(x=>x&&typeof x==="object"&&typeof x.id==="string"):[];
      else if(o[k]&&typeof o[k]==="object")Object.assign(b[k],o[k]);
    }
    return b;
  };
  const D={
    get S(){return S},
    init(uid){key="sp:data:"+uid;try{S=merge(JSON.parse(localStorage.getItem(key)))}catch(e){S=blank()}return S},
    save(){try{localStorage.setItem(key,JSON.stringify(S));return true}catch(e){D.failed=true;return false}},
    uid:()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6),
    add(c,o){o.id=D.uid();S[c].push(o);D.save();return o.id},
    upd(c,id,p){const o=S[c].find(x=>x.id===id);if(o)Object.assign(o,p);D.save()},
    del(c,id){
      S[c]=S[c].filter(x=>x.id!==id);
      if(c==="subjects"){S.topics=S.topics.filter(t=>t.sid!==id);LINKED.forEach(k=>S[k].forEach(x=>{if(x.sid===id){x.sid="";x.tid=""}}))}
      if(c==="topics")LINKED.forEach(k=>S[k].forEach(x=>{if(x.tid===id)x.tid=""}));
      D.save();
    },
    export:()=>JSON.stringify({app:"study-platform",version:1,exported:new Date().toISOString(),data:S},null,2),
    import(txt){const j=JSON.parse(txt);const d=j&&j.data?j.data:j;if(!d||typeof d!=="object"||Array.isArray(d))throw new Error("That isn't a valid backup file.");S=merge(d);D.save()},
    wipe(){S=blank();D.save()}
  };
  return D;
})();
