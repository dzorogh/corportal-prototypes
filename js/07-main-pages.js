"use strict";
/* ======================================================================
   Main pages
   ====================================================================== */
const tip = text => `<span class="qh" tabindex="0" aria-label="${esc(text)}">${icon('help',14)}<span class="tipc" role="tooltip">${esc(text)}</span></span>`;
function crumbs(list){ return `<div class="crumbs">${list.map((c,i) => i < list.length-1 ? `<a href="${c[1]}">${esc(c[0])}</a><span>/</span>` : `<b>${esc(c[0])}</b>`).join('')}</div>`; }
function denied(text){ return `<div class="panel"><div class="empty"><div class="eic">${icon('lock',24)}</div><h4>Нет доступа</h4><p>${text}</p></div></div>`; }

/* Request spaces and projects live in the tracker (#/spaces, #/projects); old request-section links lead there */
function legacyPath(r){
  const [a, b, c, d] = r.parts;
  if (a !== 'requests') return null;
  if (b === 'executor') return '/tasks?requests=1';
  if (b === 'admin') return '/spaces';
  if (b === 'queues') return c === 'project' && d ? '/projects/' + d : c === 'space' && d ? '/spaces/' + d : '/projects';
  if ((b === 'space' || b === 'project') && c) return `/${b}s/${c}` + (d === 'settings' ? '/settings' : '');
  return null;
}
function renderMain(r){
  const old = legacyPath(r);
  if (old) { const [path, qs] = old.split('?'); location.replace(href(path, {...Object.fromEntries(new URLSearchParams(qs || '')), ...r.q})); return ''; }
  const sec = r.parts[0] || 'requests';
  const id = r.parts[1], settings = r.parts[2] === 'settings';
  if (sec === 'requests') {
    const v = id || 'mine';
    if (v === 'new') { location.replace(href('/requests/mine', {new: r.q.type || '1'})); return ''; }
    if (['mine','participant'].includes(v)) return renderList(v, r.q);
    return denied('Страница не найдена.');
  }
  if (sec === 'spaces' && id) {
    if (settings && canSpaceSettings(me(), id) && !UI.spModal) openSpaceModal(id, r.q.tab);
    return renderSpaceQueue(id, settings ? {} : r.q);
  }
  if (sec === 'projects' && id) {
    if (settings && canProjSettings(me(), id) && !UI.pjModal) openProjModal(id, r.q.tab);
    return renderProjectQueue(id, settings ? {} : r.q);
  }
  if (sec === 'spaces') return renderSpaces();
  if (sec === 'projects') return renderProjects(r.q);
  if (sec === 'tasks') return renderTasks(r.q);
  return renderStub(sec);
}

function requestsTabs(active){
  const u = me();
  const t = [['mine','Мои заявки'],['participant','Я участник запроса']];
  return `<div class="ptabs hide-m">${t.map(([k,l]) => `<button class="ptab ${active===k?'on':''}" data-a="nav" data-h="#/requests/${k}">${l}<span class="cnt">${listFor(u,k).length}</span></button>`).join('')}
    ${fr(4)}</div>`;
}
const trCrumbs = (...rest) => crumbs([['Трекер','#/tasks'], ...rest]);

function listFor(u, kind){
  let l = [];
  if (kind === 'mine') l = S.requests.filter(r => r.requesterId === u);
  if (kind === 'participant') l = S.requests.filter(r => r.participantIds.includes(u));
  if (kind === 'executor') l = S.requests.filter(r => r.executorIds.includes(u));
  return l.slice().sort((a,b) => b.createdAt.localeCompare(a.createdAt));
}

function renderList(kind, q){
  const u = me();
  const all = listFor(u, kind), done = q.state === 'done';
  const rows = all.filter(x => isDone(x) === done);
  const nDone = all.filter(isDone).length;
  const titles = {mine:'Мои заявки', participant:'Я участник запроса'};
  const emptyText = {
    mine:'Вы ещё не подавали заявок. Подайте заявку в нужный проект: IT, HR и другие направления.',
    participant:'Вас пока не добавляли участником запроса ни в одну заявку.'
  };
  let body;
  if (all.length && !rows.length) {
    body = `<div class="empty"><div class="eic">${icon('inbox',24)}</div><h4>${done ? 'Завершённых заявок нет' : 'Активных заявок нет'}</h4><p>${done ? 'Здесь появятся заявки в завершающем статусе.' : 'Все заявки завершены. Их можно посмотреть в «Завершённые».'}</p></div>`;
  } else if (!rows.length) {
    body = `<div class="empty"><div class="eic">${icon('inbox',24)}</div><h4>Заявок нет</h4><p>${emptyText[kind]}</p><button class="btn btn-p" data-a="new-req">${icon('plus',14)}Новая заявка</button>${fr(4)}</div>`;
  } else {
    body = `<table class="tbl"><thead><tr><th>№</th><th>Название</th><th>Проект</th><th>Тип</th><th>Статус</th><th>Создана</th></tr></thead><tbody>
      ${rows.map(x => `<tr class="rw" data-a="card" data-id="${x.id}"><td class="idn m-hide">#${x.id}</td><td class="tt"><span class="ttx">${esc(x.title)}</span></td><td data-l="Проект">${esc(proj(x.projectId).name)}</td><td data-l="Тип">${esc(typ(x.typeId).name)}</td><td>${stPill(x)}</td><td data-l="Создана" class="tab-num nowrap">${fmtDT(x.createdAt)}</td></tr>`).join('')}
      </tbody></table>`;
  }
  return `${crumbs([['Трекер','#/tasks'],['Заявки','#/requests/mine'],[titles[kind],'']])}
    <div class="panel">
      <div class="phead"><h1>${titles[kind]}</h1>${tip({mine:'Здесь только заявки, которые подали вы. Заявки, куда вас добавили участником запроса, — во вкладке «Я участник запроса», а заявки, где вы исполнитель, — в «Задачи» → «Мои задачи».',
        participant:'Здесь заявки, куда вас добавили участником запроса. Ваши собственные заявки — во вкладке «Мои заявки».',}[kind])}${fr('FR-4: без исполнителя и срока')}<div class="grow"></div>
        <button class="btn btn-p hide-m" data-a="new-req">${icon('plus',14)}Новая заявка</button></div>
      ${requestsTabs(kind)}
      ${all.length ? `<div class="toolbar"><div class="seg"><button class="${done?'':'on'}" data-a="req-state" data-v="active">Активные ${all.length - nDone}</button><button class="${done?'on':''}" data-a="req-state" data-v="done">Завершённые ${nDone}</button></div></div>` : ''}
      <div class="pbody">${body}</div>
    </div>`;
}

const adminActs = (kind, id) => `<button class="ibtn" data-a="admin-edit" data-k="${kind}" data-id="${id}" title="Переименовать, сменить руководителя">${icon('pen',15)}</button><button class="ibtn red" data-a="admin-arch" data-k="${kind}" data-id="${id}" title="В архив">${icon('archive',15)}</button>`;
const adminRestore = a => { const blocked = a.kind === 'project' && !space(a.data.project.spaceId);
  return `<button class="ibtn" data-a="admin-restore" data-id="${a.id}" ${blocked ? 'disabled title="Сначала восстановите пространство"' : 'title="Восстановить"'}>${icon('undo',15)}</button>`; };
const archOf = kind => isAdmin(me()) && UI.showArch ? S.arch.filter(a => a.kind === kind) : [];
const archSwitch = () => isAdmin(me()) ? `<label class="switch"><input type="checkbox" data-c="admin-arch-show" ${UI.showArch?'checked':''}><span class="tr"></span>Показывать архивные${S.arch.length ? `<span class="cbadge">${S.arch.length}</span>` : ''}</label>` : '';
const openCounts = pids => { const open = S.requests.filter(r => pids.includes(r.projectId) && !isDone(r)); return {open: open.length, noEx: open.filter(r => !r.executorIds.length).length}; };
const noExPill = n => n ? `<span class="pill p-yel">${n}</span>` : '<span class="muted">—</span>';

/* «Все пространства»: ordinary task spaces and request spaces side by side; the admin manages request spaces here (FR-1) */
function renderSpaces(){
  const u = me(), admin = isAdmin(u), tree = queueTree(u);
  const stub = (n, lead) => `<tr class="stub-row"><td class="tt"><span class="ttx">${n}</span></td><td>${lead}</td><td class="muted" colspan="3">обычное пространство задач</td><td></td></tr>`;
  const rows = tree.map(({space: s}) => { const ps = spaceProjectsFor(u, s.id), c = openCounts(ps.map(p => p.id));
    return `<tr class="rw" data-a="nav" data-h="#/spaces/${s.id}"><td class="tt"><span class="ttx">${esc(s.name)}</span></td><td>${esc(pname(s.leadId))}</td><td class="tab-num">${ps.length}</td><td class="tab-num">${c.open}</td><td>${noExPill(c.noEx)}</td>
      <td class="acol nowrap">${canCreateProject(u, s.id) ? `<button class="btn btn-g btn-sm" data-a="admin-new" data-v="project" data-sid="${s.id}">${icon('plus',13)}Проект</button>` : ''}${canSpaceSettings(u, s.id) ? `<button class="ibtn" data-a="sp-open" data-sid="${s.id}" data-tab="general" title="Настройки пространства">${icon('gear',15)}</button>` : ''}${admin ? adminActs('space', s.id) : ''}</td></tr>`; }).join('');
  const arch = archOf('space').map(a => `<tr class="trashed"><td class="tt"><span class="ttx">${esc(a.data.space.name)}</span> <span class="pill p-grey">В архиве</span></td><td>${esc(pname(a.data.space.leadId))}</td><td class="tab-num">${a.data.projects.length}</td><td></td><td></td><td class="acol">${adminRestore(a)}</td></tr>`).join('');
  return `${trCrumbs(['Все пространства',''])}
    <div class="panel"><div class="phead"><h1>Все пространства</h1>${fr(1,17)}<div class="grow"></div>
      ${admin ? `<button class="btn btn-n" data-a="admin-new" data-v="space">${icon('plus',14)}Новое пространство</button><button class="btn btn-p" data-a="admin-new" data-v="project">${icon('plus',14)}Новый проект</button>` : ''}</div>
    <div class="pbody pad"><div style="display:flex;align-items:flex-start;gap:12px;margin:0 0 12px"><div class="note ph" style="flex:1">Пространства с заявками — обычные пространства трекера. Их видят руководитель пространства, руководители и участники проектов и администратор. ${admin ? 'Администратор создаёт, переименовывает и архивирует их здесь.' : ''}</div>${archSwitch()}</div>
      <div class="tblw"><table class="tbl"><thead><tr><th>Пространство</th><th>Руководитель пространства</th><th>Проектов</th><th>Заявок в работе</th><th>Без исполнителя</th><th></th></tr></thead><tbody>
        ${stub('Мое пространство', esc(pname(u)))}${stub('IT CP', '—')}${rows}${arch}</tbody></table></div></div></div>`;
}

/* «Проекты»: projects of all spaces; request projects show their queue counters */
function renderProjects(q){
  const u = me(), admin = isAdmin(u), tree = queueTree(u); q = q || {};
  const sel = q.space ? tree.find(x => x.space.id === q.space) : null;
  const rows = (sel ? [sel] : tree).flatMap(x => x.projects.map(p => ({x, p})));
  const stub = (n, sp) => `<tr class="stub-row"><td class="tt"><span class="ttx">${n}</span></td><td>${sp}</td><td class="hide-m muted" colspan="4">обычный проект задач</td><td></td></tr>`;
  const toolbar = tree.length ? `<div class="toolbar"><select class="sel sel-sm" data-c="flt" data-k="space"><option value="">Все пространства</option>${tree.map(x => `<option value="${x.space.id}" ${q.space===x.space.id?'selected':''}>${esc(x.space.name)}</option>`).join('')}</select>
    ${sel ? `<span class="muted" style="font-size:12px">Руководитель пространства: ${esc(pname(sel.space.leadId))}</span>` : ''}<div style="flex:1"></div>${archSwitch()}</div>` : '';
  const body = rows.map(({x, p}) => { const c = openCounts([p.id]);
    const role = p.leadId === u ? 'руководитель проекта' : p.memberIds.includes(u) ? 'участник проекта' : x.lead ? 'руководитель пространства' : 'администратор';
    return `<tr class="rw" data-a="nav" data-h="#/projects/${p.id}">
      <td class="tt"><span class="ttx">${esc(p.name)}</span></td>
      <td><button class="lnk" data-a="nav" data-h="#/spaces/${x.space.id}" title="Открыть пространство">${esc(x.space.name)}</button></td>
      <td class="hide-m t2">${role}</td><td class="tab-num">${visibleTypes(p.id).length}</td><td class="tab-num">${c.open}</td><td>${noExPill(c.noEx)}</td>
      <td class="acol nowrap">${canProjSettings(u, p.id) ? `<button class="ibtn" data-a="pj-open" data-pid="${p.id}" data-tab="types" title="Настройки проекта">${icon('gear',15)}</button>` : ''}${admin ? adminActs('project', p.id) : ''}</td></tr>`; }).join('');
  const arch = archOf('project').map(a => { const p = a.data.project, sp = space(p.spaceId) || (S.arch.find(x => x.kind === 'space' && x.data.space.id === p.spaceId) || {data:{space:{name:'—'}}}).data.space;
    return `<tr class="trashed"><td class="tt"><span class="ttx">${esc(p.name)}</span> <span class="pill p-grey">В архиве</span></td><td>${esc(sp.name)}</td><td class="hide-m"></td><td class="tab-num">${a.data.types.filter(t => !t.hidden).length}</td><td></td><td></td><td class="acol">${adminRestore(a)}</td></tr>`; }).join('');
  return `${trCrumbs(['Проекты',''])}
    <div class="panel"><div class="phead"><h1>Проекты</h1>${fr(4)}<div class="grow"></div>
      ${admin ? `<button class="btn btn-p" data-a="admin-new" data-v="project">${icon('plus',14)}Новый проект</button>` : ''}</div>
    ${toolbar}<div class="pbody"><table class="tbl"><thead><tr><th>Проект</th><th>Пространство</th><th class="hide-m">Ваша роль</th><th>Типов заявок</th><th>Заявок в работе</th><th>Без исполнителя</th><th></th></tr></thead><tbody>
      ${sel ? '' : stub('Мой проект', 'Мое пространство') + stub('IT CP', 'IT CP')}${body}${arch}</tbody></table></div></div>`;
}

function applyFilters(list, q){
  return list.filter(x => {
    if (q.proj && x.projectId !== q.proj) return false;
    if (q.type && x.typeId !== q.type) return false;
    if (q.status === '@open' ? isDone(x) : q.status && x.status !== q.status) return false;
    if (q.noexec === '1' && x.executorIds.length) return false;
    if (q.ff && q.fv) {
      const t = typ(x.typeId); if (!t.fields.some(f => f.f === q.ff)) return false;
      const v = x.values[q.ff]; if (isEmpty(v)) return false;
      const f = fld(q.ff);
      if (f.kind === 'multi') return v.includes(q.fv);
      if (f.kind === 'select') return v === q.fv;
      return String(v).toLowerCase().includes(q.fv.toLowerCase());
    }
    return true;
  });
}
function filterBar(spaceId, q, opts){
  const types = S.types.filter(t => opts.projectIds.includes(t.projectId));
  return `<div class="toolbar">
    ${opts.showProject ? `<select class="sel sel-sm" data-c="flt" data-k="proj"><option value="">Все проекты</option>${S.projects.filter(p => p.spaceId === spaceId).map(p => `<option value="${p.id}" ${q.proj===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}</select>` : ''}
    <select class="sel sel-sm" data-c="flt" data-k="type"><option value="">Все типы</option>${types.map(t => `<option value="${t.id}" ${q.type===t.id?'selected':''}>${esc(t.name)}${t.hidden?' (скрыт)':''}</option>`).join('')}</select>
    <select class="sel sel-sm" data-c="flt" data-k="status"><option value="">Любой статус</option><option value="@open" ${q.status==='@open'?'selected':''}>Все незавершённые</option>${space(spaceId).statuses.map(s => `<option value="${s.id}" ${q.status===s.id?'selected':''}>${esc(s.name)}${s.final?' (завершающий)':''}</option>`).join('')}</select>
    <label class="chk"><input type="checkbox" data-c="flt-noexec" ${q.noexec==='1'?'checked':''}>Без исполнителя</label>
    ${(q.proj||q.type||q.status||q.noexec) ? `<button class="btn btn-g btn-sm" data-a="flt-clear">Сбросить</button>` : ''}
  </div>`;
}
function queueTable(list, showProject){
  if (!list.length) return `<div class="empty"><div class="eic">${icon('inbox',24)}</div><h4>Заявок нет</h4><p>Под выбранные условия заявок нет.</p></div>`;
  return `<table class="tbl"><thead><tr><th>№</th><th>Название</th>${showProject?'<th>Проект</th>':''}<th>Тип</th><th>Статус</th><th>Исполнители</th><th>Заявитель</th><th>Срок</th><th>Создана</th></tr></thead><tbody>
    ${list.map(x => `<tr class="rw" data-a="card" data-id="${x.id}"><td class="idn m-hide">#${x.id}</td><td class="tt"><span class="ttx">${esc(x.title)}</span></td>
      ${showProject?`<td data-l="Проект">${esc(proj(x.projectId).name)}</td>`:''}<td data-l="Тип">${esc(typ(x.typeId).name)}</td><td>${stPill(x)}</td>
      <td data-l="Исполнители">${x.executorIds.length ? `<span class="ppl">${x.executorIds.map(e => av(e,20)).join('')}<span class="t2">${x.executorIds.length===1?esc(pname(x.executorIds[0])):''}</span></span>` : `<span class="pill p-yel">не назначен</span>`}</td>
      <td data-l="Заявитель"><span class="ppl">${av(x.requesterId,18)}${esc(pname(x.requesterId))}</span></td><td data-l="Срок" class="tab-num">${fmtDT(x.deadline)}</td><td data-l="Создана" class="tab-num nowrap">${fmtDT(x.createdAt)}</td></tr>`).join('')}
  </tbody></table>`;
}
function kanban(list, sp){
  const u = me();
  return `<div class="note ph" style="margin:10px 12px 0"><div>Колонки канбана — статусы пространства ${esc(sp.name)}, стадий у заявок нет. Перетащить карточку могут исполнитель, руководители проекта/пространства и администратор, по тем же правилам, что смена статуса в карточке. Кнопки «+» нет ${fr(4,11,15,16)}</div></div>
  <div class="kb">${sp.statuses.map(st => {
    const items = list.filter(x => x.status === st.id);
    return `<div class="kcol" data-kcol="${st.id}"><h4>${stPillS(sp, st)}<span class="muted">${items.length}</span></h4>
      ${items.map(x => `<div class="kcard ${canWork(u, x) ? 'kdrag' : ''}" data-a="card" data-id="${x.id}" ${canWork(u, x) ? `draggable="false" data-kb="${x.id}" title="Перетащите в другую колонку, чтобы сменить статус"` : ''}><span class="idn">#${x.id} · ${esc(typ(x.typeId).name)}</span><b>${esc(x.title)}</b>
        <div class="kmeta">${x.executorIds.length ? x.executorIds.map(e => av(e,18)).join('') : '<span class="pill p-yel">без исполнителя</span>'}<span>${icon('user',12)}</span>${esc(pname(x.requesterId))}${x.deadline?`<span>${icon('cal',12)}</span>${fmtDT(x.deadline)}`:''}</div></div>`).join('')}
      ${!items.length ? '<div class="muted" style="padding:6px">Пусто</div>' : ''}</div>`;
  }).join('')}</div>`;
}

function renderProjectQueue(pid, q){
  const u = me(); const p = proj(pid);
  if (!p) return denied('Проект не найден.');
  if (!canView(u, pid)) return denied('Заявки проекта видны только руководителю пространства, руководителю и участникам проекта, а также администратору. ' + fr(17,19));
  const s = space(p.spaceId);
  const view = q.view || 'list';
  const list = applyFilters(S.requests.filter(x => x.projectId === pid), q).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  const subKey = u + ':' + pid;
  return `${trCrumbs(['Все пространства','#/spaces'],[s.name,'#/spaces/'+s.id],[p.name,''])}
    <div class="panel">
      <div class="phead"><h1>${esc(p.name)}</h1><span class="muted hide-m">Пространство ${esc(s.name)} · руководитель проекта ${esc(pname(p.leadId))}</span>
        <div class="grow"></div>
        ${internal(u, pid) ? `<label class="switch" title="Личная подписка, видна только вам"><input type="checkbox" data-c="subs" data-pid="${pid}" ${S.subs[subKey]?'checked':''}><span class="tr"></span>Уведомлять о новых заявках${fr(31)}</label>` : ''}
        ${canProjSettings(u,pid) ? `<button class="btn btn-n" data-a="pj-open" data-pid="${pid}" data-tab="types">${icon('gear',14)}Настройки проекта</button>` : ''}
        ${visibleTypes(pid).length ? `<button class="btn btn-p" data-a="new-req" data-pid="${pid}">${icon('plus',14)}Новая заявка</button>` : ''}</div>
      <div class="ptabs">
        <button class="ptab ${view==='list'?'on':''}" data-a="qview" data-v="list">${icon('list',14)}Список</button>
        <button class="ptab ${view==='kanban'?'on':''}" data-a="qview" data-v="kanban">${icon('kanban',14)}Канбан</button>${fr(4)}
      </div>
      ${filterBar(p.spaceId, q, {projectIds:[pid]})}
      <div class="pbody">${view==='kanban' ? kanban(list, s) : queueTable(list, false)}</div>
    </div>`;
}
function spaceProjectsFor(u, sid){
  return S.projects.filter(p => p.spaceId === sid && (isSpaceLead(u, sid) || isAdmin(u) || p.leadId === u || p.memberIds.includes(u)));
}
function renderSpaceQueue(sid, q){
  const u = me(); const s = space(sid);
  if (!s) return denied('Пространство не найдено.');
  const ps = spaceProjectsFor(u, sid);
  if (!ps.length && !(isSpaceLead(u, sid) || isAdmin(u))) return denied('Пространство видят руководитель пространства, руководители и участники его проектов. ' + fr(17));
  if (!ps.length) return `${trCrumbs(['Все пространства','#/spaces'],[s.name,''])}
    <div class="panel"><div class="phead"><h1>${esc(s.name)}</h1><span class="muted hide-m">Руководитель пространства: ${esc(pname(s.leadId))}</span>${fr(17)}</div>
      <div class="empty"><div class="eic">${icon('clip',24)}</div><h4>Проектов пока нет</h4><p>В пространстве ${esc(s.name)} ещё не создан ни один заявочный проект. Проекты создаёт администратор или руководитель этого пространства ${fr(1)}</p>
        ${canSpaceSettings(u, sid) ? `<button class="btn btn-n" data-a="sp-open" data-sid="${sid}" data-tab="general">${icon('gear',14)}Настройки пространства</button>` : ''}
        ${canCreateProject(u,sid) ? `<button class="btn btn-p" data-a="admin-new" data-v="project" data-sid="${s.id}">${icon('plus',14)}Новый проект</button>` : ''}</div></div>`;
  const lead = isSpaceLead(u, sid);
  const pids = ps.map(p => p.id);
  const list = applyFilters(S.requests.filter(x => pids.includes(x.projectId)), q).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  return `${trCrumbs(['Все пространства','#/spaces'],[s.name,''])}
    <div class="panel">
      <div class="phead"><h1>${esc(s.name)}</h1><span class="muted hide-m">Руководитель пространства: ${esc(pname(s.leadId))}</span>${fr(17)}
        <span class="note ph" style="padding:3px 8px">${lead ? 'Вы руководитель пространства: видны заявки всех проектов' : isAdmin(u) ? 'Вы администратор: видны и доступны для работы заявки всех проектов' : 'Видны заявки только тех проектов, где вы руководитель или участник'}. Допущение прототипа</span>
        <div class="grow"></div>
        ${canSpaceSettings(u, sid) ? `<button class="btn btn-n" data-a="sp-open" data-sid="${sid}" data-tab="general">${icon('gear',14)}Настройки пространства</button>` : ''}
        ${canCreateProject(u,sid) ? `<button class="btn btn-p" data-a="admin-new" data-v="project" data-sid="${sid}">${icon('plus',14)}Новый проект</button>` : ''}</div>
      ${filterBar(sid, q, {projectIds:pids, showProject:true})}
      <div class="pbody">${queueTable(list, true)}</div>
    </div>`;
}

/* ---------- space settings modal (FR-12, FR-15, FR-1) ---------- */
const ST_COLORS = ['#778297','#2e60f2','#8b2ff1','#0e7490','#c58909','#e15705','#357f3e','#d22422','#be185d','#0f172a'];
function openSpaceModal(sid, tab){
  const s = space(sid);
  UI.spMenu = null;
  UI.spModal = {sid, tab: tab || 'general', err:null, showHidden:false, opts:null, color:null,
    statuses: s.statuses.map(x => ({...x})),
    fields: S.fields.filter(f => f.spaceId === sid).map(f => ({id:f.id, name:f.name, kind:f.kind, hidden:!!f.hidden,
      options: f.options ? f.options.map(o => ({o, v:o})) : null})),
    leads: Object.fromEntries(S.projects.filter(p => p.spaceId === sid).map(p => [p.id, p.leadId]))};
}
function closeSpaceModal(){
  const sid = UI.spModal && UI.spModal.sid; UI.spModal = null;
  if (/^#\/spaces\/[^/]+\/settings/.test(location.hash)) location.hash = '#/spaces/' + sid; else render();
}
const optUsage = (fid, o) => S.requests.filter(r => { const v = r.values[fid]; return Array.isArray(v) ? v.includes(o) : v === o; }).length;
const fieldUsage = fid => S.types.filter(t => t.fields.some(x => x.f === fid)).length;
const valCount = fid => S.requests.filter(r => !isEmpty(r.values[fid])).length;
const statusUsage = (sid, id) => S.requests.filter(r => r.status === id && proj(r.projectId).spaceId === sid).length;

const finalLocked = (d, x) => { if (x.isNew) return false; const o = space(d.sid).statuses.find(y => y.id === x.id); return !!(o && o.final && statusUsage(d.sid, x.id)); };
function smStatusesTab(d){
  return `<button class="btn btn-o" data-a="sm-st-add" style="margin-bottom:12px">${icon('plus',14)}Добавить статус</button>
    <div class="stbl"><table><thead><tr><th class="gcol"></th><th>Название статуса</th><th style="width:90px">Цвет</th><th style="width:190px">Тип статуса</th><th class="acol"></th></tr></thead><tbody>
    ${d.statuses.map((x, i) => { const n = x.id && !x.isNew ? statusUsage(d.sid, x.id) : 0; return `<tr data-dnd-row="s" data-i="${i}">
      <td class="gcol"><span class="grip" draggable="true" data-dnd="s" data-i="${i}" title="Перетащите, чтобы изменить порядок">${icon('grip',16)}</span></td>
      <td><div class="iecell"><input class="ie b" data-in="s-name" data-i="${i}" value="${esc(x.name)}" placeholder="Название статуса">${n ? `<span class="t2 nowrap ph">${n} ${plural(n,'заявка','заявки','заявок')}</span>` : ''}</div></td>
      <td><div class="dd"><button class="cdot" data-a="sm-color" data-i="${i}" style="background:${x.color||ST_COLORS[0]}" title="Цвет статуса"></button>
        ${d.color === i ? `<div class="ddm cpal">${ST_COLORS.map(c => `<button class="cdot ${c===(x.color||ST_COLORS[0])?'sel':''}" data-a="sm-color-set" data-i="${i}" data-c2="${c}" style="background:${c}"></button>`).join('')}</div>` : ''}</div></td>
      <td>${i === 0 ? '<span class="t2" style="padding:0 6px">Начальный</span>'
        : finalLocked(d, x) ? `<select class="sel sel-sm sel-ghost" disabled title="В статусе ${n} ${plural(n,'заявка','заявки','заявок')}: снять признак «Завершающий» нельзя"><option selected>Завершающий</option></select>`
        : `<select class="sel sel-sm sel-ghost" data-c="sm-st-type" data-i="${i}"><option value="work" ${x.final?'':'selected'}>В работе</option><option value="final" ${x.final?'selected':''}>Завершающий</option></select>`}</td>
      <td class="acol"><button class="ibtn red" data-a="sm-st-rm" data-i="${i}" ${n ? `disabled title="В статусе ${n} ${plural(n,'заявка','заявки','заявок')}: удалить нельзя"` : 'title="Удалить статус"'}>${icon('trash',15)}</button></td></tr>`; }).join('')}
    </tbody></table></div>
    <div class="hint ph" style="margin-top:8px">Первый статус — начальный, с ним создаётся новая заявка. Завершающих может быть несколько, без завершающего сохранить нельзя. Статус, в котором есть заявки, нельзя удалить, а с завершающего статуса с заявками нельзя снять признак «Завершающий» ${fr(15)}.</div>`;
}

function smOptionsEditor(f, i){
  const opts = f.options || [];
  return `<tr class="optrow"><td></td><td colspan="5"><div class="opted">
    <div class="opth"><b>Варианты списка</b><span class="muted">${f.kind === 'multi' ? 'в заявке можно выбрать несколько' : 'в заявке выбирают один'}</span></div>
    ${opts.length ? `<div class="olist">${opts.map((o, j) => { const n = o.o ? optUsage(f.id, o.o) : 0; return `<div class="orow" data-dnd-row="o${i}" data-i="${j}">
      <span class="grip" draggable="true" data-dnd="o${i}" data-i="${j}" title="Перетащите, чтобы изменить порядок">${icon('grip',14)}</span>
      <input class="ie" data-in="o-name" data-fi="${i}" data-i="${j}" value="${esc(o.v)}" placeholder="Название варианта">
      <span class="muted nowrap" style="font-size:11.5px">${n ? `в ${n} ${plural(n,'заявке','заявках','заявках')}` : ''}</span>
      <button class="ibtn" data-a="o-rm" data-fi="${i}" data-i="${j}" ${n ? 'disabled title="Вариант выбран в заявках: его можно переименовать, но не удалить"' : 'title="Удалить вариант"'}>${icon('x',14)}</button></div>`; }).join('')}</div>`
      : '<div class="muted" style="padding:4px 0 8px">Вариантов пока нет. Добавьте хотя бы один.</div>'}
    <div class="oadd"><input class="inp inp-sm" id="oNew" data-fi="${i}" placeholder="Новый вариант"><button class="btn btn-s btn-sm" data-a="o-add" data-fi="${i}">${icon('plus',13)}Добавить</button></div>
    <div class="hint">Enter — добавить вариант. Можно вставить список из Excel или текста: каждая строка станет отдельным вариантом.</div>
  </div></td></tr>`;
}
function smFieldsTab(d){
  const rows = d.fields.map((f, i) => ({f, i})).filter(x => d.showHidden || !x.f.hidden);
  return `<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px"><button class="btn btn-o" data-a="sm-f-add">${icon('plus',14)}Добавить поле</button><div class="grow"></div>
      <label class="switch"><input type="checkbox" data-c="sm-f-hidden" ${d.showHidden?'checked':''}><span class="tr"></span>Скрытые</label></div>
    <div class="stbl"><table><thead><tr><th class="gcol"></th><th>Название поля</th><th style="width:190px">Тип поля</th><th style="width:150px">Варианты</th><th style="width:90px">В типах</th><th class="acol"></th></tr></thead><tbody>
    ${rows.map(({f, i}) => { const list = f.kind === 'select' || f.kind === 'multi'; const n = f.isNew ? 0 : fieldUsage(f.id); const open = d.opts === i && list;
      return `<tr data-dnd-row="f" data-i="${i}" class="${f.hidden?'trashed':''} ${open?'open':''}">
      <td class="gcol">${f.hidden ? '' : `<span class="grip" draggable="true" data-dnd="f" data-i="${i}" title="Перетащите, чтобы изменить порядок">${icon('grip',16)}</span>`}</td>
      <td><input class="ie b" data-in="f-name" data-i="${i}" value="${esc(f.name)}" placeholder="Название поля" ${f.hidden?'disabled':''}></td>
      <td><select class="sel sel-sm sel-ghost" data-c="sm-f-kind" data-i="${i}" ${f.hidden?'disabled':''}>${Object.entries(KIND_LABEL).map(([k,l]) => `<option value="${k}" ${k===f.kind?'selected':''}>${l}</option>`).join('')}</select></td>
      <td>${list ? `<button class="optbtn ${(f.options||[]).length?'':'noopt'}" data-a="sm-opts" data-i="${i}" ${f.hidden?'disabled':''}>${(f.options||[]).length ? (f.options.length + ' ' + plural(f.options.length,'вариант','варианта','вариантов')) : icon('plus',12) + 'Варианты'}${(f.options||[]).length ? icon(open?'up':'down',12) : ''}</button>` : '<span class="muted">—</span>'}</td>
      <td class="t2">${n || '<span class="muted">—</span>'}</td>
      <td class="acol">${f.hidden ? `<button class="ibtn" data-a="sm-f-hide" data-i="${i}" title="Вернуть поле">${icon('undo',15)}</button>`
        : `<button class="ibtn red" data-a="sm-f-hide" data-i="${i}" title="Скрыть поле: оно пропадёт из форм подачи и карточек">${icon('archive',15)}</button>`}</td></tr>
      ${open ? smOptionsEditor(f, i) : ''}`; }).join('') || '<tr><td colspan="6" class="muted" style="text-align:center;padding:24px">Полей нет</td></tr>'}
    </tbody></table></div>
    <div class="hint ph" style="margin-top:8px">Название и описание есть у каждой заявки, полями пространства не являются. Скрытое поле нельзя добавить в тип, оно пропадает из форм подачи и упрощённых карточек ${fr(12,20)}. Типы полей — как у пользовательских полей трекера. Поле не удаляется, только скрывается. Тип поля можно сменить в любой момент, как у пользовательского поля пространства: значения в заявках не пересчитываются и не очищаются.</div>`;
}
function smProjectsTab(d){
  const ps = S.projects.filter(p => p.spaceId === d.sid);
  return `${canCreateProject(me(),d.sid) ? `<button class="btn btn-p" style="margin-bottom:12px" data-a="admin-new" data-v="project" data-sid="${d.sid}">${icon('plus',14)}Новый проект</button>` : ''}<div class="stbl"><table><thead><tr><th>Проект</th><th style="width:230px">Руководитель проекта</th><th>Участники</th><th style="width:70px">Типов</th></tr></thead><tbody>
    ${ps.map(p => `<tr><td><b>${esc(p.name)}</b></td><td><select class="sel sel-sm sel-ghost" data-c="sm-lead" data-pid="${p.id}">${S.people.map(x => `<option value="${x.id}" ${x.id===d.leads[p.id]?'selected':''}>${esc(x.name)}</option>`).join('')}</select></td>
      <td class="t2">${p.memberIds.length ? p.memberIds.map(pname).map(esc).join(', ') : '—'}</td><td class="t2">${S.types.filter(t => t.projectId === p.id).length}</td></tr>`).join('')}
    </tbody></table></div>
    <div class="hint" style="margin-top:8px">Нового руководителя проекта можно выбрать из всех пользователей портала. Прежний руководитель остаётся в составе проекта участником ${fr(1)}.</div>`;
}
function renderSpaceModal(){
  const d = UI.spModal, s = space(d.sid);
  const tabs = [['general','Общие настройки'],['statuses','Статусы', d.statuses.length],['fields','Поля пространства', d.fields.filter(f => !f.hidden).length],['projects','Проекты', S.projects.filter(p => p.spaceId === d.sid).length]];
  const body = d.tab === 'statuses' ? smStatusesTab(d) : d.tab === 'fields' ? smFieldsTab(d) : d.tab === 'projects' ? smProjectsTab(d)
    : `<div class="frow"><label class="lbl2">Название пространства</label><input class="inp w100" value="${esc(s.name)}" disabled></div>
       <div class="frow"><label class="lbl2">Руководитель пространства</label><div style="display:flex;align-items:center;gap:6px">${pchip(s.leadId)}</div></div>
       <div class="hint">Название и руководителя пространства администратор меняет на вкладке «Администрирование» ${fr(1)}.</div>`;
  return `<div class="ovl top" data-a="sm-bg"><div class="mdl w-lg" data-stop="1">
    <div class="mh"><h2>Редактировать пространство: ${esc(s.name)}</h2>${fr(12,15)}<button class="btn btn-n btn-i btn-sm" data-a="sm-cancel" title="Закрыть">${icon('x',14)}</button></div>
    <div class="mb">
      <div class="seg">${tabs.map(([k,l,n]) => `<button class="${d.tab===k?'on':''}" data-a="sm-tab" data-v="${k}">${l}${n ? `<span class="cbadge">${n}</span>` : ''}</button>`).join('')}</div>
      <div style="padding-top:12px">${body}</div>
    </div>
    <div class="mf">${d.tab === 'general' ? '' : '<button class="btn btn-p" data-a="sm-save">Сохранить</button><button class="btn btn-n" data-a="sm-cancel">Отмена</button>'}
      ${d.tab === 'general' ? '<button class="btn btn-n" data-a="sm-cancel">Закрыть</button>' : ''}
      ${d.err ? `<span class="errt" style="margin:0 0 0 8px">${esc(d.err)}</span>` : ''}</div>
  </div></div>`;
}
function saveSpaceModal(){
  const d = UI.spModal, s = space(d.sid);
  const err = (tab, text) => { d.err = text; d.tab = tab; render(); };
  if (d.statuses.some(x => !x.name.trim())) return err('statuses', 'У каждого статуса должно быть название');
  if (!d.statuses.some(x => x.final)) return err('statuses', 'Нужен хотя бы один завершающий статус');
  if (d.statuses[0].final) return err('statuses', 'Первый статус начальный и не может быть завершающим');
  if (d.statuses.some(x => finalLocked(d, x) && !x.final)) return err('statuses', 'С завершающего статуса, в котором есть заявки, нельзя снять признак «Завершающий»');
  const bad = d.fields.find(f => !f.name.trim());
  if (bad) return err('fields', 'У каждого поля должно быть название');
  for (const [i, f] of d.fields.entries()) {
    if (!isList(f.kind) || f.hidden) continue;
    const vs = (f.options || []).map(o => o.v.trim());
    if (!vs.length) { d.opts = i; return err('fields', `У поля «${f.name}» нет вариантов`); }
    if (vs.some(v => !v)) { d.opts = i; return err('fields', `У поля «${f.name}» есть вариант без названия`); }
    if (new Set(vs.map(v => v.toLowerCase())).size !== vs.length) { d.opts = i; return err('fields', `У поля «${f.name}» повторяются варианты`); }
  }
  s.statuses = d.statuses.map((x, i) => ({id: x.isNew ? 'st' + Date.now() + i : x.id, name: x.name.trim(), color: x.color || ST_COLORS[0], ...(x.final ? {final:true} : {})}));
  const others = S.fields.filter(f => f.spaceId !== d.sid);
  const mine = d.fields.map((f, i) => {
    const id = f.isNew ? 'f' + Date.now() + i : f.id;
    const list = isList(f.kind);
    if (list && !f.isNew) (f.options || []).forEach(o => { if (o.o && o.o !== o.v.trim()) S.requests.forEach(r => {
      const v = r.values[id]; if (Array.isArray(v)) r.values[id] = v.map(x => x === o.o ? o.v.trim() : x); else if (v === o.o) r.values[id] = o.v.trim(); }); });
    return {id, spaceId: d.sid, name: f.name.trim(), kind: f.kind, ...(f.options && (list || f.options.length) ? {options: f.options.map(o => o.v.trim()).filter(Boolean)} : {}), ...(f.hidden ? {hidden:true} : {})};
  });
  S.fields = others.concat(mine);
  S.projects.filter(p => p.spaceId === d.sid).forEach(p => setProjLead(p, d.leads[p.id]));
  toast(`Настройки пространства ${s.name} сохранены`);
  closeSpaceModal();
}
function moveItem(list, from, to){ const [x] = list.splice(from, 1); list.splice(to > from ? to - 1 : to, 0, x); }
function addOptions(fi, text){
  const f = UI.spModal.fields[fi]; f.options = f.options || [];
  text.split(/\r?\n/).map(v => v.trim()).filter(Boolean).forEach(v => { if (!f.options.some(o => o.v.trim().toLowerCase() === v.toLowerCase())) f.options.push({o:null, v}); });
}

/* ---------- project settings modal (FR-13, FR-24, FR-27) ---------- */
function openProjModal(pid, tab){
  UI.spMenu = UI.pjMenu = null; UI.typeDraft = null; UI.typeErr = null;
  UI.pjModal = {pid, tab: ['general','members'].includes(tab) ? tab : 'types', showHidden:false, deadlineDays:proj(pid).deadlineDays??''};
}
function closeProjModal(){
  const pid = UI.pjModal && UI.pjModal.pid; UI.pjModal = null; UI.typeDraft = null;
  if (/^#\/projects\/[^/]+\/settings/.test(location.hash)) location.hash = '#/projects/' + pid; else render();
}
function projMenu(p, lead){
  return `<div class="ddm" data-stop="1">
    <button data-a="sp-newtab">${icon('ext',14)}Открыть в новой вкладке</button>
    <button data-a="pj-copy" data-pid="${p.id}">${icon('link',14)}Копировать ссылку</button>
    ${lead ? `<div class="hr"></div>
      <button data-a="pj-open" data-pid="${p.id}" data-tab="types">${icon('layers',14)}Типы заявок</button>
      <button data-a="pj-open" data-pid="${p.id}" data-tab="members">${icon('users',14)}Состав проекта</button>
      <button data-a="pj-open" data-pid="${p.id}" data-tab="types">${icon('gear',14)}Настройки проекта</button>` : ''}
  </div>`;
}
function pmTypesTab(p, d){
  const all = S.types.filter(t => t.projectId === p.id);
  const rows = all.filter(t => d.showHidden || !t.hidden);
  const hiddenN = all.filter(t => t.hidden).length;
  return `<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px"><button class="btn btn-o" data-a="type-new" data-pid="${p.id}">${icon('plus',14)}Создать тип</button><div class="grow"></div>
      <label class="switch"><input type="checkbox" data-c="pm-hidden" ${d.showHidden?'checked':''}><span class="tr"></span>Скрытые${hiddenN ? `<span class="cbadge">${hiddenN}</span>` : ''}</label></div>
    ${all.length ? `<div class="stbl"><table><thead><tr><th>Тип заявки</th><th style="width:210px">Поля формы</th><th style="width:240px">Исполнители по умолчанию</th><th class="acol"></th></tr></thead><tbody>
      ${rows.map(t => `<tr class="${t.hidden?'trashed':''}">
        <td><button class="tlink" data-a="type-edit" data-id="${t.id}" title="Изменить тип">${esc(t.name)}</button></td>
        <td class="t2" title="${esc(t.fields.map(x => fld(x.f).name + (x.r ? ' *' : '')).join(', '))}">${t.fields.length ? `${t.fields.length} ${plural(t.fields.length,'поле','поля','полей')}, обязательных ${t.fields.filter(x => x.r).length}` : '<span class="muted">только название и описание</span>'}</td>
        <td>${t.exec.length ? `<span class="ppl">${t.exec.map(e => av(e,20)).join('')}<span class="t2">${esc(t.exec.map(pname).join(', '))}</span></span>` : '<span class="pill p-yel">нет</span>'}</td>
        <td class="acol nowrap"><button class="ibtn" data-a="type-edit" data-id="${t.id}" title="Изменить тип">${icon('pen',15)}</button>${t.hidden ? `<button class="ibtn" data-a="type-hide" data-id="${t.id}" title="Вернуть тип: его снова можно выбрать для новой заявки">${icon('undo',15)}</button>`
          : visibleTypes(p.id).length === 1 ? `<button class="ibtn" disabled title="Это единственный доступный тип проекта. Без него проект пропадёт из окна подачи — сначала создайте другой тип">${icon('archive',15)}</button>`
          : `<button class="ibtn red" data-a="type-hide" data-id="${t.id}" title="Скрыть тип: его нельзя будет выбрать для новой заявки">${icon('archive',15)}</button>`}</td></tr>`).join('') || '<tr><td colspan="4" class="muted" style="text-align:center;padding:24px">Все типы скрыты</td></tr>'}
      </tbody></table></div>`
    : `<div class="empty"><div class="eic">${icon('layers',24)}</div><h4>Типов заявок нет</h4><p>Пока в проекте нет типов, его нет в окне подачи заявки ${fr(8)}</p></div>`}
    <div class="hint ph" style="margin-top:8px">Скрытый тип нельзя выбрать для новой заявки, поданные заявки этого типа остаются ${fr(13)}. В проекте всегда остаётся хотя бы один доступный тип, иначе проект пропадёт из окна подачи. Исполнители по умолчанию задаются только на типе ${fr(24)}.</div>`;
}
function pmTypeEditor(p){
  const d = UI.typeDraft, s = space(p.spaceId);
  const used = d.fields.map(x => x.f);
  const avail = S.fields.filter(f => f.spaceId === p.spaceId && !f.hidden && !used.includes(f.id));
  const execCand = uniq([p.leadId, ...p.memberIds]).filter(x => !d.exec.includes(x));
  return `<button class="btn btn-g btn-sm" data-a="type-cancel" style="margin:-4px 0 10px -6px">${icon('left',13)}Все типы заявок</button>
    ${d.id ? `<div class="hint" style="margin-bottom:10px"><a href="${href('/requests/mine',{new:d.id})}" target="_blank" rel="noopener">Открыть форму этого типа</a> · пример прямой ссылки для чат-бота ${fr(32)}</div>` : ''}
    <div class="frow"><label class="lbl2">Название типа<span class="req">*</span></label><input class="inp w100 ${UI.typeErr?'err':''}" id="tdName" value="${esc(d.name)}" placeholder="Например, «Справка»">${UI.typeErr?`<div class="errt">${UI.typeErr}</div>`:''}</div>
    <div class="frow"><label class="lbl2">Поля формы ${fr(13)}</label>
      <div class="stbl"><table><thead><tr><th class="gcol"></th><th>Поле</th><th style="width:140px">Тип поля</th><th style="width:130px">Обязательное</th><th class="acol"></th></tr></thead><tbody>
        <tr class="fixed"><td class="gcol"></td><td><b>Название заявки</b></td><td class="t2" colspan="2">есть у каждой заявки, обязательно</td><td class="acol"></td></tr>
        <tr class="fixed"><td class="gcol"></td><td><b>Описание</b></td><td class="t2" colspan="2">есть у каждой заявки</td><td class="acol"></td></tr>
        ${d.fields.map((x, i) => { const f = fld(x.f); return `<tr data-dnd-row="t" data-i="${i}">
          <td class="gcol"><span class="grip" draggable="true" data-dnd="t" data-i="${i}" title="Перетащите, чтобы изменить порядок в форме">${icon('grip',16)}</span></td>
          <td><b>${esc(f.name)}</b>${f.hidden ? ' <span class="pill p-grey">скрыто в пространстве</span>' : ''}</td>
          <td class="t2">${KIND_LABEL[f.kind] || ''}</td>
          <td><label class="switch"><input type="checkbox" data-c="td-req" data-i="${i}" ${x.r?'checked':''}><span class="tr"></span></label></td>
          <td class="acol"><button class="ibtn" data-a="td-rm" data-i="${i}" title="Убрать поле из типа">${icon('x',15)}</button></td></tr>`; }).join('')}
      </tbody></table></div>
      <div style="display:flex;gap:10px;margin-top:8px;flex-wrap:wrap;align-items:center">
        <select class="sel sel-sm" data-c="td-add" ${avail.length?'':'disabled'}><option value="">+ Добавить поле пространства…</option>${avail.map(f => `<option value="${f.id}">${esc(f.name)} — ${KIND_LABEL[f.kind]}</option>`).join('')}</select>
        <span class="hint" style="margin:0">Нужного поля нет? Его заводит администратор или руководитель пространства ${esc(s.name)} — ${esc(pname(s.leadId))} ${fr(12)}</span>
      </div></div>
    <div class="frow"><label class="lbl2">Исполнители по умолчанию ${fr(24)}</label>
      <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">${d.exec.map(e => pchip(e, {rm:'td-exec-rm'})).join('')}
        <select class="sel sel-sm" data-c="td-exec-add" ${execCand.length?'':'disabled'}><option value="">+ Добавить из состава проекта…</option>${execCand.map(x => `<option value="${x}">${esc(pname(x))}</option>`).join('')}</select></div>
      <div class="hint">Если исполнителей нет, заявка создаётся без исполнителя и ждёт в очереди, пока её возьмут в работу.</div></div>
    ${d.id && !typ(d.id).hidden && visibleTypes(p.id).length === 1
      ? `<label class="switch dis"><input type="checkbox" disabled><span class="tr"></span>Скрытый тип: нельзя выбрать для новой заявки</label><div class="hint">Это единственный доступный тип проекта: скрыть его нельзя, иначе проект пропадёт из окна подачи. Сначала создайте другой тип.</div>`
      : `<label class="switch"><input type="checkbox" data-c="td-hidden" ${d.hidden?'checked':''}><span class="tr"></span>Скрытый тип: нельзя выбрать для новой заявки</label>`}`;
}
function pmMembersTab(p){
  const candidates = S.people.filter(x => x.id !== p.leadId && !p.memberIds.includes(x.id));
  return `<div class="stbl"><table><thead><tr><th>Сотрудник</th><th style="width:220px">Роль в проекте</th><th class="acol"></th></tr></thead><tbody>
      <tr><td>${pchip(p.leadId)}</td><td class="t2">Руководитель проекта</td><td class="acol"></td></tr>
      ${p.memberIds.map(m => `<tr><td>${pchip(m)}</td><td class="t2">Участник проекта</td><td class="acol"><button class="ibtn red" data-a="member-rm" data-id="${p.id}" data-u="${m}" title="Убрать из проекта">${icon('trash',15)}</button></td></tr>`).join('')}
    </tbody></table></div>
    <div style="display:flex;gap:8px;margin-top:10px;align-items:center;flex-wrap:wrap"><select class="sel sel-sm" id="addMember" style="min-width:300px"><option value="">Выберите сотрудника…</option>${candidates.map(x => `<option value="${x.id}">${esc(x.name)} — ${esc(x.pos)}</option>`).join('')}</select>
      <button class="btn btn-o btn-sm" data-a="member-add" data-pid="${p.id}">${icon('userplus',13)}Добавить участника</button></div>
    <div class="hint ph" style="margin-top:8px">Руководителя проекта меняет администратор или руководитель пространства ${fr(1)}. Если убрать человека из проекта, он пропадает из исполнителей по умолчанию всех типов проекта; на заявках в работе остаётся исполнителем, пока его не снимет руководитель ${fr(27)}.</div>`;
}
function renderProjModal(){
  const d = UI.pjModal, p = proj(d.pid);
  const editing = d.tab === 'types' && !!(UI.typeDraft && UI.typeDraft.projectId === p.id);
  const tabs = [['general','Общие настройки'],['types','Типы заявок', S.types.filter(t => t.projectId === p.id && !t.hidden).length],['members','Состав проекта', 1 + p.memberIds.length]];
  const body = d.tab === 'general' ? `<div class="frow"><label class="lbl2" for="projectDeadlineDays">Крайний срок по умолчанию, дней</label><input id="projectDeadlineDays" class="inp w100" type="number" min="1" step="1" value="${esc(d.deadlineDays)}" placeholder="Не задан"><div class="hint">Количество календарных дней от подачи заявки. Время подачи сохраняется. Пустое значение — новые заявки без срока. Существующие заявки не пересчитываются ${fr(33)}.</div>${d.err?`<div class="errt">${esc(d.err)}</div>`:''}</div><button class="btn btn-p" data-a="pm-general-save">Сохранить настройки проекта</button>` : d.tab === 'members' ? pmMembersTab(p) : editing ? pmTypeEditor(p) : pmTypesTab(p, d);
  return `<div class="ovl top" data-a="pm-bg"><div class="mdl w-lg" data-stop="1">
    <div class="mh"><h2>Редактировать проект: ${esc(p.name)}</h2>${fr(13,24)}<button class="btn btn-n btn-i btn-sm" data-a="pm-close" title="Закрыть">${icon('x',14)}</button></div>
    <div class="mb">
      <div class="seg">${tabs.map(([k,l,n]) => `<button class="${d.tab===k?'on':''}" data-a="pm-tab" data-v="${k}">${l}${n==null?'':`<span class="cbadge">${n}</span>`}</button>`).join('')}</div>
      <div style="padding-top:12px">${body}</div>
    </div>
    <div class="mf"><span class="muted ph" style="margin-right:auto;font-size:11.5px">Вид проекта: заявочный, сменить нельзя ${fr(1)}</span>
      ${editing ? `<button class="btn btn-p" data-a="type-save">${UI.typeDraft.id ? 'Сохранить тип' : 'Создать тип'}</button><button class="btn btn-n" data-a="type-cancel">Отмена</button>` : '<button class="btn btn-n" data-a="pm-close">Закрыть</button>'}</div>
  </div></div>`;
}

/* ---------- admin (FR-1) ---------- */
function renderAdminEdit(){
  const d = UI.adminEdit, e = d.err || {};
  const o = d.kind === 'space' ? space(d.id) : proj(d.id);
  const people = `<option value="">Выберите…</option>${S.people.map(x => `<option value="${x.id}" ${x.id===d.lead?'selected':''}>${esc(x.name)}</option>`).join('')}`;
  return `<div class="ovl top"><div class="mdl w-sm"><div class="mh"><h2>${d.kind === 'space' ? 'Пространство' : 'Проект'}: ${esc(o.name)}</h2>${fr(1)}<button class="btn btn-n btn-i btn-sm" data-a="admin-edit-close" title="Закрыть">${icon('x',14)}</button></div>
    <div class="mb"><div class="frow"><label class="lbl2">Название<span class="req">*</span></label><input class="inp w100 ${e.name?'err':''}" id="aeName" value="${esc(d.name)}">${e.name?`<div class="errt">${e.name}</div>`:''}</div>
      <div class="frow"><label class="lbl2">${d.kind === 'space' ? 'Руководитель пространства' : 'Руководитель проекта'}<span class="req">*</span></label><select class="sel w100" id="aeLead">${people}</select>
        <div class="hint">${d.kind === 'space' ? 'Выберите из пользователей портала.' : 'Выберите из пользователей портала. Прежний руководитель останется в составе проекта участником.'}</div></div></div>
    <div class="mf"><span class="grow"></span><button class="btn btn-n" data-a="admin-edit-close">Отмена</button><button class="btn btn-p" data-a="admin-edit-save">Сохранить</button></div></div></div>`;
}
function archiveItem(kind, id){
  if (kind === 'project') {
    const p = proj(id);
    S.arch.push({id:'a' + Date.now(), kind, at:nowIso(), data:{project:p, types:S.types.filter(t => t.projectId === id), requests:S.requests.filter(r => r.projectId === id)}});
    S.projects = S.projects.filter(x => x.id !== id); S.types = S.types.filter(t => t.projectId !== id); S.requests = S.requests.filter(r => r.projectId !== id);
    return p.name;
  }
  const s = space(id), pids = S.projects.filter(p => p.spaceId === id).map(p => p.id);
  S.arch.push({id:'a' + Date.now(), kind, at:nowIso(), data:{space:s, projects:S.projects.filter(p => pids.includes(p.id)), types:S.types.filter(t => pids.includes(t.projectId)), requests:S.requests.filter(r => pids.includes(r.projectId)), fields:S.fields.filter(f => f.spaceId === id)}});
  S.spaces = S.spaces.filter(x => x.id !== id); S.projects = S.projects.filter(p => !pids.includes(p.id)); S.types = S.types.filter(t => !pids.includes(t.projectId));
  S.requests = S.requests.filter(r => !pids.includes(r.projectId)); S.fields = S.fields.filter(f => f.spaceId !== id);
  return s.name;
}
function restoreItem(aid){
  const a = S.arch.find(x => x.id === aid); if (!a) return;
  if (a.kind === 'project' && !space(a.data.project.spaceId)) return;
  if (a.kind === 'space') { if (!a.data.space.statuses) a.data.space.statuses = defaultRequestStatuses(); S.spaces.push(a.data.space); S.projects.push(...a.data.projects); S.fields.push(...a.data.fields); }
  else S.projects.push(a.data.project);
  S.types.push(...a.data.types); S.requests.push(...a.data.requests);
  S.arch = S.arch.filter(x => x.id !== aid);
  toast(`${a.kind === 'space' ? 'Пространство' : 'Проект'} «${(a.data.space || a.data.project).name}» восстановлен${a.kind === 'space' ? 'о' : ''}`);
}
function renderAdminNew(){
  const n = UI.adminNew, e = UI.adminErr || {}, v = n.v || {};
  const allowedSpaces=S.spaces.filter(s=>canCreateProject(me(),s.id));
  const people = sel => `<option value="">Выберите…</option>${S.people.map(x => `<option value="${x.id}" ${x.id===sel?'selected':''}>${esc(x.name)}</option>`).join('')}`;
  const body = n.kind === 'space'
    ? `<div class="frow"><label class="lbl2">Название<span class="req">*</span></label><input class="inp w100 ${e.sName?'err':''}" id="asName" placeholder="Например, «Финансы»" value="${esc(v.name||'')}">${e.sName?`<div class="errt">${e.sName}</div>`:''}</div>
       <div class="frow"><label class="lbl2">Руководитель пространства<span class="req">*</span></label><select class="sel w100 ${e.sLead?'err':''}" id="asLead">${people(v.lead)}</select>${e.sLead?`<div class="errt">${e.sLead}</div>`:''}</div>
       <div class="hint ph">В заявочном пространстве можно создавать только заявочные проекты.</div>`
    : `<div class="frow"><label class="lbl2">Пространство<span class="req">*</span></label><select class="sel w100" id="apSpace" data-c="ap-space">${allowedSpaces.map(s => `<option value="${s.id}" ${s.id===(v.sid||n.sid)?'selected':''}>${esc(s.name)}</option>`).join('')}</select><div class="hint">${isAdmin(me())?'В списке все заявочные пространства.':'В списке только пространства, которыми вы руководите.'}</div></div>
       <div class="frow"><label class="lbl2">Название проекта<span class="req">*</span></label><input class="inp w100 ${e.pName?'err':''}" id="apName" placeholder="Например, «Справки и выписки»" value="${esc(v.name||'')}">${e.pName?`<div class="errt">${e.pName}</div>`:''}</div>
       <div class="frow"><label class="lbl2">Руководитель проекта<span class="req">*</span></label><select class="sel w100 ${e.pLead?'err':''}" id="apLead">${people(v.lead)}</select>${e.pLead?`<div class="errt">${e.pLead}</div>`:''}</div>
       <div class="apsec"><div class="apsec-h">${icon('tag',14)}Первый тип заявки</div>
         <div class="hint" style="margin:0 0 10px">Создайте как минимум один тип. Дополнительные типы можно добавить здесь кнопкой «+ Добавить тип». Обязательность полей и исполнителей по умолчанию можно настроить после создания проекта ${fr(13,24)}</div>
         <div class="frow"><label class="lbl2">Название типа<span class="req">*</span></label><input class="inp w100 ${e.pType?'err':''}" id="apType" placeholder="Например, «Справка с места работы»" value="${esc(v.type||'')}">${e.pType?`<div class="errt">${e.pType}</div>`:''}</div>
         <div class="frow" style="margin-bottom:0"><label class="lbl2">Поля формы</label>
           <div class="apf">${S.fields.filter(f => f.spaceId === (v.sid||n.sid||S.spaces[0].id) && !f.hidden).map(f => `<label class="apf-i"><input type="checkbox" data-apf value="${f.id}" ${(v.fields||[]).includes(f.id)?'checked':''}><span>${esc(f.name)}</span><span class="muted">${KIND_LABEL[f.kind]}</span></label>`).join('') || '<div class="muted" style="padding:8px">В пространстве пока нет полей</div>'}</div>
           <div class="hint">Название и описание есть у каждой заявки. Поля можно не выбирать.</div></div></div>
       ${(v.extraTypes||[]).map((t,i) => `<div class="apsec"><div class="apsec-h">Тип заявки ${i+2}<button class="btn btn-g btn-sm" data-a="ap-type-remove" data-i="${i}" aria-label="Убрать тип ${i+2}">Убрать</button></div>
         <div class="frow"><label class="lbl2">Название типа<span class="req">*</span></label><input class="inp w100 ${e['pType'+i]?'err':''}" data-ap-extra-name="${i}" aria-label="Название типа ${i+2}" value="${esc(t.name)}">${e['pType'+i]?`<div class="errt">${e['pType'+i]}</div>`:''}</div>
         <div class="frow"><label class="lbl2">Поля формы</label><div class="apf">${S.fields.filter(f=>f.spaceId===(v.sid||n.sid||S.spaces[0].id)&&!f.hidden).map(f=>`<label class="apf-i"><input type="checkbox" data-ap-extra-field="${i}" value="${f.id}" ${(t.fields||[]).includes(f.id)?'checked':''}><span>${esc(f.name)}</span><span class="muted">${KIND_LABEL[f.kind]}</span></label>`).join('')||'<span class="muted">В пространстве пока нет полей</span>'}</div></div></div>`).join('')}
       <button class="btn btn-n" data-a="ap-type-add">+ Добавить тип</button>`;
  return `<div class="ovl top"><div class="mdl w-sm"><div class="mh"><h2>${n.kind === 'space' ? 'Новое заявочное пространство' : 'Новый заявочный проект'}</h2>${fr(1)}<button class="btn btn-n btn-i btn-sm" data-a="admin-new-close" title="Закрыть">${icon('x',14)}</button></div>
    <div class="mb">${body}</div><div class="mf"><span class="grow"></span><button class="btn btn-n" data-a="admin-new-close">Отмена</button><button class="btn btn-p" data-a="admin-${n.kind}">Создать</button></div></div></div>`;
}

/* ---------- ordinary tracker stubs (FR-5) ---------- */
/* «Мои задачи»: a request is an ordinary task of its project; the executor sees it here only with the «Показывать заявки» filter */
function renderTasks(q){
  const u = me(), show = q.requests === '1';
  const reqs = !show ? [] : listFor(u, 'executor').sort((a, b) => isDone(a) - isDone(b));
  const last = r => r.history.length ? r.history[r.history.length - 1].at : r.createdAt;
  const reqRows = reqs.map(x => `<tr class="rw" data-a="card" data-id="${x.id}"><td class="tt"><span class="ttx">${esc(x.title)}</span></td><td><span class="muted">—</span></td><td>${stPill(x)}</td>
    <td>${esc(pname(x.requesterId))}</td><td>${x.executorIds.map(pname).map(esc).join(', ')}</td><td class="tab-num">${fmtDT(last(x))}</td></tr>`).join('');
  const taskRows = ORDINARY_TASKS.map(t => `<tr class="stub-row"><td class="tt"><span class="ttx">${esc(t.t)}</span></td><td><span class="pill ${t.p==='Средний'?'p-yel':'p-red'}">${t.p}</span></td><td><span class="pill ${t.st==='Ждёт проверки'?'p-yel':'st-open'}">${t.st}</span></td><td>${esc(t.o)}</td><td>${esc(t.a)}</td><td class="tab-num">${t.d}</td></tr>`).join('');
  return `${trCrumbs(['Мои задачи',''])}<div class="panel"><div class="phead"><h1>Мои задачи</h1><div class="grow"></div><button class="btn btn-p">${icon('plus',14)}Задача</button></div><div class="pbody">
    <div class="toolbar"><span class="btn btn-o btn-sm">Вручную</span><span class="btn btn-o btn-sm">Статусы: 3</span><span class="btn btn-o btn-sm">Мой статус: 3</span>
      <label class="chk"><input type="checkbox" data-c="tasks-requests" ${show?'checked':''}>Показывать заявки</label>
      <span class="note info ph" style="padding:3px 8px">Заявки разбирают в проекте пространства. Здесь заявки, где вы исполнитель, видны только с фильтром «Показывать заявки». Меняет FR-5</span></div>
    <table class="tbl"><thead><tr><th>Название</th><th>Приоритет</th><th>Статус</th><th>Постановщик</th><th>Ответственный</th><th>Последняя активность</th></tr></thead><tbody>${reqRows}${taskRows}</tbody></table>
    <div class="pad muted">Строка «+ Добавить задачу» работает как сейчас: это обычные проекты ${fr(11)}</div></div></div>`;
}
function renderStub(sec){
  const names = {tasks:'Мои задачи', projects:'Проекты', spaces:'Все пространства', activity:'Активность', stats:'Статистика', checklists:'Чек-листы', notes:'Заметки', mindmaps:'Mind Maps', settings:'Настройки трекера'};
  return `${trCrumbs([names[sec]||sec,''])}<div class="panel"><div class="phead"><h1>${names[sec]||sec}</h1></div><div class="pbody"><div class="empty"><div class="eic">${icon('layers',24)}</div><h4>${names[sec]}</h4><p>Экран трекера без изменений</p></div></div></div>`;
}
