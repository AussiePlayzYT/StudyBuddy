/* Hash router and sidebar rendering. */
function render(){
  const r=location.hash.slice(1)||"dashboard",i=r.indexOf("-"),a=i<0?r:r.slice(0,i),rest=i<0?"":r.slice(i+1);
  const key=a==="subject"&&rest?"subject":a==="soon"?"soon":(V[a]?a:"dashboard");
  $("#nav").innerHTML=NAV.map(n=>n[0]==="–"?"<hr>":`<a href="#${n[0]}" class="${n[0]===r||(n[0]==="subjects"&&a==="subject")?"on":""} ${n[0].startsWith("soon")?"soon":""}" ${n[0]===r?'aria-current="page"':""}>${n[1]}</a>`).join("");
  $("#main").innerHTML=V[key](rest);
  document.title=(key[0].toUpperCase()+key.slice(1))+" · Study Platform";
}
addEventListener("hashchange",()=>{render();scrollTo(0,0)});
