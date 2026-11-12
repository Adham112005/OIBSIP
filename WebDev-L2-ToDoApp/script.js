const STORAGE_KEY = 'taskhub_tasks_v1';
const THEME_KEY = 'taskhub_theme_v1';
const $ = id => document.getElementById(id);
const taskInput = $('task-input'), priorityInput = $('priority-input'), dateInput = $('date-input');
const formMessage = $('form-message'), pendingList = $('pending-list'), completedList = $('completed-list');
const pendingSection = $('pending-section'), completedSection = $('completed-section');
const navButtons = document.querySelectorAll('.nav-item');
let tasks = loadTasks(), currentFilter = 'all', editingTaskId = null;

function loadTasks(){
  try { const data = JSON.parse(localStorage.getItem(STORAGE_KEY)); if(!Array.isArray(data)) return [];
    return data.filter(t=>t && typeof t.id==='string' && typeof t.text==='string' && typeof t.completed==='boolean').map(t=>({id:t.id,text:t.text.slice(0,120),completed:t.completed,priority:['low','medium','high'].includes(t.priority)?t.priority:'medium',dueDate:typeof t.dueDate==='string'?t.dueDate:'',createdAt:Number.isFinite(t.createdAt)?t.createdAt:Date.now()}));
  } catch(error){console.warn('Could not load tasks',error);return [];}
}
function saveTasks(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(tasks));return true;}catch(error){showMessage('Could not save tasks. Browser storage may be unavailable.');return false;}}
function createId(){return crypto?.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2)}`;}
function showMessage(message=''){formMessage.textContent=message;}
function addTask(){const text=taskInput.value.trim();if(!text){showMessage('Please enter a task first.');taskInput.focus();return;}tasks.unshift({id:createId(),text:text.slice(0,120),completed:false,priority:priorityInput.value,dueDate:dateInput.value,createdAt:Date.now()});saveTasks();taskInput.value='';dateInput.value='';priorityInput.value='medium';showMessage('');render();taskInput.focus();}
function toggleTask(id){tasks=tasks.map(t=>t.id===id?{...t,completed:!t.completed}:t);saveTasks();render();}
function deleteTask(id){const task=tasks.find(t=>t.id===id);if(!task||!confirm(`Delete "${task.text}"?`))return;tasks=tasks.filter(t=>t.id!==id);saveTasks();render();}
function openEdit(id){const task=tasks.find(t=>t.id===id);if(!task)return;editingTaskId=id;$('edit-task-input').value=task.text;$('edit-priority-input').value=task.priority;$('edit-date-input').value=task.dueDate;$('edit-dialog').showModal();}
$('edit-form').addEventListener('submit',e=>{e.preventDefault();const task=tasks.find(t=>t.id===editingTaskId),text=$('edit-task-input').value.trim();if(!task||!text)return;task.text=text.slice(0,120);task.priority=$('edit-priority-input').value;task.dueDate=$('edit-date-input').value;saveTasks();$('edit-dialog').close();editingTaskId=null;render();});
$('edit-dialog').addEventListener('close',()=>editingTaskId=null);
function clearCompleted(){const count=tasks.filter(t=>t.completed).length;if(!count)return;if(!confirm(`Delete all ${count} completed tasks?`))return;tasks=tasks.filter(t=>!t.completed);saveTasks();render();}
function formatDate(value){if(!value)return '';const date=new Date(`${value}T00:00:00`);return Number.isNaN(date.getTime())?'':new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric'}).format(date);}
function createRow(task){const row=document.createElement('li');row.className=`task-row${task.completed?' is-completed':''}`;
 const check=document.createElement('input');check.type='checkbox';check.className='task-check';check.checked=task.completed;check.setAttribute('aria-label',task.completed?'Mark pending':'Mark completed');check.addEventListener('change',()=>toggleTask(task.id));
 const name=document.createElement('span');name.className='task-name';name.textContent=task.text;
 const priority=document.createElement('span');priority.className=`priority priority-${task.priority}`;priority.textContent=task.priority[0].toUpperCase()+task.priority.slice(1);
 const due=document.createElement('time');due.className='task-meta';due.textContent=task.dueDate?`▦ ${formatDate(task.dueDate)}`:'—';if(task.dueDate)due.dateTime=task.dueDate;
 const edit=document.createElement('button');edit.type='button';edit.className='task-action';edit.textContent='✎';edit.title='Edit task';edit.setAttribute('aria-label',`Edit ${task.text}`);edit.addEventListener('click',()=>openEdit(task.id));
 const remove=document.createElement('button');remove.type='button';remove.className='task-action delete';remove.textContent='▤';remove.title='Delete task';remove.setAttribute('aria-label',`Delete ${task.text}`);remove.addEventListener('click',()=>deleteTask(task.id));row.append(check,name,priority,due,edit,remove);return row;}
function empty(list,message){const li=document.createElement('li');li.className='empty-state';li.textContent=message;list.append(li);}
function render(){pendingList.replaceChildren();completedList.replaceChildren();const pending=tasks.filter(t=>!t.completed),completed=tasks.filter(t=>t.completed);const showPending=currentFilter!=='completed',showCompleted=currentFilter!=='pending';pendingSection.hidden=!showPending;completedSection.hidden=!showCompleted;
 if(showPending){pending.forEach(t=>pendingList.append(createRow(t)));if(!pending.length)empty(pendingList,'No pending tasks. Enjoy your free time!');}
 if(showCompleted){completed.forEach(t=>completedList.append(createRow(t)));if(!completed.length)empty(completedList,'Finished tasks will appear here.');}
 $('all-nav-count').textContent=tasks.length;$('pending-nav-count').textContent=pending.length;$('completed-nav-count').textContent=completed.length;$('pending-count').textContent=pending.length;$('completed-count').textContent=completed.length;
 const percent=tasks.length?Math.round(completed.length/tasks.length*100):0;$('progress-value').textContent=`${percent}%`;$('progress-ring').style.background=`conic-gradient(var(--blue),var(--green) ${percent}%,#ffffff1f ${percent}%)`;$('progress-ring').setAttribute('aria-valuenow',percent);
 $('motivation-title').textContent=tasks.length&&percent===100?'Amazing work!':completed.length?'You’re doing great!':'Ready to begin?';$('motivation-copy').textContent=tasks.length&&percent===100?'You completed every task.':completed.length?'Keep going. Every step counts.':'Small steps lead to big wins.';
 const labels={all:['All Tasks','Keep your day on track.'],pending:['Pending Tasks','Focus on what still needs to be done.'],completed:['Completed Tasks','Look at everything you have achieved.']};$('list-heading').textContent=labels[currentFilter][0];$('list-subheading').textContent=labels[currentFilter][1];$('clear-completed-btn').disabled=!completed.length;}
navButtons.forEach(btn=>btn.addEventListener('click',()=>{currentFilter=btn.dataset.filter;navButtons.forEach(item=>item.classList.toggle('active',item===btn));render();}));
$('add-task-btn').addEventListener('click',addTask);taskInput.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();addTask();}});taskInput.addEventListener('input',()=>showMessage(''));$('clear-completed-btn').addEventListener('click',clearCompleted);
function setTheme(theme){const light=theme==='light';document.body.classList.toggle('light-theme',light);$('light-theme').classList.toggle('active',light);$('dark-theme').classList.toggle('active',!light);try{localStorage.setItem(THEME_KEY,theme);}catch{}}
$('light-theme').addEventListener('click',()=>setTheme('light'));$('dark-theme').addEventListener('click',()=>setTheme('dark'));try{setTheme(localStorage.getItem(THEME_KEY)||'dark');}catch{setTheme('dark');}render();
