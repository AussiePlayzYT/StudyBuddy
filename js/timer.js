/* Study timer state and countdown. */
const T={sid:"",tid:"",sess:"",total:S.profile.studyMin*60,left:S.profile.studyMin*60,run:false,iv:null};
const clock=()=>String(Math.floor(T.left/60)).padStart(2,"0")+":"+String(T.left%60).padStart(2,"0");
function tick(){if(!T.run)return;T.left--;if(T.left<=0){T.left=0;T.run=false;clearInterval(T.iv);toast("Time’s up. Finish the session to save it.");if($("#tbtn"))render();return}const e=$("#clock");if(e)e.textContent=clock()}
function startTimer(sid,tid,min,sess){clearInterval(T.iv);Object.assign(T,{sid,tid,sess:sess||"",total:min*60,left:min*60,run:false});if(location.hash==="#timer")render();else location.hash="timer"}
