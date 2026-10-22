/* Data layer: the only place that reads or writes saved data. Swap this for IndexedDB or a cloud database later. */
const KEY="study-platform-v1";
const blank=()=>({profile:{name:"Student",year:12,school:"",grad:2026,dailyGoal:120,weeklyGoal:10,studyMin:45,breakMin:10},subjects:[],tasks:[],sessions:[],goals:[]});
const DB={
  load(){try{const s=localStorage.getItem(KEY);if(s)return Object.assign(blank(),JSON.parse(s))}catch(e){}return blank()},
  save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}
};
let S=DB.load();
const save=()=>DB.save();
