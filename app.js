const K_MED="meds_cal_v2",K_HIST="hist_cal_v2",K_APPT="appointments_v2",K_SERVER="pzn_server_url",K_THEME="theme";
let meds=JSON.parse(localStorage.getItem(K_MED)||"[]"),hist=JSON.parse(localStorage.getItem(K_HIST)||"[]"),appts=JSON.parse(localStorage.getItem(K_APPT)||"[]"),editId=null;
const $=id=>document.getElementById(id),ids=["name","substance","strength","manufacturer","pzn","packSize","stock","dosePerTake","limit","times","note"],today=()=>new Date().toISOString().slice(0,10),save=()=>{localStorage.setItem(K_MED,JSON.stringify(meds));localStorage.setItem(K_HIST,JSON.stringify(hist));localStorage.setItem(K_APPT,JSON.stringify(appts))},esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m])),times=s=>String(s||"").split(",").map(x=>x.trim()).filter(Boolean),fmt=d=>d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"}),now=()=>new Date().toLocaleString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"});
if(localStorage.getItem(K_THEME)==="dark")document.body.classList.add("dark");$("serverUrl").value=localStorage.getItem(K_SERVER)||"http://localhost:5000";

function page(n){document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));$("page-"+n).classList.add("active");document.querySelectorAll("nav button").forEach(b=>b.classList.toggle("active",b.dataset.page===n));scrollTo({top:0,behavior:"smooth"})}
document.querySelectorAll("[data-page]").forEach(b=>b.onclick=()=>page(b.dataset.page));$("quickAddBtn").onclick=()=>newForm();$("newMedBtn").onclick=()=>newForm();

function normalizePzn(v){let s=String(v||"").replace(/\D/g,"");if(s.length>8)s=s.slice(-8);return s.replace(/^0+/,"")||s}
function normalizeDate(v){
  v=String(v||"").trim();
  if(!v)return "";
  if(/^\d{4}-\d{2}-\d{2}$/.test(v))return v;
  let m=v.match(/^(\d{1,2})[.\-/ ]+(\d{1,2})[.\-/ ]+(\d{4})$/);
  if(m){return `${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`;}
  return "";
}
async function lookupPzn(){const pzn=normalizePzn($("pzn").value),server=($("serverUrl").value||"").replace(/\/$/,"");if(!server||!pzn){alert("Server-URL und PZN prüfen.");return}$("lookupInfo").textContent="PZN wird gesucht...";try{const r=await fetch(`${server}/api/pzn/${pzn}`);if(!r.ok){$("lookupInfo").textContent="PZN nicht gefunden.";return}const d=await r.json();$("name").value=d.name||"";$("substance").value=d.substance||"";$("strength").value=d.strength||"";$("manufacturer").value=d.manufacturer||"";if(d.packSize)$("packSize").value=d.packSize;$("lookupInfo").textContent="PZN gefunden."}catch{$("lookupInfo").textContent="PZN-Server nicht erreichbar."}}

function calc(m){const takes=(m.times?.length||1),dose=Number(m.dosePerTake||1)*takes,days=Math.floor(Number(m.stock||0)/Math.max(dose,.1)),usable=Number(m.stock||0)-Number(m.limit||0),remind=usable<=0?0:Math.floor(usable/Math.max(dose,.1));const reminder=new Date();reminder.setDate(reminder.getDate()+remind);return{days,remind,reminder}}
function status(m){const c=calc(m);if(Number(m.stock)<=Number(m.limit))return["crit","Sofort bestellen"];if(c.remind<=7)return["warn","Bald bestellen"];return["ok","Ausreichend"]}
function taken(m,t){return hist.some(h=>h.type==="taken"&&h.medId===m.id&&h.date===today()&&h.time===t)}
function dueItems(){let a=[];meds.forEach(m=>(m.times?.length?m.times:["manuell"]).forEach(t=>{if(!taken(m,t))a.push([m,t])}));return a}
function sortedAppts(){return appts.slice().sort((a,b)=>(a.date+(a.time||"")).localeCompare(b.date+(b.time||"")))}
function upcomingAppts(){return sortedAppts().filter(a=>a.date>=today())}

function render(){$("total").textContent=meds.length;$("due").textContent=dueItems().length;$("critical").textContent=meds.filter(m=>status(m)[0]==="crit").length;$("todayTitle").textContent=dueItems().length?`${dueItems().length} Einnahme(n) offen`:"Alles erledigt";renderToday();renderOrders();renderHistory();renderMeds();renderAppointments()}
function renderToday(){const d=dueItems();$("todayList").innerHTML=d.length?"":'<div class="muted">Heute ist alles erledigt.</div>';d.slice(0,6).forEach(([m,t])=>$("todayList").insertAdjacentHTML("beforeend",`<div class="item"><b>${esc(m.name)}</b> <span class="badge">${esc(t)}</span><button class="green" onclick="take(${m.id},'${esc(t)}')">Eingenommen</button></div>`))}
function renderOrders(){const o=meds.filter(m=>status(m)[0]!=="ok");$("orderPreview").innerHTML=o.length?"":"Aktuell muss nichts nachbestellt werden.";$("orderList").innerHTML=o.length?"":"Aktuell muss nichts nachbestellt werden.";o.forEach(m=>{$("orderList").insertAdjacentHTML("beforeend",`• ${esc(m.name)} | PZN: ${esc(m.pzn||"-")} | Bestand: ${esc(m.stock)}<br>`)});o.slice(0,4).forEach(m=>$("orderPreview").insertAdjacentHTML("beforeend",`<div class="item"><b>${esc(m.name)}</b><br><span class="muted">Rest: ${esc(m.stock)} Stück</span></div>`))}
function dateDe(v){if(!v)return"";const [y,m,d]=v.split("-");return `${d}.${m}.${y}`}
function apptHtml(a,del){return `<div class="item"><b>${esc(a.title)}</b><br>${esc(dateDe(a.date))}${a.time?` · ${esc(a.time)} Uhr`:""}${a.location?`<br><span class="muted">${esc(a.location)}</span>`:""}${a.note?`<br><span class="muted">${esc(a.note)}</span>`:""}${del?`<button class="danger" onclick="deleteAppt(${a.id})">Termin löschen</button>`:""}</div>`}
function renderAppointments(){const up=upcomingAppts();$("appointmentPreview").innerHTML=up.length?"":'<div class="muted">Keine kommenden Termine.</div>';$("appointmentList").innerHTML=appts.length?"":'<div class="muted">Noch keine Termine.</div>';up.slice(0,3).forEach(a=>$("appointmentPreview").insertAdjacentHTML("beforeend",apptHtml(a,false)));sortedAppts().forEach(a=>$("appointmentList").insertAdjacentHTML("beforeend",apptHtml(a,true)))}
function renderHistory(){$("historyList").innerHTML=hist.length?"":'<div class="muted">Noch kein Protokoll.</div>';hist.slice().reverse().slice(0,50).forEach(h=>$("historyList").insertAdjacentHTML("beforeend",`<div class="item"><b>${esc(h.medName)}</b><br>${h.type==="taken"?"Eingenommen":"Neue Packung"} · ${esc(h.time)}<br><span class="muted">${esc(h.created)}</span></div>`))}
function renderMeds(){$("medList").innerHTML=meds.length?"":'<div class="item muted">Noch kein Medikament.</div>';meds.forEach(m=>{const c=calc(m),s=status(m);$("medList").insertAdjacentHTML("beforeend",`<div class="med ${s[0]}"><h3>💊 ${esc(m.name)} <span class="badge ${s[0]}">${s[1]}</span></h3>Bestand: <b>${esc(m.stock)}</b><br>Einnahmezeiten: <b>${esc((m.times||[]).join(", ")||"manuell")}</b><br>Reicht noch: <b>${c.days} Tage</b><br>Nachbestellen ab: <b>${fmt(c.reminder)}</b><div class="grid"><button class="green" onclick="take(${m.id},'manuell')">Jetzt eingenommen</button><button class="orange" onclick="pack(${m.id})">Neue Packung</button><button onclick="edit(${m.id})">Bearbeiten</button><button class="danger" onclick="delMed(${m.id})">Löschen</button></div></div>`)});}

function readForm(){return{id:editId||Date.now(),name:$("name").value.trim(),substance:$("substance").value.trim(),strength:$("strength").value.trim(),manufacturer:$("manufacturer").value.trim(),pzn:normalizePzn($("pzn").value),packSize:+$("packSize").value,stock:+$("stock").value,dosePerTake:+$("dosePerTake").value,limit:+$("limit").value,times:times($("times").value),note:$("note").value.trim()}}
function clearForm(){editId=null;ids.forEach(id=>$(id).value="");$("dosePerTake").value=1;$("limit").value=10;$("formTitle").textContent="Medikament anlegen"}
function newForm(){clearForm();page("form")}
function saveForm(){const m=readForm();if(!m.name||m.packSize<1||m.stock<0||m.dosePerTake<=0||m.limit<0){alert("Bitte Pflichtfelder ausfüllen.");return}meds=editId?meds.map(x=>x.id===editId?m:x):[...meds,m];save();clearForm();render();page("meds")}
function edit(id){const m=meds.find(x=>x.id===id);editId=id;ids.forEach(k=>$(k).value=k==="times"?(m.times||[]).join(", "):(m[k]??""));$("formTitle").textContent="Medikament bearbeiten";page("form")}
function delMed(id){if(confirm("Medikament löschen?")){meds=meds.filter(m=>m.id!==id);save();render()}}
function take(id,t){const m=meds.find(x=>x.id===id);m.stock=Math.max(0,Number(m.stock)-Number(m.dosePerTake||1));hist.push({id:Date.now(),medId:id,medName:m.name,type:"taken",time:t,date:today(),created:now()});save();render()}
function pack(id){const m=meds.find(x=>x.id===id);m.stock=Number(m.stock)+Number(m.packSize||0);hist.push({id:Date.now(),medId:id,medName:m.name,type:"pack",time:"Packung",date:today(),created:now()});save();render()}

function saveAppt(){
  const title=$("apptTitle").value.trim();
  const date=normalizeDate($("apptDate").value);
  const time=$("apptTime").value;
  const location=$("apptLocation").value.trim();
  const note=$("apptNote").value.trim();
  if(!title||!date){$("apptInfo").textContent="Bitte Titel und Datum eintragen.";alert("Bitte Titel und Datum eintragen.");return}
  appts.push({id:Date.now(),title,date,time,location,note});
  ["apptTitle","apptDate","apptTime","apptLocation","apptNote"].forEach(id=>$(id).value="");
  $("apptInfo").textContent="Termin wurde gespeichert.";
  save();render();
}
function deleteAppt(id){if(confirm("Termin löschen?")){appts=appts.filter(a=>a.id!==id);save();render()}}

function exportBackup(){const blob=new Blob([JSON.stringify({version:"calendar-v2",meds,hist,appts},null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="tabletten-backup-kalender-v2.json";a.click()}
function importBackup(f){const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);meds=d.meds||[];hist=d.hist||[];appts=d.appts||[];save();render();alert("Backup importiert.")}catch{alert("Backup ungültig.")}};r.readAsText(f)}
function copyOrders(){const o=meds.filter(m=>status(m)[0]!=="ok").map(m=>`- ${m.name} | PZN: ${m.pzn||"-"} | Bestand: ${m.stock}`).join("\\n")||"Aktuell muss nichts nachbestellt werden.";navigator.clipboard?.writeText(o).then(()=>alert("Kopiert."),()=>alert(o))}

$("lookupBtn").onclick=lookupPzn;$("saveBtn").onclick=saveForm;$("cancelBtn").onclick=()=>{clearForm();page("meds")};$("saveApptBtn").onclick=saveAppt;$("saveServerBtn").onclick=()=>{localStorage.setItem(K_SERVER,($("serverUrl").value||"").replace(/\/$/,""));alert("Server gespeichert.")};$("exportBtn").onclick=exportBackup;$("importBtn").onclick=()=>$("importFile").click();$("importFile").onchange=e=>e.target.files[0]&&importBackup(e.target.files[0]);$("clearHistoryBtn").onclick=()=>{if(confirm("Protokoll löschen?")){hist=[];save();render()}};$("copyOrderBtn").onclick=copyOrders;$("themeBtn").onclick=()=>{document.body.classList.toggle("dark");localStorage.setItem(K_THEME,document.body.classList.contains("dark")?"dark":"light")};
if("serviceWorker" in navigator)navigator.serviceWorker.register("service-worker.js");render();