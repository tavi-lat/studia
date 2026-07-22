const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const KEY="planner-v3";
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2);
const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const today=()=>iso(new Date());
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
let db=JSON.parse(localStorage.getItem(KEY)||"null")||{tasks:[],subjects:[],habits:[],reminders:[],schedule:[],schedulePhoto:""};
let selectedDate=today(),calendarDate=new Date(),calendarView="month",taskFilter="today";
let habitDate=new Date();
let simpleConfig=null,clockMode="pomodoro",clockSeconds=1500,clockInitial=1500,clockInterval=null,pomo={focus:25,short:5,long:15,sessions:4};

function save(){localStorage.setItem(KEY,JSON.stringify(db));renderAll()}
function monday(d){const x=new Date(d);const n=(x.getDay()+6)%7;x.setDate(x.getDate()-n);x.setHours(12,0,0,0);return x}
function formatDate(v,o={weekday:"short",day:"numeric",month:"short"}){return new Intl.DateTimeFormat("ca-ES",o).format(new Date(v+"T12:00"))}
function endOfWeek(){const m=monday(new Date());const s=new Date(m);s.setDate(m.getDate()+6);return iso(s)}
function subjectName(id){return db.subjects.find(s=>s.id===id)?.name||""}

function renderAll(){renderHeader();renderTasks();renderCalendar();renderSubjects();renderHabits();renderReminders();renderSchedule();renderTaskSubjects();renderClock()}
function renderHeader(){$("#todayLabel").textContent=new Intl.DateTimeFormat("ca-ES",{weekday:"long",day:"numeric",month:"long"}).format(new Date())}

function renderTasks(){
 let list=db.tasks.filter(t=>!t.done);
 if(taskFilter==="today")list=list.filter(t=>t.date===today());
 if(taskFilter==="week"){const m=iso(monday(new Date()));list=list.filter(t=>t.date>=m&&t.date<=endOfWeek())}
 list.sort((a,b)=>a.date.localeCompare(b.date));
 $("#taskList").innerHTML=list.length?list.map(t=>`<article class="task">
 <button class="check ${t.done?"done":""}" data-toggle-task="${t.id}"></button>
 <div class="task-main" data-edit-task="${t.id}"><strong>${esc(t.title)}</strong><div class="meta">${formatDate(t.date)}${t.subject?" · "+esc(subjectName(t.subject)):""}</div></div>
 <span class="type-badge">${esc(t.type||"Tasca")}</span></article>`).join(""):`<div class="empty">No hi ha tasques en aquesta vista.</div>`;
}
function renderTaskSubjects(){$("#taskSubject").innerHTML='<option value="">Cap</option>'+db.subjects.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join("")}

function renderCalendar(){
 $$(".seg[data-calendar-view]").forEach(b=>b.classList.toggle("active",b.dataset.calendarView===calendarView));
 const c=$("#calendar");
 if(calendarView==="month"){
  $("#periodTitle").textContent=new Intl.DateTimeFormat("ca-ES",{month:"long",year:"numeric"}).format(calendarDate);
  const first=new Date(calendarDate.getFullYear(),calendarDate.getMonth(),1,12),start=monday(first);
  let html='<div class="weekdays">'+["Dl","Dt","Dc","Dj","Dv","Ds","Dg"].map(x=>`<div>${x}</div>`).join("")+'</div><div class="days">';
  for(let i=0;i<42;i++){const d=new Date(start);d.setDate(start.getDate()+i);const id=iso(d);html+=`<button class="day ${d.getMonth()!==calendarDate.getMonth()?"muted":""} ${id===today()?"today":""} ${id===selectedDate?"selected":""}" data-date="${id}">${d.getDate()}${db.tasks.some(t=>t.date===id&&!t.done)?'<i class="dot"></i>':""}</button>`}
  c.innerHTML=html+"</div>";
 }else if(calendarView==="week"){
  const m=monday(calendarDate),s=new Date(m);s.setDate(m.getDate()+6);$("#periodTitle").textContent=`${formatDate(iso(m))} – ${formatDate(iso(s))}`;
  c.innerHTML='<div class="week-cards">'+Array.from({length:7},(_,i)=>{const d=new Date(m);d.setDate(m.getDate()+i);const id=iso(d),count=db.tasks.filter(t=>t.date===id&&!t.done).length;return `<button class="week-card ${id===selectedDate?"selected":""}" data-date="${id}"><strong>${new Intl.DateTimeFormat("ca-ES",{weekday:"short",day:"numeric"}).format(d)}</strong><span>${count} pendents</span></button>`}).join("")+"</div>";
 }else{
  const id=iso(calendarDate);$("#periodTitle").textContent=formatDate(id,{weekday:"long",day:"numeric",month:"long"});
  const ts=db.tasks.filter(t=>t.date===id);
  c.innerHTML=ts.length?ts.map(t=>`<article class="task" data-edit-task="${t.id}"><div class="task-main"><strong>${esc(t.title)}</strong><div class="meta">${esc(subjectName(t.subject)||"General")}</div></div><span class="type-badge">${esc(t.type||"Tasca")}</span></article>`).join(""):`<div class="empty">No hi ha res programat.</div>`;
 }
}

function renderSubjects(){
 $("#subjectsList").innerHTML=db.subjects.length?db.subjects.map(s=>{
  const tasks=db.tasks.filter(t=>t.subject===s.id).sort((a,b)=>a.date.localeCompare(b.date));
  return `<article class="subject-block"><div class="subject-head"><h3><i class="subject-color" style="background:${s.color}"></i>${esc(s.name)}</h3><button class="text-btn" data-delete-subject="${s.id}">Eliminar</button></div>
  ${tasks.length?tasks.map(t=>`<div class="subject-task" data-edit-task="${t.id}"><strong>${esc(t.title)}</strong><div class="meta">${formatDate(t.date)} · ${t.done?"Completada":"Pendent"} · ${esc(t.type||"Tasca")}</div></div>`).join(""):'<div class="empty">Sense tasques.</div>'}</article>`;
 }).join(""):'<div class="empty">Crea assignatures per ordenar les tasques.</div>';
}

function renderHabits(){
 const y=habitDate.getFullYear(),m=habitDate.getMonth(),daysIn=new Date(y,m+1,0).getDate(),firstDay=(new Date(y,m,1).getDay()+6)%7;
 $("#habitMonthTitle").textContent=new Intl.DateTimeFormat("ca-ES",{month:"long",year:"numeric"}).format(habitDate);
 $("#habitsList").innerHTML=db.habits.length?db.habits.map(h=>{
  let cells="";for(let i=0;i<firstDay;i++)cells+='<span class="habit-day blank"></span>';
  for(let d=1;d<=daysIn;d++){const id=iso(new Date(y,m,d));cells+=`<button class="habit-day ${(h.days||{})[id]?"on":""}" data-habit="${h.id}" data-habit-date="${id}">${d}</button>`}
  return `<article class="habit-card"><div class="habit-head"><div><h3>${esc(h.name)}</h3></div><button class="text-btn" data-delete-habit="${h.id}">Eliminar</button></div>
  <div class="weekdays">${["Dl","Dt","Dc","Dj","Dv","Ds","Dg"].map(x=>`<div>${x}</div>`).join("")}</div><div class="habit-month">${cells}</div></article>`;
 }).join(""):'<div class="empty">Encara no has creat cap hàbit.</div>';
}

function renderReminders(){
 const m=iso(monday(new Date())),e=endOfWeek();
 const taskReminders=db.tasks.filter(t=>t.reminder&&t.reminder>=m&&t.reminder<=e).map(t=>({id:"task-"+t.id,title:t.title,date:t.reminder,source:"Tasca"}));
 const items=[...db.reminders.filter(r=>r.date>=m&&r.date<=e),...taskReminders].sort((a,b)=>a.date.localeCompare(b.date));
 $("#remindersList").innerHTML=items.length?items.map(r=>`<article class="reminder-card"><div class="reminder-day">${formatDate(r.date,{weekday:"long",day:"numeric",month:"long"})}</div><strong>${esc(r.title)}</strong><div class="meta">${esc(r.source||"Recordatori")}</div>${String(r.id).startsWith("task-")?"":`<button class="text-btn" data-delete-reminder="${r.id}">Eliminar</button>`}</article>`).join(""):'<div class="empty">No hi ha recordatoris aquesta setmana.</div>';
}

function renderSchedule(){
 const days=["Dilluns","Dimarts","Dimecres","Dijous","Divendres"];
 $("#scheduleGrid").innerHTML=days.map((day,i)=>{
  const items=db.schedule.filter(x=>Number(x.day)===i).sort((a,b)=>a.start.localeCompare(b.start));
  return `<div class="schedule-col"><h3>${day}</h3>${items.length?items.map(x=>`<article class="schedule-item"><button class="schedule-delete" data-delete-schedule="${x.id}">×</button><span class="schedule-time">${esc(x.start)}–${esc(x.end)}</span><strong>${esc(x.name)}</strong><div class="meta">${esc(x.place||"")}</div></article>`).join(""):'<div class="meta">Sense classes</div>'}</div>`;
 }).join("");
 $("#schedulePhotoPreview").innerHTML=db.schedulePhoto?`<img src="${db.schedulePhoto}" alt="Horari pujat">`:"";
}

function renderClock(){
 $$(".seg[data-clock-mode]").forEach(b=>b.classList.toggle("active",b.dataset.clockMode===clockMode));
 if(clockMode==="clock"){
  $("#clockDisplay").textContent=new Intl.DateTimeFormat("ca-ES",{hour:"2-digit",minute:"2-digit",second:"2-digit"}).format(new Date());
  $("#clockControls").innerHTML=`<div class="meta">${new Intl.DateTimeFormat("ca-ES",{weekday:"long",day:"numeric",month:"long",year:"numeric"}).format(new Date())}</div>`;
  return;
 }
 const m=Math.floor(clockSeconds/60),s=clockSeconds%60;$("#clockDisplay").textContent=`${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
 if(clockMode==="pomodoro"){
  $("#clockControls").innerHTML=`<div class="clock-settings"><label>Focus<input id="pFocus" type="number" value="${pomo.focus}" min="1"></label><label>Descans<input id="pShort" type="number" value="${pomo.short}" min="1"></label><label>Descans llarg<input id="pLong" type="number" value="${pomo.long}" min="1"></label></div><div class="clock-controls"><button class="dark compact" id="clockStart">${clockInterval?"Pausar":"Començar"}</button><button class="soft compact" id="clockReset">Reiniciar</button></div>`;
 }else{
  $("#clockControls").innerHTML=`<div class="clock-settings"><label>Minuts<input id="timerMinutes" type="number" value="${Math.floor(clockInitial/60)}" min="0"></label></div><div class="clock-controls"><button class="dark compact" id="clockStart">${clockInterval?"Pausar":"Començar"}</button><button class="soft compact" id="clockReset">Reiniciar</button></div>`;
 }
 $("#clockStart")?.addEventListener("click",toggleClock);$("#clockReset")?.addEventListener("click",resetClock);
 $("#pFocus")?.addEventListener("change",e=>{pomo.focus=Number(e.target.value);clockInitial=pomo.focus*60;clockSeconds=clockInitial;renderClock()});
 $("#pShort")?.addEventListener("change",e=>pomo.short=Number(e.target.value));
 $("#pLong")?.addEventListener("change",e=>pomo.long=Number(e.target.value));
 $("#timerMinutes")?.addEventListener("change",e=>{clockInitial=Number(e.target.value)*60;clockSeconds=clockInitial;renderClock()});
}
function toggleClock(){if(clockInterval){clearInterval(clockInterval);clockInterval=null;renderClock();return}clockInterval=setInterval(()=>{clockSeconds--;if(clockSeconds<=0){clearInterval(clockInterval);clockInterval=null;alert("Temps completat");clockSeconds=clockInitial}renderClock()},1000);renderClock()}
function resetClock(){clearInterval(clockInterval);clockInterval=null;clockSeconds=clockInitial;renderClock()}

function openTask(t=null,date=selectedDate){
 $("#taskDialogTitle").textContent=t?"Editar tasca":"Nova tasca";$("#taskId").value=t?.id||"";$("#taskTitle").value=t?.title||"";$("#taskDate").value=t?.date||date;$("#taskSubject").value=t?.subject||"";$("#taskPriority").value=t?.priority||"Normal";$("#taskType").value=t?.type||"Examen";$("#taskReminder").value=t?.reminder||"";$("#taskComments").value=t?.comments||"";$("#deleteTaskBtn").classList.toggle("hidden",!t);$("#taskDialog").showModal()
}
function openSimple(title,fields,onSave){simpleConfig={fields,onSave};$("#simpleTitle").textContent=title;$("#simpleFields").innerHTML=fields.map(f=>`<label>${f.label}<input id="sf-${f.name}" type="${f.type||"text"}" value="${esc(f.value||"")}" ${f.required?"required":""}></label>`).join("");$("#simpleDialog").showModal()}

document.addEventListener("click",e=>{
 const screen=e.target.closest("[data-screen]");if(screen){showScreen(screen.dataset.screen);return}
 const date=e.target.closest("[data-date]");if(date){selectedDate=date.dataset.date;calendarDate=new Date(selectedDate+"T12:00");renderCalendar();return}
 const toggle=e.target.closest("[data-toggle-task]");if(toggle){const t=db.tasks.find(x=>x.id===toggle.dataset.toggleTask);t.done=!t.done;save();return}
 const edit=e.target.closest("[data-edit-task]");if(edit){openTask(db.tasks.find(x=>x.id===edit.dataset.editTask));return}
 const habit=e.target.closest("[data-habit]");if(habit){const h=db.habits.find(x=>x.id===habit.dataset.habit);h.days=h.days||{};h.days[habit.dataset.habitDate]=!h.days[habit.dataset.habitDate];save();return}
 if(e.target.dataset.deleteHabit){db.habits=db.habits.filter(x=>x.id!==e.target.dataset.deleteHabit);save()}
 if(e.target.dataset.deleteReminder){db.reminders=db.reminders.filter(x=>x.id!==e.target.dataset.deleteReminder);save()}
 if(e.target.dataset.deleteSchedule){db.schedule=db.schedule.filter(x=>x.id!==e.target.dataset.deleteSchedule);save()}
 if(e.target.dataset.deleteSubject){db.tasks.forEach(t=>{if(t.subject===e.target.dataset.deleteSubject)t.subject=""});db.subjects=db.subjects.filter(x=>x.id!==e.target.dataset.deleteSubject);save()}
 const close=e.target.closest("[data-close-dialog]");if(close)$("#"+close.dataset.closeDialog).close()
});

function showScreen(id){$$(".screen").forEach(s=>s.classList.toggle("active",s.id===id));$$(".nav-item").forEach(n=>n.classList.toggle("active",n.dataset.screen===id));$("#menuSheet").classList.remove("open");window.scrollTo({top:0,behavior:"smooth"})}
$("#menuBtn").onclick=()=>$("#menuSheet").classList.add("open");$("#closeMenu").onclick=()=>$("#menuSheet").classList.remove("open");
$("#addTaskBtn").onclick=()=>openTask();
$$("[data-task-filter]").forEach(b=>b.onclick=()=>{taskFilter=b.dataset.taskFilter;$$("[data-task-filter]").forEach(x=>x.classList.toggle("active",x===b));renderTasks()});
$$("[data-calendar-view]").forEach(b=>b.onclick=()=>{calendarView=b.dataset.calendarView;renderCalendar()});
$("#prevPeriod").onclick=()=>{calendarView==="month"?calendarDate.setMonth(calendarDate.getMonth()-1):calendarView==="week"?calendarDate.setDate(calendarDate.getDate()-7):calendarDate.setDate(calendarDate.getDate()-1);renderCalendar()};
$("#nextPeriod").onclick=()=>{calendarView==="month"?calendarDate.setMonth(calendarDate.getMonth()+1):calendarView==="week"?calendarDate.setDate(calendarDate.getDate()+7):calendarDate.setDate(calendarDate.getDate()+1);renderCalendar()};

$("#taskForm").onsubmit=e=>{e.preventDefault();const id=$("#taskId").value,obj={id:id||uid(),title:$("#taskTitle").value.trim(),date:$("#taskDate").value,subject:$("#taskSubject").value,priority:$("#taskPriority").value,type:$("#taskType").value,reminder:$("#taskReminder").value,comments:$("#taskComments").value,done:false};if(id){const old=db.tasks.find(x=>x.id===id);obj.done=old.done;db.tasks=db.tasks.map(x=>x.id===id?obj:x)}else db.tasks.push(obj);save();$("#taskDialog").close()};
$("#deleteTaskBtn").onclick=()=>{db.tasks=db.tasks.filter(x=>x.id!==$("#taskId").value);save();$("#taskDialog").close()};

$("#addSubjectBtn").onclick=()=>openSimple("Nova assignatura",[{name:"name",label:"Nom",required:true},{name:"color",label:"Color",type:"color",value:"#8c7258"}],v=>{db.subjects.push({id:uid(),name:v.name,color:v.color});save()});
$("#addHabitBtn").onclick=()=>openSimple("Nou hàbit",[{name:"name",label:"Nom",required:true}],v=>{db.habits.push({id:uid(),name:v.name,days:{}});save()});
$("#habitPrev").onclick=()=>{habitDate.setMonth(habitDate.getMonth()-1);renderHabits()};
$("#habitNext").onclick=()=>{habitDate.setMonth(habitDate.getMonth()+1);renderHabits()};
$("#habitToday").onclick=()=>{habitDate=new Date();renderHabits()};
$("#addReminderBtn").onclick=()=>openSimple("Nou recordatori",[{name:"title",label:"Títol",required:true},{name:"date",label:"Data",type:"date",value:today(),required:true}],v=>{db.reminders.push({id:uid(),...v});save()});
$("#addScheduleBtn").onclick=()=>openSimple("Afegir a l’horari",[{name:"name",label:"Assignatura o activitat",required:true},{name:"day",label:"Dia (0 dilluns – 4 divendres)",type:"number",value:"0",required:true},{name:"start",label:"Hora inici",type:"time",required:true},{name:"end",label:"Hora final",type:"time",required:true},{name:"place",label:"Aula o lloc"}],v=>{db.schedule.push({id:uid(),...v});save()});
$("#manualScheduleChoice").onclick=()=>{$("#scheduleManualPanel").classList.remove("hidden");$("#schedulePhotoPanel").classList.add("hidden")};
$("#photoScheduleChoice").onclick=()=>{$("#schedulePhotoPanel").classList.remove("hidden");$("#scheduleManualPanel").classList.add("hidden")};
$("#schedulePhotoInput").onchange=e=>{const file=e.target.files[0];if(!file)return;const r=new FileReader();r.onload=()=>{db.schedulePhoto=r.result;save()};r.readAsDataURL(file)};
$("#simpleForm").onsubmit=e=>{e.preventDefault();const v={};simpleConfig.fields.forEach(f=>v[f.name]=$("#sf-"+f.name).value);simpleConfig.onSave(v);$("#simpleDialog").close()};

$$("[data-clock-mode]").forEach(b=>b.onclick=()=>{clearInterval(clockInterval);clockInterval=null;clockMode=b.dataset.clockMode;if(clockMode==="pomodoro"){clockInitial=pomo.focus*60;clockSeconds=clockInitial}else if(clockMode==="timer"){clockInitial=10*60;clockSeconds=clockInitial}renderClock()});
$("#fullscreenBtn").onclick=()=>{$(".clock-panel").classList.add("fullscreen")};
$("#minimizeClock").onclick=()=>{$(".clock-panel").classList.remove("fullscreen")};

setInterval(()=>{if(clockMode==="clock")renderClock()},1000);
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./service-worker.js"));
renderAll();