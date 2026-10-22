/* App start-up */
const logoutLink=document.getElementById("logout");
if(logoutLink)logoutLink.onclick=e=>{e.preventDefault();Auth.logout()};
render();
