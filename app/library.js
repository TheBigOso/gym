// Exercise library and test mode (app/library.js). Runs in the player's module scope, after the player:
// it uses S, EXS, loadExercise, setPlaying, toast, save and $ from src/player.js, and RR_CATALOG / RR_FETCH from the boot script.
{
  const C = RR_CATALOG, N = C.length, TKEY = 'reprig-tests', AKEY = 'reprig-app';
  const STATUS = { pass: 'Pass', fix: 'Needs fix' };
  let T = {};
  try { T = JSON.parse(localStorage.getItem(TKEY) || '{}') || {}; } catch (e) { T = {}; }
  const saveT = () => { try { localStorage.setItem(TKEY, JSON.stringify(T)); } catch (e) { toast('Could not save test results in this browser'); } };
  const statusOf = (i) => (T[C[i].id] && T[C[i].id].status) || '';

  /* ---- filters ---- */
  const count = (vals) => { const m = new Map(); for (const v of vals) m.set(v, (m.get(v) || 0) + 1); return m; };
  const fill = (sel, all, values, order) => {
    const m = count(values), keys = order ? order.filter((k) => m.has(k)) : [...m.keys()].sort((a, b) => a.localeCompare(b));
    $(sel).innerHTML = `<option value="">${all}</option>` + keys.map((k) => `<option value="${esc(k)}">${esc(k)} (${m.get(k)})</option>`).join('');
  };
  fill('fBody', 'All body parts', C.map((c) => c.body), ['Chest', 'Back', 'Shoulders', 'Upper arms', 'Forearms', 'Core', 'Hips and glutes', 'Thighs', 'Calves', 'Neck', 'Full body', 'Other']);
  fill('fMuscle', 'All muscles', C.flatMap((c) => c.targets));
  fill('fEquip', 'All equipment', C.flatMap((c) => c.equip));
  fill('fDiff', 'All levels', C.map((c) => c.difficulty), ['Beginner', 'Intermediate', 'Advanced']);
  fill('fLat', 'Any', C.map((c) => c.lat), ['Bilateral', 'Unilateral', 'Alternating']);
  $('fStatus').innerHTML = [['', 'Any status'], ['untested', 'Untested'], ['tested', 'Tested'], ['pass', 'Pass'], ['fix', 'Needs fix']].map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
  const hay = C.map((c) => [c.name, ...c.aliases, c.id].join(' ').toLowerCase());

  let view = [];
  function applyFilters() {
    const words = $('q').value.toLowerCase().split(/\s+/).filter(Boolean);
    const f = { body: $('fBody').value, mus: $('fMuscle').value, eq: $('fEquip').value, diff: $('fDiff').value, lat: $('fLat').value, st: $('fStatus').value };
    view = [];
    for (let i = 0; i < N; i++) {
      const c = C[i], st = statusOf(i);
      if (words.length && !words.every((w) => hay[i].includes(w))) continue;
      if (f.body && c.body !== f.body) continue;
      if (f.mus && !c.targets.includes(f.mus)) continue;
      if (f.eq && !c.equip.includes(f.eq)) continue;
      if (f.diff && c.difficulty !== f.diff) continue;
      if (f.lat && c.lat !== f.lat) continue;
      if (f.st === 'untested' ? st : f.st === 'tested' ? !st : f.st && st !== f.st) continue;
      view.push(i);
    }
    renderList(); renderCounts(); renderTest();
  }

  /* ---- list and counts ---- */
  function itemHTML(i) {
    const c = C[i], st = statusOf(i);
    return `<li role="option" data-i="${i}" aria-selected="${i === S.ex}" title="${esc(c.name)}"><span class="dot ${st}" aria-label="${st ? STATUS[st] : 'Untested'}"></span><b>${esc(c.name)}</b><small>${esc(c.equip.join(', '))} · ${esc(c.body)} · ${esc(c.difficulty)}</small></li>`;
  }
  function renderList() {
    $('list').innerHTML = view.length ? view.map(itemHTML).join('') : '<li class="empty">No exercises match these filters.</li>';
    scrollToCurrent();
  }
  function refreshItem(i) { const li = $('list').querySelector(`li[data-i="${i}"]`); if (li) li.outerHTML = itemHTML(i); }
  function scrollToCurrent(block = 'nearest') { // scroll the list only, never the page
    const L = $('list'), li = L.querySelector('li[aria-selected=true]'); if (!li) return;
    const top = li.offsetTop - L.offsetTop, h = li.offsetHeight;
    if (block === 'center') L.scrollTop = top - (L.clientHeight - h) / 2;
    else if (top < L.scrollTop) L.scrollTop = top;
    else if (top + h > L.scrollTop + L.clientHeight) L.scrollTop = top + h - L.clientHeight;
  }
  function renderCounts() {
    let pass = 0, fix = 0; for (let i = 0; i < N; i++) { const s = statusOf(i); if (s === 'pass') pass++; else if (s === 'fix') fix++; }
    const tested = pass + fix;
    $('cShown').textContent = view.length === N ? `${N} exercises` : `${view.length} of ${N} shown`;
    $('cTested').textContent = `${tested} tested (${pass} pass, ${fix} need fixes) · ${N - tested} untested`;
    $('barPass').style.width = `${(pass / N) * 100}%`; $('barFix').style.width = `${(fix / N) * 100}%`;
  }

  /* ---- opening exercises (data is fetched on demand) ---- */
  let want = S.ex;
  function open(i, opts = {}) {
    if (i == null || i < 0 || i >= N) return;
    want = i;
    const title = $('title');
    if (!EXS[i]) { title.textContent = C[i].name; title.classList.add('loading'); }
    RR_FETCH(i).then(() => {
      if (want !== i) return; // a newer pick won
      title.classList.remove('loading');
      const prev = S.ex; loadExercise(i);
      refreshItem(prev); refreshItem(i); scrollToCurrent(); renderTest();
      try { localStorage.setItem(AKEY, JSON.stringify({ ex: C[i].id })); history.replaceState(null, '', `#${C[i].id}`); } catch (e) {}
      if (opts.closeDrawer) drawer(false);
      const k = view.indexOf(i); if (k >= 0 && view[k + 1] != null) RR_FETCH(view[k + 1]).catch(() => {}); // warm the next one for keyboard testing
    }).catch((e) => { title.classList.remove('loading'); toast(`Could not load ${C[i].name}`); console.warn(e); });
  }
  function step(d) {
    if (!view.length) return;
    const k = view.indexOf(want);
    open(k < 0 ? view[0] : view[(k + d + view.length) % view.length]);
  }

  /* ---- test card ---- */
  function renderTest() {
    const i = want, r = T[C[i].id] || {}, st = r.status || '';
    $('tStat').textContent = st ? STATUS[st] : 'Untested'; $('tStat').className = `tstat ${st}`;
    $('tPass').setAttribute('aria-pressed', st === 'pass'); $('tFix').setAttribute('aria-pressed', st === 'fix');
    if (document.activeElement !== $('tNote')) $('tNote').value = r.note || '';
    const k = view.indexOf(i);
    $('tPos').textContent = k >= 0 ? `${k + 1} of ${view.length} in this list` : 'not in the filtered list';
  }
  function mark(st) {
    const id = C[want].id, r = T[id] || {};
    if (r.status === st) delete r.status; else r.status = st;
    r.note = $('tNote').value.trim(); r.at = new Date().toISOString();
    if (!r.status && !r.note) delete T[id]; else T[id] = r;
    saveT(); refreshItem(want); renderCounts(); renderTest();
    if (r.status && $('tAuto').checked) {
      if ($('fStatus').value) { const keep = want; applyFilters(); if (!view.includes(keep)) { step(0); return; } }
      setTimeout(() => step(1), 180);
    }
  }
  $('tPass').onclick = () => mark('pass');
  $('tFix').onclick = () => mark('fix');
  $('tClear').onclick = () => { delete T[C[want].id]; saveT(); $('tNote').value = ''; refreshItem(want); renderCounts(); renderTest(); };
  let noteT = 0;
  $('tNote').addEventListener('input', () => {
    clearTimeout(noteT);
    noteT = setTimeout(() => { const id = C[want].id, r = T[id] || {}; r.note = $('tNote').value.trim(); r.at = new Date().toISOString(); if (!r.status && !r.note) delete T[id]; else T[id] = r; saveT(); }, 400);
  });
  $('tPrev').onclick = () => step(-1);
  $('tNext').onclick = () => step(1);

  /* ---- export and import ---- */
  const stamp = () => new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  const csvCell = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  $('expCsv').onclick = () => {
    const rows = [['id', 'name', 'status', 'note', 'tested_at', 'body_part', 'equipment', 'difficulty', 'laterality', 'reference']];
    for (const c of C) { const r = T[c.id] || {}; rows.push([c.id, c.name, r.status ? STATUS[r.status] : 'Untested', r.note || '', r.at || '', c.bodyPart, c.equipment.join('; '), c.difficulty, c.lat, c.ref]); }
    save(`reprig-test-results-${stamp()}.csv`, new Blob([rows.map((r) => r.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv' }));
  };
  $('expJson').onclick = () => {
    const results = {}; for (const c of C) if (T[c.id]) results[c.id] = { name: c.name, ...T[c.id] };
    save(`reprig-test-results-${stamp()}.json`, new Blob([JSON.stringify({ exported: new Date().toISOString(), total: N, tested: Object.values(results).filter((r) => r.status).length, results }, null, 2)], { type: 'application/json' }));
  };
  $('impJson').onclick = () => $('impFile').click();
  $('impFile').onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const j = JSON.parse(await f.text()), res = j.results || j; let n = 0;
      for (const [id, r] of Object.entries(res)) if (C.some((c) => c.id === id) && r && (r.status === 'pass' || r.status === 'fix' || r.note)) { T[id] = { status: r.status || undefined, note: r.note || '', at: r.at || new Date().toISOString() }; n++; }
      saveT(); applyFilters(); toast(`Imported ${n} results`);
    } catch (err) { toast('That file is not a RepRig test export'); }
    e.target.value = '';
  };

  /* ---- drawer (narrow screens), list clicks, filters, keyboard ---- */
  function drawer(on) { $('lib').classList.toggle('open', on); $('libShade').classList.toggle('open', on); if (on) scrollToCurrent(); }
  $('libOpen').onclick = () => drawer(true);
  $('libClose').onclick = () => drawer(false);
  $('libShade').onclick = () => drawer(false);
  $('list').onclick = (e) => { const li = e.target.closest('li[data-i]'); if (li) open(+li.dataset.i, { closeDrawer: true }); };
  let qT = 0;
  $('q').addEventListener('input', () => { clearTimeout(qT); qT = setTimeout(applyFilters, 120); });
  for (const id of ['fBody', 'fMuscle', 'fEquip', 'fDiff', 'fLat', 'fStatus']) $(id).onchange = applyFilters;
  $('fReset').onclick = () => { $('q').value = ''; for (const id of ['fBody', 'fMuscle', 'fEquip', 'fDiff', 'fLat', 'fStatus']) $(id).value = ''; applyFilters(); };
  window.addEventListener('keydown', (e) => {
    if (e.target.closest('input,textarea,select,[contenteditable]') || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === 'j' || e.key === 'ArrowDown') { e.preventDefault(); step(1); }
    else if (k === 'k' || e.key === 'ArrowUp') { e.preventDefault(); step(-1); }
    else if (k === 'p') mark('pass');
    else if (k === 'f') mark('fix');
    else if (k === '/') { e.preventDefault(); drawer(true); $('q').focus(); }
  });

  applyFilters(); scrollToCurrent('center');
  try { history.replaceState(null, '', `#${C[S.ex].id}`); } catch (e) {}
  window.__app = { open, step, mark, get view() { return view.slice(); }, get results() { return JSON.parse(JSON.stringify(T)); }, catalog: C, filter: applyFilters };
}
