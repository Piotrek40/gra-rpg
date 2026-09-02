// Symulator: uruchamia logikę gry z index.html bez przeglądarki,
// gra losowo tysiące wypraw i wykrywa błędy oraz zawieszenia.
// Użycie: node tools/sim.js [liczba_wypraw] [ziarno]
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const src = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const js = src.split('<script>')[1].split('</script>')[0];
const N = +(process.argv[2] || 300), SEED = +(process.argv[3] || 1), SMART = process.argv[4] === 'smart';

const timers = []; global.timers = timers;
const stubEl = () => ({ innerHTML: '', style: {}, classList: { add() {}, remove() {} }, appendChild() {}, remove() {}, textContent: '' });
global.setTimeout = (fn) => { timers.push(fn); return timers.length; };
global.requestAnimationFrame = () => 0;
global.document = { addEventListener() {}, querySelector: (sel) => (sel === '#app' || sel === '.screen' ? stubEl() : null), querySelectorAll: () => [], createElement: () => ({ getContext: () => null, style: {}, toDataURL: () => '', remove() {}, classList: { add() {}, remove() {} } }), body: { appendChild() {} }, hidden: false };
global.window = { addEventListener() {}, devicePixelRatio: 1 };
const store = {}; global.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = v; }, removeItem: (k) => { delete store[k]; } };

const harness = `
(function () {
  let rs = ${SEED}; const rnd = () => { rs = (rs * 1103515245 + 12345) & 0x7fffffff; return rs / 0x7fffffff; };
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  RNG.state = ${SEED} >>> 0;
  const flush = () => { let n = 0; while (timers.length && n++ < 10000) timers.shift()(); if (n >= 10000) throw new Error('timer loop'); };
  const SMART = ${SMART};
  const stats = { expeditions: 0, deaths: 0, returns: 0, goals: 0, cells: {}, causes: {}, steps: 0, maxDepth: 0, prayers: 0, rests: 0, ambushes: 0, fights: 0, fled: 0, unlockIda: 0, idaInParty: 0 };
  const seen = new Set();
  startNewGame();
  let guard = 0;
  while (stats.deaths + stats.returns < ${N} && guard++ < 2000000) {
    stats.steps++;
    flush();
    if (UI.confirm) { ACTIONS['confirm.yes'](); continue; }
    if (UI.sheet === 'cbitems') { const ids = usableInCombat(S); if (ids.length) ACTIONS['cb.item'](pick(ids)); else ACTIONS['sheet.close'](); continue; }
    if (UI.sheet) { ACTIONS['sheet.close'](); continue; }
    const sc = S.screen;
    if (sc === 'title') { ACTIONS.new(); continue; }
    if (sc === 'create') { ACTIONS.pickArch(pick(Object.keys(ARCHETYPES))); ACTIONS.create(); continue; }
    if (sc === 'city') {
      if (!S.city.contracts) S.city.contracts = genContracts(S.city);
      for (const id of Object.keys(UPGRADES)) if (rnd() < 0.5) ACTIONS['city.buy'](id);
      UI.party = []; for (const id in S.city.companions) if (S.city.companions[id].alive && rnd() < 0.85) ACTIONS['city.comp'](id);
      if (UI.party.includes('ida')) stats.idaInParty++;
      UI.contract = Math.floor(rnd() * S.city.contracts.length);
      ACTIONS['city.go'](); stats.expeditions++; continue;
    }
    if (sc === 'map') {
      const next = nextNodes(S), cur = S.exp.map.nodes[S.exp.cur];
      stats.maxDepth = Math.max(stats.maxDepth, cur.depth);
      if (SMART) {
        const h = S.hero, low = h.hp < h.maxHp * 0.4 && !h.items.wywar;
        if (next.length && !(low && cur.depth > 0 && cur.resolved)) { const rest = next.find((n) => n.kind === 'odpoczynek'); ACTIONS.go(h.hp < h.maxHp * 0.6 && rest ? rest.id : pick(next).id); continue; }
      }
      if (next.length && (cur.depth < 2 || rnd() < 0.8)) { ACTIONS.go(pick(next).id); continue; }
      if (cur.resolved && cur.depth > 0) { if (S.exp.goalReached) stats.goals++; ACTIONS.return(); stats.returns++; continue; }
      if (next.length) { ACTIONS.go(pick(next).id); continue; }
      throw new Error('STUCK map ' + JSON.stringify({ cur, next }));
    }
    if (sc === 'encounter') {
      const enc = S.exp.encounter;
      if (enc.stage === 'open') {
        if (enc.kind === 'wybor') { const key = enc.actorId + '/' + enc.tensionId; stats.cells[key] = (stats.cells[key] || 0) + 1; const opts = choiceOptions(S, enc); if (!opts.length) throw new Error('no options ' + key); let o = pick(opts); if (SMART) { const bad = (x) => /krwi|Odmów|Zabierz|Do broni|Weź sakiewkę|Zabierz wszystko/.test(typeof x.ch.label === 'function' ? x.ch.label(makeCtx(S)) : x.ch.label); const good = opts.filter((x) => !bad(x)); if (good.length) o = pick(good); } seen.add(key + ':' + o.i); ACTIONS.choose(o.i); continue; }
        if (enc.kind === 'walka') { stats.fights++; if (enc.ambush) stats.ambushes++; ACTIONS.fight(); continue; }
        stats.rests++;
        const gods = godsAt(S).filter((g) => !enc.prayed[g.id]);
        if (SMART) { const g = gods.find((g) => S.city.favor[g.id] >= 0); if (g && rnd() < 0.5) { ACTIONS['rest.pray'](g.id); stats.prayers++; continue; } if (S.hero.items.sol) ACTIONS['rest.sleep']('sol'); else if (S.hero.items.pochodnia) ACTIONS['rest.sleep']('pochodnia'); else if (phaseOf(S.exp.step).night) ACTIONS['rest.watch'](); else ACTIONS['rest.sleep'](''); continue; }
        if (gods.length && rnd() < 0.5) { ACTIONS['rest.pray'](pick(gods).id); stats.prayers++; continue; }
        const r = rnd(); if (r < 0.3 && S.hero.items.sol) ACTIONS['rest.sleep']('sol'); else if (r < 0.55 && S.hero.items.pochodnia) ACTIONS['rest.sleep']('pochodnia'); else if (r < 0.8) ACTIONS['rest.sleep'](''); else ACTIONS['rest.watch']();
        continue;
      }
      if (enc.combat) { ACTIONS['enc.fight'](); continue; }
      ACTIONS['enc.next'](); continue;
    }
    if (sc === 'combat') {
      const cb = S.combat;
      if (cb.phase === 'done') { if (cb.how === 'death') { flush(); continue; } if (cb.how === 'fled') stats.fled++; ACTIONS['cb.done'](); continue; }
      if (cb.phase !== 'player') throw new Error('STALL ' + JSON.stringify({ combat: cb, party: S.exp.party, step: S.exp.step, enc: S.exp.encounter }));
      if (cb.pending) { const ts = cbApi(S).enemies; ACTIONS['cb.target'](pick(ts).uid); continue; }
      const u = findUnit(S, cb.turn), ab = abilityOf(u), r = rnd();
      if (SMART) {
        const en = cbApi(S).enemies, hero = S.hero, top = en.find((e) => e.kind === 'topielec'), og = en.find((e) => e.kind === 'ognik');
        const hpSum = cbApi(S).party.reduce((a, x) => a + x.hp, 0), enSum = en.reduce((a, x) => a + x.hp, 0);
        if (u.id === 'hero' && hero.hp < hero.maxHp * 0.4 && hero.items.wywar) { ACTIONS['cb.item']('wywar'); continue; }
        if (u.id === 'hero' && hero.items.sol && en.filter((e) => e.kind === 'topielec').length >= 2) { ACTIONS['cb.item']('sol'); continue; }
        if (u.id === 'hero' && hero.items.pochodnia && (top || (og && !og.status.odsloniety))) { ACTIONS['cb.item']('pochodnia'); if (S.combat && S.combat.pending) ACTIONS['cb.target']((top || og).uid); continue; }
        if (u.mp >= ab.mp && (top || (u.archId === 'adept'))) { ACTIONS['cb.act']('zdolnosc'); if (S.combat && S.combat.pending) ACTIONS['cb.target']((top || og).uid); continue; }
        if (u.id === 'hero' && hero.hp < hero.maxHp * 0.3 && enSum > hpSum) { ACTIONS['cb.act']('ucieczka'); continue; }
        ACTIONS['cb.act']('atak'); if (S.combat && S.combat.pending) { const t = (og && og.status.odsloniety ? og : top || og); ACTIONS['cb.target'](t.uid); } continue;
      }
      if (r < 0.5) ACTIONS['cb.act']('atak'); else if (r < 0.75 && u.mp >= ab.mp) ACTIONS['cb.act']('zdolnosc'); else if (r < 0.9 && usableInCombat(S).length) ACTIONS['cb.items'](); else if (r < 0.95) ACTIONS['cb.act']('ucieczka'); else ACTIONS['cb.act']('atak');
      continue;
    }
    if (sc === 'reckoning') { const e = S.reck.entries[S.reck.i]; if (e.choice) ACTIONS['reck.choice'](Math.floor(rnd() * e.choice.length)); else ACTIONS['reck.next'](); continue; }
    if (sc === 'death') { stats.deaths++; stats.deathsByDepth = stats.deathsByDepth || {}; const dd = S.death.depth; stats.deathsByDepth[dd] = (stats.deathsByDepth[dd] || 0) + 1; const e = S.death.entry; stats.causes[e.cause] = (stats.causes[e.cause] || 0) + 1; if (S.city.companions.ida) stats.unlockIda = 1; stats.idaScars = S.city.companions.ida ? S.city.companions.ida.scars : 0; ACTIONS['death.next'](); continue; }
    throw new Error('unknown screen ' + sc);
  }
  // test zapisu: odczyt i porównanie
  const saved = load(); if (!saved || saved.v !== CFG.version) throw new Error('save broken');
  stats.uniqueChoices = seen.size; stats.city = { day: S.city.day, rep: S.city.rep, favor: S.city.favor, gold: S.city.gold, marks: S.city.marks, knowledge: S.city.knowledge, companions: S.city.companions, chronicle: S.city.chronicle.length, upgrades: S.city.upgrades };
  console.log(JSON.stringify(stats, null, 1));
})();
`;
try { vm.runInThisContext(js + '\n' + harness, { filename: 'index.html#script' }); }
catch (e) { console.error('FAIL', e.stack || e); process.exit(1); }
