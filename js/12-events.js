"use strict";
/* ======================================================================
   Events
   ====================================================================== */
const A = {
  nav: el => { UI.notifOpen = false; UI.typeDraft = null; location.hash = el.dataset.h; },
  role: el => switchUser(el.dataset.u),
  back: () => history.back(),
  mobile: () => { UI.mobile = !UI.mobile; render(); },
  fr: () => { UI.fr = !UI.fr; render(); },
  ph: () => { UI.ph = !UI.ph; render(); },
  scen: () => { UI.scen = !UI.scen; render(); },
  reset: () => { if (!confirm('Сбросить все данные прототипа к исходным?')) return; S = seed(); UI.submit = UI.picker = UI.confirm = UI.typeDraft = UI.spModal = UI.spMenu = UI.pjModal = UI.pjMenu = null; UI.notifOpen = false; localStorage.removeItem(LS_KEY); go('/requests/mine'); toast('Данные сброшены'); },
  'open-num': () => { const n = document.getElementById('openNum').value.trim().replace('#',''); if (n) { setQ({card:n}); } },
  card: el => { UI.cardTab = 'comments'; UI.cmtFiles = []; setQ({card: el.dataset.id}); },
  'close-card': () => { UI.menu = false; setQ({card: null}); },
  'close-card-bg': (el, e) => { if (e.target === el) A['close-card'](); },
  menu: () => { UI.menu = !UI.menu; render(); },
  'copy-link': el => { UI.menu = false; const link = location.href.split('#')[0] + href(route().path, {...route().q, card: el.dataset.id}); try { navigator.clipboard.writeText(link); } catch(e) {} toast('Ссылка скопирована'); render(); },
  'menu-link': () => { UI.menu = false; render(); const s = document.querySelector('[data-c="link-add"]'); if (s) s.focus(); },
  ctab: el => { UI.cardTab = el.dataset.v; render(); },
  help: () => A['new-req']({dataset:{}}),
  'new-req': el => openSubmit(el.dataset.pid),
  's-space': el => { const st = UI.submit; st.closed = st.closed || {}; st.closed[el.dataset.sid] = !st.closed[el.dataset.sid]; render(); },
  's-proj': el => setQ({new: el.dataset.pid}),
  's-step': el => { const st = UI.submit; if (el.dataset.v === '1') { st.q = ''; UI._focusSearch = true; setQ({new: '1'}); } else setQ({new: st.pid}); },
  's-type': el => setQ({new: el.dataset.tid}),
  's-change': () => setQ({new: UI.submit.pid}),
  's-close': () => closeSubmit(),
  's-send': () => doSubmit(),
  's-att-rm': el => { readSubmitVals(); UI.submit.vals._files.splice(+el.dataset.i, 1); render(); },
  take: el => {
    const r = req(el.dataset.id), u = me();
    r.executorIds.push(u); hist(r, u, 'взял(а) заявку в работу'); nExecutors(r, u, [u], []);
    toast('Вы исполнитель заявки. Она появилась в «Мои задачи» с фильтром «Показывать заявки». Заявитель об этом не узнает'); render();
  },
  'cf-yes': () => { const c = UI.confirm; UI.confirm = null; c.run(); render(); },
  'cf-no': () => { UI.confirm = null; render(); },
  comment: el => {
    const r = req(el.dataset.id), u = me();
    const text = document.getElementById('cmtText').value.trim();
    const files = UI.cmtFiles || [];
    if (!text && !files.length) { toast('Напишите текст или приложите файл'); return; }
    r.comments.push({id:'c'+Date.now(), a:u, at:nowIso(), text, files});
    UI.cmtFiles = [];
    nComment(r, u); render();
  },
  picker: el => {
    const r = req(el.dataset.id);
    UI.picker = el.dataset.k === 'exec' ? {k:'exec', id:r.id, sel:r.executorIds.slice()} : {k:'part', id:r.id, q:''};
    render(); const s = document.getElementById('pkSearch'); if (s) s.focus();
  },
  'pk-close': () => { UI.picker = null; render(); },
  'pk-apply': () => {
    const pk = UI.picker, r = req(pk.id), u = me();
    const added = pk.sel.filter(x => !r.executorIds.includes(x)), removed = r.executorIds.filter(x => !pk.sel.includes(x));
    r.executorIds = r.executorIds.filter(x => pk.sel.includes(x)).concat(added);
    if (added.length) hist(r, u, 'назначил(а) исполнителем: ' + added.map(pname).join(', '));
    if (removed.length) hist(r, u, 'снял(а) исполнителя: ' + removed.map(pname).join(', '));
    if (added.length || removed.length) nExecutors(r, u, added, removed);
    UI.picker = null; render();
  },
  'exec-self': el => {
    const r = req(el.dataset.id), u = me();
    if (!r.executorIds.includes(u) || isDone(r)) return;
    UI.confirm = {title:'Снять себя с заявки?', text:'Вы перестанете быть исполнителем: заявка пропадёт из «Мои задачи». Других исполнителей снимают руководитель проекта и руководитель пространства.', ok:'Снять себя', run: () => {
      r.executorIds = r.executorIds.filter(e => e !== u); hist(r, u, 'снял(а) себя с исполнителей'); nExecutors(r, u, [], [u]); toast('Вы больше не исполнитель заявки'); }};
    render();
  },
  'exec-rm': el => {
    const r = req(el.dataset.id), u = me(), x = el.dataset.u;
    r.executorIds = r.executorIds.filter(e => e !== x); hist(r, u, 'снял(а) исполнителя: ' + pname(x)); nExecutors(r, u, [], [x]); render();
  },
  'part-add': el => {
    const r = req(UI.picker.id), u = me(), x = el.dataset.u;
    r.participantIds.push(x); hist(r, u, 'добавил(а) участника запроса ' + pname(x));
    pushN(x, `Вас добавили участником запроса в заявку «${r.title}»`, r.id);
    UI.picker = null; toast(`${pname(x)} добавлен(а) участником запроса и получил(а) уведомление`); render();
  },
  'part-rm': el => { const r = req(el.dataset.id), u = me(), x = el.dataset.u; r.participantIds = r.participantIds.filter(p => p !== x); hist(r, u, 'убрал(а) участника запроса ' + pname(x)); render(); },
  'part-leave': el => {
    UI.confirm = {title:'Выйти из заявки?', text:'Вы перестанете видеть эту заявку: она пропадёт из «Я участник запроса» и не откроется по ссылке.', ok:'Выйти', run: () => {
      const r = req(el.dataset.id), u = me(); r.participantIds = r.participantIds.filter(p => p !== u); hist(r, u, 'вышел(вышла) из участников запроса'); toast('Вы больше не участник запроса'); }};
    render();
  },
  'link-rm': el => { const r = req(el.dataset.id); r.links = r.links.filter(l => l !== el.dataset.l); hist(r, me(), 'убрал(а) связь с задачей «' + el.dataset.l + '»'); render(); },
  notif: () => { UI.notifOpen = !UI.notifOpen; render(); },
  'n-readall': () => { S.notifs.forEach(n => { if (n.to === me()) n.read = true; }); render(); },
  'n-open': el => {
    const n = S.notifs.find(x => x.id === el.dataset.id); n.read = true; UI.notifOpen = false;
    setQ({card:n.req});
  },
  qview: el => setQ({view: el.dataset.v === 'list' ? null : el.dataset.v}),
  'req-state': el => setQ({state: el.dataset.v === 'done' ? 'done' : null}),
  'flt-clear': () => setQ({proj:null, type:null, status:null, ff:null, fv:null, noexec:null}),
  ptab: el => { UI.typeDraft = null; setQ({tab: el.dataset.v}); },
  'sp-menu': el => { UI.pjMenu = null; UI.spMenu = UI.spMenu === el.dataset.sid ? null : el.dataset.sid; render(); },
  'pj-menu': el => { UI.spMenu = null; UI.pjMenu = UI.pjMenu === el.dataset.pid ? null : el.dataset.pid; render(); },
  'pj-copy': el => { UI.pjMenu = null; const url = location.href.split('#')[0] + '#/projects/' + el.dataset.pid; try { navigator.clipboard.writeText(url); } catch(e) {} toast('Ссылка скопирована'); render(); },
  'pj-open': el => { openProjModal(el.dataset.pid, el.dataset.tab); render(); },
  'pm-bg': () => closeProjModal(),
  'pm-close': () => closeProjModal(),
  'pm-tab': el => { UI.pjModal.tab = el.dataset.v; render(); },
  'pm-general-save': () => { const d=UI.pjModal; if(!canProjSettings(me(),d.pid)) return; const raw=document.getElementById('projectDeadlineDays').value.trim(); d.deadlineDays=raw; const end=new Date();end.setDate(end.getDate() + Number(raw)); if(raw!=='' && (!Number.isSafeInteger(+raw)||+raw<1||Number.isNaN(end.getTime()))) {d.err='Укажите целое число дней от 1 в допустимом диапазоне дат или оставьте поле пустым';render();return;} proj(d.pid).deadlineDays=raw===''?null:+raw; d.err=null; toast('Настройки проекта сохранены. Прежние сроки заявок не изменились'); render(); },
  'sp-newtab': el => { UI.spMenu = UI.pjMenu = null; toast('В продукте пространство откроется в новой вкладке браузера'); render(); },
  'sp-copy': el => { UI.spMenu = null; const url = location.href.split('#')[0] + '#/spaces/' + el.dataset.sid; try { navigator.clipboard.writeText(url); } catch(e) {} toast('Ссылка скопирована'); render(); },
  'sp-open': el => { openSpaceModal(el.dataset.sid, el.dataset.tab); render(); },
  'sm-bg': () => closeSpaceModal(),
  'sm-cancel': () => closeSpaceModal(),
  'sm-tab': el => { UI.spModal.tab = el.dataset.v; UI.spModal.err = null; UI.spModal.color = null; render(); },
  'sm-save': () => saveSpaceModal(),
  'sm-st-add': () => { const d = UI.spModal; d.statuses.push({id:'new' + Date.now(), isNew:true, name:'', color:ST_COLORS[1]}); render(); focusLast('[data-in="s-name"]'); },
  'sm-st-rm': el => { UI.spModal.statuses.splice(+el.dataset.i, 1); render(); },
  'sm-color': el => { const d = UI.spModal, i = +el.dataset.i; d.color = d.color === i ? null : i; render(); },
  'sm-color-set': el => { const d = UI.spModal; d.statuses[+el.dataset.i].color = el.dataset.c2; d.color = null; render(); },
  'sm-f-add': () => { const d = UI.spModal; d.fields.push({id:'new' + Date.now(), isNew:true, name:'', kind:'string', hidden:false, options:null}); d.opts = null; render(); focusLast('[data-in="f-name"]'); },
  'sm-f-hide': el => { const f = UI.spModal.fields[+el.dataset.i]; if (f.isNew) UI.spModal.fields.splice(+el.dataset.i, 1); else f.hidden = !f.hidden; UI.spModal.opts = null; render(); },
  'sm-opts': el => { const d = UI.spModal, i = +el.dataset.i; d.opts = d.opts === i ? null : i; render(); if (d.opts === i) { const n = document.getElementById('oNew'); if (n) n.focus(); } },
  'o-add': el => { const n = document.getElementById('oNew'); if (!n.value.trim()) { n.focus(); return; } addOptions(+el.dataset.fi, n.value); UI.spModal.err = null; render(); const m = document.getElementById('oNew'); if (m) m.focus(); },
  'o-rm': el => { UI.spModal.fields[+el.dataset.fi].options.splice(+el.dataset.i, 1); render(); },
  'member-add': el => { const v = document.getElementById('addMember').value; if (!v) return; proj(el.dataset.pid).memberIds.push(v); toast(`${pname(v)} добавлен(а) в проект`); render(); },
  'member-rm': el => {
    const p = proj(el.dataset.id), x = el.dataset.u;
    p.memberIds = p.memberIds.filter(m => m !== x);
    const affected = S.types.filter(t => t.projectId === p.id && t.exec.includes(x));
    affected.forEach(t => t.exec = t.exec.filter(e => e !== x));
    const active = S.requests.filter(r => r.projectId === p.id && !isDone(r) && r.executorIds.includes(x)).length;
    toast(`${pname(x)} убран(а) из проекта.${affected.length ? ' Снят(а) с исполнителей по умолчанию в типах: ' + affected.map(t => '«' + t.name + '»').join(', ') + '.' : ''}${active ? ' Остаётся исполнителем в ' + active + ' заявках в работе.' : ''}`);
    render();
  },
  'type-new': el => { UI.typeErr = null; UI.typeDraft = {id:null, projectId: el.dataset.pid, name:'', fields:[], exec:[], hidden:false}; render(); },
  'type-edit': el => { const t = typ(el.dataset.id); UI.typeErr = null; UI.typeDraft = {id:t.id, projectId:t.projectId, name:t.name, fields:t.fields.map(x => ({...x})), exec:t.exec.slice(), hidden:!!t.hidden}; render(); },
  'type-cancel': () => { UI.typeDraft = null; render(); },
  'type-save': () => {
    const d = UI.typeDraft; d.name = document.getElementById('tdName').value.trim();
    if (!d.name) { UI.typeErr = 'Введите название типа'; render(); return; }
    UI.typeErr = null;
    if (d.id) Object.assign(typ(d.id), {name:d.name, fields:d.fields.map(x => ({f:x.f, r:x.r})), exec:d.exec, hidden:d.hidden});
    else S.types.push({id:'t' + Date.now(), projectId:d.projectId, name:d.name, fields:d.fields.map(x => ({f:x.f, r:x.r})), exec:d.exec, hidden:d.hidden});
    toast(`Тип «${d.name}» сохранён${d.hidden ? ' (скрыт)' : ' и доступен в форме подачи'}`); UI.typeDraft = null; render();
  },
  'type-hide': el => { const t = typ(el.dataset.id); if (!t.hidden && visibleTypes(t.projectId).length === 1) return; t.hidden = !t.hidden; render(); },
  'td-up': el => { const i = +el.dataset.i, f = UI.typeDraft.fields; syncDraftName(); [f[i-1], f[i]] = [f[i], f[i-1]]; render(); },
  'td-down': el => { const i = +el.dataset.i, f = UI.typeDraft.fields; syncDraftName(); [f[i+1], f[i]] = [f[i], f[i+1]]; render(); },
  'td-rm': el => { syncDraftName(); UI.typeDraft.fields.splice(+el.dataset.i, 1); render(); },
  'td-exec-rm': el => { syncDraftName(); UI.typeDraft.exec = UI.typeDraft.exec.filter(e => e !== el.dataset.u); render(); },
  'admin-new': el => { const kind=el.dataset.v, sid=el.dataset.sid || S.spaces.find(s=>canCreateProject(me(),s.id))?.id; if(kind==='space' ? !isAdmin(me()) : kind!=='project'||!canCreateProject(me(),sid)) { toast('Нет права создавать проект в этом пространстве'); return; } UI.spMenu=UI.pjMenu=null; UI.adminNew = {kind, sid: sid || null, v: {}}; UI.adminErr = {}; render(); const i = document.getElementById(el.dataset.v === 'space' ? 'asName' : 'apName'); if (i) i.focus(); },
  'admin-new-close': () => { UI.adminNew = null; UI.adminErr = {}; render(); },
  'admin-edit': el => { const k = el.dataset.k, o = k === 'space' ? space(el.dataset.id) : proj(el.dataset.id); UI.adminEdit = {kind:k, id:o.id, name:o.name, lead:o.leadId, err:{}}; render(); },
  'admin-edit-close': () => { UI.adminEdit = null; render(); },
  'admin-edit-save': () => {
    const d = UI.adminEdit; d.name = document.getElementById('aeName').value.trim(); d.lead = document.getElementById('aeLead').value;
    d.err = {}; if (!d.name) d.err.name = 'Введите название'; if (!d.lead) d.err.lead = 'Нужен руководитель';
    if (Object.keys(d.err).length) { render(); return; }
    let msg = 'Изменения сохранены';
    if (d.kind === 'space') { const s = space(d.id); s.name = d.name; s.leadId = d.lead; }
    else { const p = proj(d.id); const prev = p.leadId; p.name = d.name; setProjLead(p, d.lead); if (prev !== d.lead) msg = `Руководитель проекта: ${pname(d.lead)}. ${pname(prev)} остаётся в проекте участником`; }
    toast(msg);
    UI.adminEdit = null; render();
  },
  'admin-arch': el => {
    const k = el.dataset.k, id = el.dataset.id, o = k === 'space' ? space(id) : proj(id);
    const n = k === 'space' ? S.projects.filter(p => p.spaceId === id).length : S.requests.filter(r => r.projectId === id).length;
    UI.confirm = {title: k === 'space' ? `Архивировать пространство «${o.name}»?` : `Архивировать проект «${o.name}»?`,
      text: (k === 'space' ? `Пространство и ${n} ${plural(n,'его проект','его проекта','его проектов')} пропадут из окна подачи, раздела «Задачи» и списков заявок.` : `Проект и ${n} ${plural(n,'заявка','заявки','заявок')} пропадут из окна подачи, раздела «Задачи» и списков заявок.`) + ' Восстановить можно здесь же, включив «Показывать архивные». Так же сейчас архивируются пространства и проекты трекера.',
      ok:'В архив', run: () => { const name = archiveItem(k, id); toast(`«${name}» в архиве`); }};
    render();
  },
  'admin-restore': el => { restoreItem(el.dataset.id); render(); },
  'admin-space': () => {
    if(!isAdmin(me())) return;
    const name = document.getElementById('asName').value.trim(), lead = document.getElementById('asLead').value;
    UI.adminNew.v = {name, lead};
    UI.adminErr = {}; if (!name) UI.adminErr.sName = 'Введите название'; if (!lead) UI.adminErr.sLead = 'Пространство нельзя создать без руководителя';
    if (Object.keys(UI.adminErr).length) { render(); return; }
    S.spaces.push({id:'s' + Date.now(), name, leadId:lead, statuses:defaultRequestStatuses()}); UI.adminNew = null; toast(`Заявочное пространство «${name}» создано. Руководитель: ${pname(lead)}`); render();
  },
  'ap-type-add': () => { const v=readAdminProject(); v.extraTypes.push({name:'',fields:[]}); render(); },
  'ap-type-remove': el => { const v=readAdminProject(); v.extraTypes.splice(+el.dataset.i,1); render(); },
  'admin-project': () => {
    const v = readAdminProject(); const {sid, name, lead, type, fields} = v;
    if(!canCreateProject(me(),sid)) { UI.adminErr={pName:'Нет права создавать проект в этом пространстве'}; render(); return; }
    UI.adminErr = {}; if (!name) UI.adminErr.pName = 'Введите название'; if (!lead) UI.adminErr.pLead = 'Проект нельзя создать без руководителя';
    if (!type) UI.adminErr.pType = 'Введите название обязательного типа';
    v.extraTypes.forEach((t,i)=>{ if (!t.name) UI.adminErr['pType'+i]='Введите название типа или уберите его из формы'; });
    if (Object.keys(UI.adminErr).length) { render(); return; }
    const pid = 'p' + Date.now();
    S.projects.push({id:pid, spaceId:sid, name, leadId:lead, memberIds:[]});
    if(UI.spModal && UI.spModal.sid===sid) UI.spModal.leads[pid]=lead;
    [{name:type,fields},...v.extraTypes].forEach((t,i)=>S.types.push({id:'t'+Date.now()+'_'+i,projectId:pid,name:t.name,fields:t.fields.map(f=>({f,r:false})),exec:[]}));
    UI.adminNew = null; toast(`Проект «${name}» создан. Типов: ${1+v.extraTypes.length}; все доступны в окне подачи. Руководитель проекта: ${pname(lead)}`); render();
  },
  'scen-go': el => {
    const st = SCEN[+el.dataset.i].steps[+el.dataset.j];
    const hp = st.need === 'hrdocs' ? hrDocs() : null;
    let h = hp ? st.h.replace('hrdocs', hp.id) : st.h;
    if (st.open === 'submit' || (st.open || '').startsWith('submit:')) h = href(h.slice(1), {new: st.open.split(':')[1] || '1'});
    UI.submit = UI.picker = UI.confirm = UI.typeDraft = UI.spModal = UI.spMenu = UI.pjModal = UI.pjMenu = UI.adminNew = UI.adminEdit = null; UI.notifOpen = false; UI.menu = false; UI.cardTab = 'comments';
    UI.user = st.u;
    if (location.hash !== h) location.hash = h;
    setTimeout(() => {
      if (st.open === 'notif') UI.notifOpen = true;
      if (st.open === 'admin-hr') UI.adminNew = {kind:'project', sid:'hr', v:{sid:'hr', name:'Кадровое делопроизводство', lead:'elena', type:'Справка', fields:[]}};
      if (st.open === 'hr-type') { const x = S.types.find(y => y.projectId === hp.id && y.name === 'Справка') || visibleTypes(hp.id)[0]; if (x) A['type-edit']({dataset:{id:x.id}}); }
      render();
    }, 30);
  }
};
function hrDocs(){
  let p = S.projects.find(x => x.spaceId === 'hr' && x.name === 'Кадровое делопроизводство');
  if (!p) {
    p = {id:'hrdocs', spaceId:'hr', name:'Кадровое делопроизводство', leadId:'elena', memberIds:[]};
    S.projects.push(p); S.types.push({id:'t_spravka', projectId:p.id, name:'Справка', fields:[], exec:[]});
  }
  return p;
}
function readAdminProject(){
  const g = id => document.getElementById(id);
  const v = {sid:g('apSpace').value, name:g('apName').value.trim(), lead:g('apLead').value, type:g('apType').value.trim(), fields:[...document.querySelectorAll('[data-apf]:checked')].map(x => x.value)};
  v.extraTypes = [...document.querySelectorAll('[data-ap-extra-name]')].map(el=>({name:el.value.trim(),fields:[...document.querySelectorAll('[data-ap-extra-field="'+el.dataset.apExtraName+'"]:checked')].map(x=>x.value)}));
  UI.adminNew.v = v; return v;
}
function syncDraftName(){ const i = document.getElementById('tdName'); if (i && UI.typeDraft) UI.typeDraft.name = i.value; }
function switchUser(u){
  if (!u) return;
  UI.user = u; UI.submit = UI.picker = UI.confirm = UI.typeDraft = UI.spModal = UI.spMenu = UI.pjModal = UI.pjMenu = UI.adminNew = UI.adminEdit = null; UI.notifOpen = false; UI.menu = false; UI.cardTab = 'comments';
  if (route().q.new) closeSubmit(); else render();
  toast(`Вы смотрите как ${pname(u)} — ${person(u).pos}`);
}

document.addEventListener('click', e => {
  if (Date.now() < suppressKanbanClickUntil && e.target.closest('[data-kb]')) { e.preventDefault(); return; }
  const el = e.target.closest('[data-a]');
  let dirty = false;
  if (UI.spMenu && !e.target.closest('.srow')) { UI.spMenu = null; dirty = true; }
  if (UI.pjMenu && !e.target.closest('.srow')) { UI.pjMenu = null; dirty = true; }
  if (UI.spModal && UI.spModal.color != null && !e.target.closest('.cpal') && !(el && el.dataset.a === 'sm-color')) { UI.spModal.color = null; dirty = true; }
  if (UI.menu && !e.target.closest('.dd')) { UI.menu = false; dirty = true; }
  const bg = el && (el.dataset.a === 'close-card-bg' || el.dataset.a === 'sm-bg' || el.dataset.a === 'pm-bg') && e.target !== el;
  if (!el || bg) { if (dirty) render(); return; }
  const fn = A[el.dataset.a]; if (fn) { e.preventDefault(); fn(el, e); } else if (dirty) render();
});
document.addEventListener('change', e => {
  const el = e.target; const c = el.dataset.c || (el.closest('[data-c]') && el.closest('[data-c]').dataset.c);
  if (!c) return;
  const host = el.dataset.c ? el : el.closest('[data-c]');
  const u = me();
  switch (c) {
    case 'role-other': switchUser(el.value); break;
    case 'admin-arch-show': { UI.showArch = el.checked; render(); break; }
    case 'ap-space': { const v=readAdminProject(); v.fields=[]; v.extraTypes.forEach(t=>t.fields=[]); render(); break; }
    case 'flt': { const patch = {[el.dataset.k]: el.value || null}; if (el.dataset.k === 'ff') patch.fv = null; setQ(patch); break; }
    case 'flt-noexec': setQ({noexec: el.checked ? '1' : null}); break;
    case 'tasks-requests': setQ({requests: el.checked ? '1' : null}); break;
    case 'subs': { S.subs[u + ':' + el.dataset.pid] = el.checked; toast(el.checked ? `Подписка включена: вы будете получать уведомление о каждой новой заявке проекта «${proj(el.dataset.pid).name}»` : 'Подписка выключена'); render(); break; }
    case 'status': { changeStatus(req(el.dataset.id), el.value); render(); break; }
    case 'sm-st-type': { const d = UI.spModal, x = d.statuses[+el.dataset.i]; if (!finalLocked(d, x)) x.final = el.value === 'final'; render(); break; }
    case 'sm-f-kind': {
      const d = UI.spModal, i = +el.dataset.i, f = d.fields[i]; f.kind = el.value; const list = isList(f.kind);
      if (list) f.options = f.options || [];
      d.opts = list ? i : null; render(); if (list) { const n = document.getElementById('oNew'); if (n) n.focus(); } break; }
    case 'sm-f-hidden': { UI.spModal.showHidden = el.checked; render(); break; }
    case 'sm-lead': { UI.spModal.leads[el.dataset.pid] = el.value; break; }
    case 'request-title': { const r = req(el.dataset.id); if (!canWork(u,r) || isDone(r)) break; if (!el.value.trim()) { toast('Название обязательно'); render(); break; } r.title=el.value.trim(); hist(r,u,'изменил(а) название заявки'); save(); break; }
    case 'request-description': { const r=req(el.dataset.id); if (!canWork(u,r) || isDone(r)) break; r.description=el.value.trim(); hist(r,u,'изменил(а) описание заявки'); save(); break; }
    case 'deadline': { const r = req(el.dataset.id); if (!canWork(u,r) || isDone(r)) break; r.deadline = el.value || null; hist(r, u, 'изменил(а) срок: ' + (r.deadline ? fmtDT(r.deadline) : 'без срока')); nDeadline(r, u); save(); break; }
    case 'fv': {
      const r = req(host.dataset.id), f = fld(host.dataset.f);
      let v;
      if (f.kind === 'multi') v = [...host.querySelectorAll('input:checked')].map(i => i.value);
      else v = el.value.trim();
      r.values[f.id] = v; hist(r, u, `изменил(а) поле «${f.name}»`); save(); break;
    }
    case 'link-add': { if (!el.value) break; const r = req(el.dataset.id); r.links.push(el.value); hist(r, u, 'связал(а) с задачей «' + el.value + '»'); render(); break; }
    case 'cmt-files': { UI.cmtFiles = [...el.files].map(x => x.name); const l = document.getElementById('cmtFilesL'); if (l) l.textContent = UI.cmtFiles.join(', '); break; }
    case 's-att': { readSubmitVals(); UI.submit.vals._files = (UI.submit.vals._files || []).concat([...el.files].map(x => x.name)); render(); break; }
    case 'pk-sel': { const v = el.value; UI.picker.sel = el.checked ? uniq([...UI.picker.sel, v]) : UI.picker.sel.filter(x => x !== v); break; }
    case 'td-req': { syncDraftName(); UI.typeDraft.fields[+el.dataset.i].r = el.checked; break; }
    case 'td-add': { if (!el.value) break; syncDraftName(); UI.typeDraft.fields.push({f: el.value, r: false}); render(); break; }
    case 'td-exec-add': { if (!el.value) break; syncDraftName(); UI.typeDraft.exec.push(el.value); render(); break; }
    case 'td-hidden': { UI.typeDraft.hidden = el.checked; break; }
    case 'pm-hidden': { UI.pjModal.showHidden = el.checked; render(); break; }
  }
});
document.addEventListener('input', e => {
  const inn = e.target.dataset.in, d = UI.spModal;
  if (d && inn === 's-name') d.statuses[+e.target.dataset.i].name = e.target.value;
  if (d && inn === 'f-name') d.fields[+e.target.dataset.i].name = e.target.value;
  if (d && inn === 'o-name') d.fields[+e.target.dataset.fi].options[+e.target.dataset.i].v = e.target.value;
  const k = e.target.dataset.i;
  if (k === 's-search') { UI.submit.q = e.target.value; document.getElementById('sList').innerHTML = submitList(); }
  if (k === 'pk-search') { UI.picker.q = e.target.value; const pos = e.target.selectionStart; render(); const s = document.getElementById('pkSearch'); s.focus(); s.setSelectionRange(pos, pos); }
});
document.addEventListener('paste', e => {
  if (e.target.id !== 'oNew') return;
  const text = (e.clipboardData || window.clipboardData).getData('text');
  if (!/\r?\n/.test(text.trim())) return;
  e.preventDefault(); addOptions(+e.target.dataset.fi, text); render();
  const m = document.getElementById('oNew'); if (m) m.focus();
});
let DND = null;
const dndList = k => { if (k === 't') return UI.typeDraft && UI.typeDraft.fields; const d = UI.spModal; if (!d) return null; if (k === 's') return d.statuses; if (k === 'f') return d.fields; if (k[0] === 'o') return d.fields[+k.slice(1)].options; return null; };
function clearDrop(){ document.querySelectorAll('.drop-top,.drop-bot,.dragging').forEach(x => x.classList.remove('drop-top','drop-bot','dragging')); }
let KB = null;
let pointerKanban = null, suppressKanbanClickUntil = 0;
const kbClear = () => document.querySelectorAll('.kover,.kno,.kcard.dragging').forEach(x => x.classList.remove('kover','kno','dragging'));
// Pointer-based kanban dragging also works where native HTML5 drag is unavailable.
document.addEventListener('pointerdown', e => {
  const card=e.target.closest('[data-kb]');
  if (!card || e.button!==0) return;
  const r=req(card.dataset.kb); if(!canWork(me(),r)) return;
  pointerKanban={r,card,x:e.clientX,y:e.clientY,moved:false};
  e.preventDefault();
});
document.addEventListener('pointermove', e => {
  const d=pointerKanban; if(!d) return;
  if(!d.moved && Math.hypot(e.clientX-d.x,e.clientY-d.y)<6) return;
  d.moved=true; d.card.classList.add('dragging');
  document.querySelectorAll('.kover').forEach(x=>x.classList.remove('kover'));
  const hit=document.elementFromPoint(e.clientX,e.clientY), col=hit&&hit.closest('[data-kcol]');
  if(col){ const st=reqSpace(d.r).statuses.find(s=>s.id===col.dataset.kcol); if(st&&canMoveTo(me(),d.r,st)) col.classList.add('kover'); }
  e.preventDefault();
});
document.addEventListener('pointerup', e => {
  const d=pointerKanban; pointerKanban=null; if(!d||!d.moved) return;
  suppressKanbanClickUntil=Date.now()+350;
  const hit=document.elementFromPoint(e.clientX,e.clientY), col=hit&&hit.closest('[data-kcol]');
  kbClear();
  if(col) changeStatus(d.r,col.dataset.kcol);
  render();
});
document.addEventListener('pointercancel', () => { pointerKanban=null; kbClear(); });

document.addEventListener('dragstart', e => {
  const kc = e.target.closest && e.target.closest('[data-kb]');
  if (kc) {
    const r = req(kc.dataset.kb), sp = reqSpace(r), u = me();
    KB = r; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', '');
    setTimeout(() => { kc.classList.add('dragging'); document.querySelectorAll('[data-kcol]').forEach(c => { const st = sp.statuses.find(s => s.id === c.dataset.kcol); if (st.id !== r.status && !canMoveTo(u, r, st)) c.classList.add('kno'); }); }, 0);
    return;
  }
  const g = e.target.closest && e.target.closest('[data-dnd]'); if (!g) return;
  DND = {k: g.dataset.dnd, i: +g.dataset.i};
  const row = g.closest('[data-dnd-row]');
  e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', '');
  if (row) { e.dataTransfer.setDragImage(row, 20, 14); setTimeout(() => row.classList.add('dragging'), 0); }
});
document.addEventListener('dragover', e => {
  if (KB) {
    const c = e.target.closest && e.target.closest('[data-kcol]');
    document.querySelectorAll('.kover').forEach(x => x !== c && x.classList.remove('kover'));
    if (!c) return;
    const st = reqSpace(KB).statuses.find(s => s.id === c.dataset.kcol);
    if (canMoveTo(me(), KB, st)) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; c.classList.add('kover'); }
    return;
  }
  if (!DND) return;
  const row = e.target.closest && e.target.closest(`[data-dnd-row="${DND.k}"]`); if (!row) return;
  e.preventDefault(); clearDrop();
  const r = row.getBoundingClientRect(); row.classList.add(e.clientY < r.top + r.height / 2 ? 'drop-top' : 'drop-bot');
});
document.addEventListener('drop', e => {
  if (KB) {
    const c = e.target.closest && e.target.closest('[data-kcol]'); const r = KB; KB = null; kbClear();
    if (c) { e.preventDefault(); changeStatus(r, c.dataset.kcol); }
    render(); return;
  }
  if (!DND) return;
  const row = e.target.closest && e.target.closest(`[data-dnd-row="${DND.k}"]`);
  if (row) {
    e.preventDefault();
    const r = row.getBoundingClientRect(); const to = +row.dataset.i + (e.clientY < r.top + r.height / 2 ? 0 : 1);
    const list = dndList(DND.k);
    if (list && to !== DND.i && to !== DND.i + 1) {
      const d = UI.spModal; const openName = d && d.opts != null ? d.fields[d.opts] : null;
      if (DND.k === 't') syncDraftName();
      moveItem(list, DND.i, to);
      if (openName) d.opts = d.fields.indexOf(openName);
    }
  }
  DND = null; clearDrop(); render();
});
document.addEventListener('dragend', () => { DND = null; clearDrop(); KB = null; kbClear(); });
function focusLast(sel){ const all = document.querySelectorAll(sel); if (all.length) all[all.length - 1].focus(); }
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.id === 'oNew') { e.preventDefault(); A['o-add'](e.target); return; }
  if (e.key === 'Escape') {
    if (UI.confirm) { UI.confirm = null; render(); }
    else if (UI.adminNew) A['admin-new-close']();
    else if (UI.adminEdit) A['admin-edit-close']();
    else if (UI.spModal && UI.spModal.color != null) { UI.spModal.color = null; render(); }
    else if (UI.spModal) closeSpaceModal();
    else if (UI.pjModal) { if (UI.typeDraft) { UI.typeDraft = null; render(); } else closeProjModal(); }
    else if (UI.picker) { UI.picker = null; render(); }
    else if (UI.submit) closeSubmit();
    else if (route().q.card) A['close-card']();
    else if (UI.notifOpen) { UI.notifOpen = false; render(); }
  }
  if (e.key === 'Enter' && e.target.id === 'openNum') A['open-num']();
});

if (!location.hash) location.hash = '#/requests/mine';
render();
