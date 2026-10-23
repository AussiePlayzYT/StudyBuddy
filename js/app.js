/* App start-up */
const logoutLink=document.getElementById("logout");
if(logoutLink)logoutLink.onclick=e=>{e.preventDefault();Auth.logout()};
const me=document.getElementById("me");
if(me){const p=S.profile,av=document.createElement(p.avatar?"img":"span");
  av.className="av";if(p.avatar){av.src=p.avatar;av.alt=""}else av.textContent=(p.name||"?")[0].toUpperCase();
  const nm=document.createElement("span");nm.textContent=p.name;me.append(av,nm)}
render();
