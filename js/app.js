window.Truhla = window.Truhla || {};

// Propojení: formulář (táhlo + pole) → generátor dílů → kusovník, nářez, 3D.
(function (T) {
  'use strict';
  const $ = id => document.getElementById(id);
  const M = T.materialy;
  let stav = null;
  let naplanovano = false;
  let popiskyKloubu = ['Otevřít víko', 'Zavřít víko'];
  let posledniNarez = null;                       // pro export objednávky
  const VYCHOZI_PRODUKT = 'lavice-truhla-luby'; // nejsnazší na ruční výrobu

  const produkt = () => T.produkty[stav.produkt];
  // parametry společné všem výrobkům
  const SPOLECNE = [
    { sekce: 'material', klic: 'pocet', nazev: 'Počet kusů', typ: 'cislo', min: 1, max: 20, krok: 1, vychozi: 1, jednotka: 'ks' },
  ];
  const parametry = () => produkt().parametry.concat(SPOLECNE);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function vychoziParametry(p) {
    const v = {};
    SPOLECNE.concat(p.parametry).forEach(d => { v[d.klic] = d.vychozi; });
    return v;
  }
  function novyStav(idProduktu) {
    return { produkt: idProduktu, nazev: 'Nový projekt', params: vychoziParametry(T.produkty[idProduktu]) };
  }
  function nastavStav(s) {
    if (!s || !T.produkty[s.produkt]) s = novyStav(T.produkty[VYCHOZI_PRODUKT] ? VYCHOZI_PRODUKT : Object.keys(T.produkty)[0]);
    const pr = T.produkty[s.produkt];
    if (pr.migruj && s.params) pr.migruj(s.params);
    s.params = Object.assign(vychoziParametry(pr), s.params || {});
    SPOLECNE.concat(pr.parametry).forEach(d => { if (d.typ === 'material') s.params[d.klic] = M.normalizuj(s.params[d.klic]); });
    stav = s;
    $('produkt').value = stav.produkt;
    const pr2 = produkt();
    $('popisProduktu').innerHTML = (pr2.narocnost ? `<span class="narocnost n${pr2.narocnost}">${NAROCNOST[pr2.narocnost]}</span> ` : '') + esc(pr2.podtitul || '');
    $('nazevProjektu').value = stav.nazev || '';
    vykresliFormular();
    prepocitej();
    cenyVariant();
  }

  function toast(text) {
    const t = $('toast');
    t.textContent = text;
    t.hidden = false;
    clearTimeout(toast.casovac);
    toast.casovac = setTimeout(() => { t.hidden = true; }, 2200);
  }

  // ---------- formulář ----------
  // Panel shora: Výrobek → Rozměry → Provedení (výbava, závislá pole odsazená) → Materiál (varianty s cenou,
  // počet kusů) → Podrobné nastavení (každá skupina zvlášť sbalená, počet změn, návrat k výchozím).
  // Formulář se staví jen při změně výrobku; předvolba / načtení projektu jen přepíše hodnoty (synchronizuj).
  function prvek(tag, atributy) {
    const e = document.createElement(tag);
    Object.entries(atributy || {}).forEach(([k, v]) => { e[k] = v; });
    return e;
  }

  const kc = x => Math.round(x).toLocaleString('cs-CZ') + ' Kč';
  const NAROCNOST = { 1: 'snadné', 2: 'střední', 3: 'náročné' };
  const KATEGORIE = [['lavice', 'Lavice s úložným prostorem'], ['dilna', 'Dílna a zahrada']];
  const SJEDNOCENE = { 'Ozuby': 'Spoje', 'Čepy a drážky': 'Spoje', 'Drážky a čepy': 'Spoje' };
  const MAT_PO_DILECH = 'Materiál po dílech';
  const tvarZmen = n => `${n} ${n === 1 ? 'změna' : n < 5 ? 'změny' : 'změn'}`;

  // stav rozbalení skupin podle výrobku – jen v prohlížeči, ne v projektu
  const UI_KLIC = 'truhla.ui.v1';
  let ui = {};
  try { ui = JSON.parse(localStorage.getItem(UI_KLIC)) || {}; } catch (e) { /* bez úložiště */ }
  const ulozUi = () => { try { localStorage.setItem(UI_KLIC, JSON.stringify(ui)); } catch (e) { /* bez úložiště */ } };

  // výběr materiálu: jen desky nebo jen řezivo (podle výchozího materiálu dílu), lamino jen když je zvolené
  const typMat = d => d.typMat || (M.najdi(M.normalizuj(d.vychozi)) || {}).typ || 'oba';
  const LAMINO = /^Lamino/;
  const popisSkupiny = s => {
    const deska = s.typ === 'deska';
    return s.nazev + (s.cenaOd ? ` · od ${kc(s.cenaOd)}/${deska ? 'm²' : 'bm'}` : '');
  };
  function vyberMaterialu(hodnota, typ) {
    const sel = prvek('select');
    const sedi = m => typ === 'oba' || m.typ === typ;
    const skupiny = new Map([
      ['Moje desky', M.vlastni().filter(m => m.typ === 'deska' && sedi(m))],
      ['Moje řezivo', M.vlastni().filter(m => m.typ === 'rezivo' && sedi(m))],
    ]);
    M.skupiny().forEach(s => {
      if (!sedi(s) || (LAMINO.test(s.kategorie) && s.id !== hodnota)) return;
      const k = s.dodavatel + ' – ' + s.kategorie;
      if (!skupiny.has(k)) skupiny.set(k, []);
      skupiny.get(k).push(s);
    });
    skupiny.forEach((list, popis) => {
      if (!list.length) return;
      const og = prvek('optgroup', { label: popis });
      list.forEach(m => og.append(new Option(m.skupina ? popisSkupiny(m) : m.nazev, m.id)));
      sel.append(og);
    });
    return sel;
  }
  function nastavVyber(sel, hodnota) {
    sel.value = hodnota;
    if (sel.value !== hodnota) {
      sel.append(new Option('Materiál už v knihovně není – vyber náhradu', hodnota, true, true));
      sel.value = hodnota;
    }
  }

  function popisek(d, id) {
    const lab = prvek('label', { htmlFor: id, textContent: d.nazev });
    if (d.napoveda) lab.append(' ', prvek('span', { className: 'napoveda', textContent: d.napoveda }));
    return lab;
  }

  // řádek parametru; r._nastav(v) přepíše zobrazenou hodnotu bez překreslení
  function radek(d, sTahlem) {
    const r = prvek('div', { className: 'pole pole-' + d.typ });
    r.dataset.klic = d.klic;
    const id = 'p-' + d.klic;

    if (d.typ === 'prepinac') {
      const cb = prvek('input', { type: 'checkbox', id });
      cb.addEventListener('change', () => nastav(d, cb.checked));
      r.append(cb, popisek(d, id));
      r._nastav = v => { cb.checked = !!v; };
    } else if (d.typ === 'cislo') {
      r.append(popisek(d, id));
      const ovl = prvek('div', { className: 'ovladac' + (sTahlem ? '' : ' bez-tahla') });
      const pole = prvek('input', { type: 'number', id, step: d.krok, min: d.min, max: d.max });
      const jed = prvek('span', { className: 'jednotka', id: id + '-j', textContent: d.jednotka || 'mm' });
      pole.setAttribute('aria-describedby', jed.id);
      let tahlo = null;
      if (sTahlem) {
        tahlo = prvek('input', { type: 'range', min: d.min, max: d.max, step: d.krok, tabIndex: -1 });
        tahlo.setAttribute('aria-hidden', 'true');
        tahlo.addEventListener('input', () => { pole.value = tahlo.value; nastav(d, +tahlo.value); });
        ovl.append(tahlo);
      }
      pole.addEventListener('input', () => {
        const x = pole.valueAsNumber;
        if (!Number.isFinite(x)) return;
        if (tahlo) tahlo.value = x;
        nastav(d, x);
      });
      // po opuštění pole: prázdné vrátit, mimo rozsah zarazit na kraj
      pole.addEventListener('change', () => {
        const x = pole.valueAsNumber;
        if (!Number.isFinite(x)) { r._nastav(stav.params[d.klic]); return; }
        const y = Math.min(d.max, Math.max(d.min, x));
        if (y !== x) { r._nastav(y); nastav(d, y); toast(`${d.nazev}: rozsah ${d.min}–${d.max} ${d.jednotka || 'mm'}`); }
      });
      ovl.append(pole, jed);
      r.append(ovl);
      r._nastav = v => { pole.value = v; if (tahlo) tahlo.value = v; };
    } else {
      r.append(popisek(d, id));
      const sel = d.typ === 'material' ? vyberMaterialu(stav.params[d.klic], typMat(d)) : prvek('select');
      if (d.typ === 'volba') d.moznosti.forEach(([hod, popis]) => sel.append(new Option(popis, hod)));
      sel.id = id;
      sel.addEventListener('change', () => nastav(d, sel.value));
      r.append(sel);
      r._nastav = v => nastavVyber(sel, v);
    }
    r._nastav(stav.params[d.klic]);
    return r;
  }

  // ---------- předvolby (materiálové varianty s cenou) ----------
  const predvolbaParams = m => Object.fromEntries(Object.entries(m.params)
    .map(([k, v]) => [k, typeof v === 'string' ? M.normalizuj(v) : v]));
  const predvolbaSedi = m => Object.entries(predvolbaParams(m)).every(([k, v]) => stav.params[k] === v);

  function vykresliPredvolby(f) {
    const skupiny = produkt().predvolby || [];
    skupiny.forEach((sk, i) => {
      const box = prvek('div', { className: 'predvolby' });
      const tlacitka = prvek('div', { className: 'predvolby-tlacitka', role: 'group' });
      if (skupiny.length > 1) {
        const nadpis = prvek('div', { className: 'predvolby-nadpis', id: 'predvolby-' + i, textContent: sk.skupina });
        tlacitka.setAttribute('aria-labelledby', nadpis.id);
        box.append(nadpis);
      } else tlacitka.setAttribute('aria-label', 'Materiálová varianta');
      sk.moznosti.forEach(m => {
        const b = prvek('button', { type: 'button', className: 'predvolba' });
        b.append(prvek('span', { className: 'predvolba-nazev', textContent: m.nazev }), prvek('span', { className: 'predvolba-cena' }));
        b.addEventListener('click', () => {
          Object.assign(stav.params, predvolbaParams(m));
          synchronizuj();
          prepocitej();
          cenyVariant();
        });
        b._predvolba = m;
        tlacitka.append(b);
      });
      box.append(tlacitka, prvek('p', { className: 'predvolby-popis' }));
      f.append(box);
    });
  }

  // zvýrazní předvolbu, která odpovídá aktuálním parametrům, a vypíše její popis
  function aktualizujPredvolby() {
    document.querySelectorAll('#formular .predvolby').forEach(box => {
      let aktivni = null;
      box.querySelectorAll('.predvolba').forEach(b => {
        const shoda = predvolbaSedi(b._predvolba);
        b.classList.toggle('aktivni', shoda);
        b.setAttribute('aria-pressed', shoda);
        if (shoda && !aktivni) aktivni = b._predvolba;
      });
      box.querySelector('.predvolby-popis').textContent = aktivni ? aktivni.popis : 'Vlastní kombinace – materiál zvolený po dílech.';
    });
  }

  // Cena materiálu pro každou variantu při současných rozměrech – jen po dokončené změně, ne při tažení táhla
  let casovacCen = null;
  function cenyVariant() {
    clearTimeout(casovacCen);
    casovacCen = setTimeout(() => {
      const pocet = Math.max(1, Math.round(stav.params.pocet || 1));
      document.querySelectorAll('#formular .predvolba').forEach(b => {
        let cena = 0;
        try {
          const v = produkt().generuj(Object.assign({}, stav.params, predvolbaParams(b._predvolba)), M);
          const n = T.narez.spocitej(v.dily, M, pocet);
          cena = n.desky.concat(n.rezivo).reduce((a, r) => a + (r.cena || 0), 0);
        } catch (e) { /* cena se nezobrazí */ }
        b.querySelector('.predvolba-cena').textContent = cena ? kc(cena) : '';
      });
    }, 250);
  }

  // rozřazení parametrů do sekcí; parametr může sekci (rozmery/provedeni/material/detail) určit sám,
  // jinak: materiály a pokročilé do podrobností, čísla ze skupiny Rozměry nahoru, ostatní do provedení
  function rozrad() {
    let sk = 'Ostatní';
    return parametry().map(d => {
      if (d.skupina) sk = d.skupina;
      let sekce = d.sekce;
      if (!sekce) sekce = d.typ === 'material' || d.pokrocile ? 'detail' : d.typ === 'cislo' && sk === 'Rozměry' ? 'rozmery' : 'provedeni';
      const skupina = d.typ === 'material' ? MAT_PO_DILECH : SJEDNOCENE[sk] || sk;
      return { d, sekce, skupina };
    });
  }

  // výchozí hodnoty pro porovnání „změněno“: výchozí parametry + aktivní materiálové varianty
  function zaklad() {
    const z = vychoziParametry(produkt());
    parametry().forEach(d => { if (d.typ === 'material') z[d.klic] = M.normalizuj(z[d.klic]); });
    (produkt().predvolby || []).forEach(sk => {
      const m = sk.moznosti.find(predvolbaSedi);
      if (m) Object.assign(z, predvolbaParams(m));
    });
    return z;
  }

  function vykresliFormular() {
    const f = $('formular');
    f.innerHTML = '';
    const roz = rozrad();
    const sekce = (nazev, trida) => {
      const fs = prvek('fieldset', { className: 'sekce ' + (trida || '') });
      fs.append(prvek('legend', { textContent: nazev }));
      f.append(fs);
      return fs;
    };
    const v = s => roz.filter(x => x.sekce === s);
    if (v('rozmery').length) { const fs = sekce('Rozměry'); v('rozmery').forEach(x => fs.append(radek(x.d, true))); }
    if (v('provedeni').length) {
      const fs = sekce('Provedení');
      v('provedeni').forEach(x => { const r = radek(x.d, true); if (x.d.kdyz) r.classList.add('zavisle'); fs.append(r); });
    }
    const fsM = sekce('Materiál', 'sekce-material');
    vykresliPredvolby(fsM);
    v('material').forEach(x => fsM.append(radek(x.d, false)));

    const skupiny = new Map();
    v('detail').forEach(x => {
      if (!skupiny.has(x.skupina)) skupiny.set(x.skupina, []);
      skupiny.get(x.skupina).push(x.d);
    });
    const nazvy = [...skupiny.keys()].sort((a, b) => (b === MAT_PO_DILECH) - (a === MAT_PO_DILECH));
    if (nazvy.length) {
      f.append(prvek('h2', { className: 'podrobne-nadpis', textContent: 'Podrobné nastavení' }));
      const otevrene = (ui[stav.produkt] || {}).otevrene || [];
      nazvy.forEach(nazev => {
        const det = prvek('details', { className: 'skupina', open: otevrene.includes(nazev) });
        det.dataset.skupina = nazev;
        const sum = prvek('summary');
        sum.append(prvek('span', { className: 'skupina-nazev', textContent: nazev }), prvek('span', { className: 'skupina-zmeny' }));
        const telo = prvek('div', { className: 'skupina-telo' });
        skupiny.get(nazev).forEach(d => telo.append(radek(d, false)));
        const zpet = prvek('button', { type: 'button', className: 'maly skupina-zpet', textContent: 'Vrátit výchozí hodnoty' });
        zpet.addEventListener('click', () => {
          const z = zaklad();
          skupiny.get(nazev).forEach(d => { stav.params[d.klic] = z[d.klic]; });
          synchronizuj();
          prepocitej();
          cenyVariant();
        });
        telo.append(zpet);
        det.append(sum, telo);
        det.addEventListener('toggle', () => {
          ui[stav.produkt] = { otevrene: [...f.querySelectorAll('details.skupina[open]')].map(x => x.dataset.skupina) };
          ulozUi();
        });
        f.append(det);
      });
    }
    aktualizujViditelnost();
    aktualizujPredvolby();
  }

  // přepíše hodnoty ve formuláři podle stavu (po předvolbě, návratu k výchozím)
  function synchronizuj() {
    document.querySelectorAll('#formular .pole').forEach(r => r._nastav(stav.params[r.dataset.klic]));
    aktualizujViditelnost();
    aktualizujPredvolby();
  }

  function aktualizujViditelnost() {
    for (const d of parametry()) {
      const r = document.querySelector(`#formular .pole[data-klic="${d.klic}"]`);
      if (r) r.hidden = d.kdyz ? !d.kdyz(stav.params) : false;
    }
    // sekce / skupina, ve které je všechno skryté, se nezobrazí
    document.querySelectorAll('#formular fieldset.sekce:not(.sekce-material), #formular details.skupina').forEach(fs => {
      fs.hidden = ![...fs.querySelectorAll('.pole')].some(r => !r.hidden);
    });
  }

  // tečka u změněné hodnoty a počet změn v hlavičce skupiny
  function aktualizujZmeny() {
    const z = zaklad();
    document.querySelectorAll('#formular .pole').forEach(r => {
      const zmena = !r.hidden && stav.params[r.dataset.klic] !== z[r.dataset.klic];
      r.classList.toggle('zmeneno', zmena);
      r.title = zmena ? `Změněno, výchozí: ${z[r.dataset.klic] === true ? 'ano' : z[r.dataset.klic] === false ? 'ne' : (M.najdi(z[r.dataset.klic]) || {}).nazev || z[r.dataset.klic]}` : '';
    });
    document.querySelectorAll('#formular details.skupina').forEach(det => {
      const n = det.querySelectorAll('.pole.zmeneno').length;
      det.querySelector('.skupina-zmeny').textContent = n ? tvarZmen(n) : '';
      det.querySelector('.skupina-zpet').hidden = !n;
    });
  }

  function nastav(d, hodnota) {
    stav.params[d.klic] = hodnota;
    if (d.typ !== 'cislo') aktualizujViditelnost();
    naplanuj();
  }

  function naplanuj() {
    if (naplanovano) return;
    naplanovano = true;
    requestAnimationFrame(() => { naplanovano = false; prepocitej(); });
  }

  // ---------- výpočet ----------
  function prepocitej() {
    let v;
    try {
      v = produkt().generuj(stav.params, M);
    } catch (e) {
      console.error(e);
      $('varovani').innerHTML = `<div class="chyba">Chyba výpočtu: ${esc(e.message)}</div>`;
      return;
    }
    const pocet = Math.max(1, Math.round(stav.params.pocet || 1));
    const narez = T.narez.spocitej(v.dily, M, pocet);
    posledniNarez = narez;
    T.kusovnik.vykresli($('tab-kusovnik'), v.dily, M, pocet);
    T.narez.vykresli($('tab-spotreba'), narez);
    T.cepy.vykresli($('tab-cepy'), v.vykresy, pocet);
    vykresliSouhrn(v, narez, pocet);
    aktualizujPredvolby();
    aktualizujZmeny();
    $('varovani').innerHTML = v.varovani.map(t => `<div class="upozorneni">${esc(t)}</div>`).join('')
      + narez.chyby.map(t => `<div class="chyba">${esc(t)}</div>`).join('');
    $('rozmery').textContent = v.souhrn;
    // tlačítko kloubu: víko na pantech, nebo skládání (výrobek si dá vlastní popisky)
    popiskyKloubu = v.kloub || ['Otevřít víko', 'Zavřít víko'];
    $('btnViko').hidden = !v.dily.some(d => d.skupina === 'viko' || d.boxy.some(b => b.pant));
    $('btnViko').textContent = popiskyKloubu[T.viewer.kloubOtevren() ? 1 : 0];
    T.viewer.update({ dily: v.dily, M, klic: stav.produkt });
    T.ulozeni.ulozAktualni(stav);
  }

  // ---------- souhrn: cena a náročnost ----------
  function vykresliSouhrn(v, narez, pocet) {
    const radky = narez.desky.concat(narez.rezivo);
    const cena = radky.reduce((a, r) => a + (r.cena || 0), 0);
    const bezCeny = radky.some(r => r.cena === null);
    const vyk = v.vykresy || [];
    const soucet = f => vyk.reduce((a, x) => a + f(x) * x.ks, 0) * pocet;
    const vyrezu = soucet(x => x.vyrezu), dlabu = soucet(x => x.dlabu), drazek = soucet(x => (x.drazky || []).length);
    const sikmych = soucet(x => x.sikmych || 0);
    const dilu = v.dily.reduce((a, d) => a + d.pocet, 0) * pocet;
    // hrubé body práce na spojích: dlab ručně ≈ 4 výřezy, drážka ≈ 3
    const body = vyrezu + 4 * dlabu + 3 * drazek + sikmych;
    const [narocnost, trida] = body < 60 ? ['snadné', 'snadne'] : body < 150 ? ['střední', 'stredni'] : ['náročné', 'narocne'];
    const kus = (hodnota, popis, cls = '') => `<div class="souhrn-kus ${cls}"><strong>${hodnota}</strong><span>${popis}</span></div>`;
    let h = kus(cena ? kc(cena) : '—', 'materiál bez DPH' + (bezCeny ? ' (bez položek bez ceny)' : ''))
      + kus(`${dilu} ks`, 'dílů')
      + kus([vyrezu && `${vyrezu} výřezů`, dlabu && `${dlabu} dlabů`, drazek && `${drazek} drážek`, sikmych && `${sikmych} šikmých řezů`].filter(Boolean).join(' · ') || 'bez spojů', 'práce na spojích')
      + kus(narocnost, 'náročnost ruční výroby', trida);
    const tip = dlabu > 20 && produkt().tipNarocnost;
    $('souhrnVyroby').innerHTML = h + (tip ? `<p class="souhrn-tip">${esc(tip)}</p>` : '');
  }

  // ---------- knihovna materiálů ----------
  function vykresliKnihovnu() {
    const n = M.nastaveni();
    const pole = (klic, popis, hod, jednotka) =>
      `<label class="nast">${popis}<span><input type="number" min="0" step="1" data-nast="${klic}" value="${hod}"> ${jednotka}</span></label>`;
    let h = '<h3>Nastavení výpočtu</h3><div class="nastaveni">'
      + pole('prorez', 'Prořez pily', n.prorez, 'mm')
      + pole('pridavekDelka', 'Přídavek na délku (řezivo)', n.pridavekDelka, 'mm')
      + pole('pridavekSirka', 'Přídavek na šířku panelu (řezivo)', n.pridavekSirka, 'mm')
      + '</div>';

    const vstup = (m, k, typ = 'number') =>
      `<input type="${typ}" data-id="${esc(m.id)}" data-k="${k}" value="${esc(m[k])}"${typ === 'number' ? ' min="0"' : ''}>`;

    h += '<h3>Vlastní desky</h3><div class="posuv"><table class="tabulka knihovna"><thead><tr><th>Název</th><th>Tl.</th><th>Formát D</th><th>Formát Š</th><th>Ořez</th><th>Vlákno</th><th>Barva</th><th></th></tr></thead><tbody>';
    M.vlastni().filter(m => m.typ === 'deska').forEach(m => {
      h += `<tr><td>${vstup(m, 'nazev', 'text')}</td><td>${vstup(m, 'tloustka')}</td><td>${vstup(m, 'formatD')}</td><td>${vstup(m, 'formatS')}</td><td>${vstup(m, 'orez')}</td>`
        + `<td class="c"><input type="checkbox" data-id="${esc(m.id)}" data-k="vlakno"${m.vlakno ? ' checked' : ''}></td><td>${vstup(m, 'barva', 'color')}</td>`
        + `<td><button class="maly" data-smazat="${esc(m.id)}" title="Smazat">✕</button></td></tr>`;
    });
    h += '</tbody></table></div><button id="pridatDesku">+ Přidat desku</button>';

    h += '<h3>Vlastní řezivo</h3><div class="posuv"><table class="tabulka knihovna"><thead><tr><th>Název</th><th>Tl.</th><th>Šířka</th><th>Délka</th><th>Barva</th><th></th></tr></thead><tbody>';
    M.vlastni().filter(m => m.typ === 'rezivo').forEach(m => {
      h += `<tr><td>${vstup(m, 'nazev', 'text')}</td><td>${vstup(m, 'tloustka')}</td><td>${vstup(m, 'sirka')}</td><td>${vstup(m, 'delka')}</td><td>${vstup(m, 'barva', 'color')}</td>`
        + `<td><button class="maly" data-smazat="${esc(m.id)}" title="Smazat">✕</button></td></tr>`;
    });
    h += '</tbody></table></div><button id="pridatRezivo">+ Přidat řezivo</button>'
      + '<p><button id="obnovitMaterialy">Obnovit výchozí materiály</button></p>';

    const kategorie = [...new Set(M.katalog().map(m => m.kategorie))];
    if (kategorie.length) {
      h += `<h3>Katalog Démos trade</h3><p class="pozn">${M.katalog().length} položek z demos-trade.cz, staženo ${esc(M.katalogStazeno() || '?')}. `
        + 'Ceny jsou orientační, v Kč bez DPH za kus. Katalogové položky nabízí výběr materiálu u každého dílu; '
        + 'pokud chceš u některé změnit ořez, barvu apod., zkopíruj ji do vlastních.</p>'
        + '<div class="filtr-katalogu">'
        + `<input type="search" id="katalogHledat" placeholder="Hledat (např. buk 18, OSB, bílá)…" aria-label="Hledat v katalogu" value="${esc(filtrKatalogu.text)}">`
        + '<select id="katalogKategorie" aria-label="Kategorie"><option value="">Všechny kategorie</option>'
        + kategorie.map(k => `<option${k === filtrKatalogu.kategorie ? ' selected' : ''}>${esc(k)}</option>`).join('') + '</select>'
        + `<label><input type="checkbox" id="katalogSkladem"${filtrKatalogu.skladem ? ' checked' : ''}> jen skladem</label>`
        + '</div><div class="posuv"><table class="tabulka"><thead><tr><th>Název</th><th>Rozměr</th><th class="c">Cena bez DPH</th><th>Dostupnost</th><th>Kód</th><th></th></tr></thead>'
        + '<tbody id="katalogRadky"></tbody></table></div><p class="pozn" id="katalogPocet"></p>';
    }

    const el = $('tab-knihovna');
    el.innerHTML = h;
    if (kategorie.length) vykresliKatalog();
  }

  const filtrKatalogu = { text: '', kategorie: '', skladem: false };
  const MAX_RADKU_KATALOGU = 200;

  function vykresliKatalog() {
    const slova = filtrKatalogu.text.toLowerCase().split(/\s+/).filter(Boolean);
    const vyhovuje = M.katalog().filter(m =>
      (!filtrKatalogu.kategorie || m.kategorie === filtrKatalogu.kategorie)
      && (!filtrKatalogu.skladem || m.dostupnost === 'skladem')
      && slova.every(w => (m.nazev + ' ' + m.puvodniNazev + ' ' + m.kod).toLowerCase().includes(w)));
    $('katalogRadky').innerHTML = vyhovuje.slice(0, MAX_RADKU_KATALOGU).map(m => {
      const rozmer = m.typ === 'deska' ? `${m.formatD} × ${m.formatS} × ${m.tloustka}` : `${m.tloustka} × ${m.sirka} × ${m.delka}`;
      return `<tr><td><span class="vzorek" style="background:${esc(m.barva)}"></span>${esc(m.nazev)}</td><td>${rozmer}</td>`
        + `<td class="c">${m.cena ? kc(m.cena) : '—'}</td><td>${esc(m.dostupnost)}</td>`
        + `<td><a href="${esc(m.url)}" target="_blank" rel="noopener">${esc(m.kod)}</a></td>`
        + `<td><button class="maly" data-kopirovat="${esc(m.id)}" title="Zkopírovat do vlastních materiálů">Kopírovat</button></td></tr>`;
    }).join('');
    $('katalogPocet').textContent = vyhovuje.length > MAX_RADKU_KATALOGU
      ? `Zobrazeno prvních ${MAX_RADKU_KATALOGU} z ${vyhovuje.length} – zpřesni hledání.`
      : `${vyhovuje.length} položek.`;
  }

  function poZmeneMaterialu() {
    vykresliFormular();
    prepocitej();
    cenyVariant();
  }

  function navazKnihovnu() {
    const el = $('tab-knihovna');
    el.addEventListener('input', e => {
      if (e.target.id === 'katalogHledat') { filtrKatalogu.text = e.target.value; vykresliKatalog(); }
    });
    el.addEventListener('change', e => {
      const t = e.target;
      if (t.id === 'katalogHledat') return;
      if (t.id === 'katalogKategorie' || t.id === 'katalogSkladem') {
        filtrKatalogu.kategorie = $('katalogKategorie').value;
        filtrKatalogu.skladem = $('katalogSkladem').checked;
        vykresliKatalog();
      } else if (t.dataset.nast) {
        M.nastav(t.dataset.nast, Math.max(0, t.valueAsNumber || 0));
        prepocitej();
      } else if (t.dataset.id) {
        const k = t.dataset.k;
        const hod = t.type === 'checkbox' ? t.checked : t.type === 'number' ? Math.max(0, t.valueAsNumber || 0) : t.value;
        M.zmen(t.dataset.id, { [k]: hod });
        poZmeneMaterialu();
      }
    });
    el.addEventListener('click', e => {
      const t = e.target;
      if (t.dataset.kopirovat) {
        const m = M.zkopiruj(t.dataset.kopirovat);
        if (m) { vykresliKnihovnu(); poZmeneMaterialu(); toast(`Zkopírováno do vlastních: ${m.nazev}`); }
      } else if (t.dataset.smazat) {
        const m = M.najdi(t.dataset.smazat);
        if (m && confirm(`Smazat materiál „${m.nazev}“?`)) { M.odeber(m.id); vykresliKnihovnu(); poZmeneMaterialu(); }
      } else if (t.id === 'pridatDesku') {
        M.pridej({ typ: 'deska', nazev: 'Nová deska', tloustka: 18, formatD: 2800, formatS: 2070, vlakno: true, orez: 10, barva: '#d9c2a0' });
        vykresliKnihovnu(); poZmeneMaterialu();
      } else if (t.id === 'pridatRezivo') {
        M.pridej({ typ: 'rezivo', nazev: 'Nové řezivo', tloustka: 24, sirka: 100, delka: 4000, barva: '#e0bf8c' });
        vykresliKnihovnu(); poZmeneMaterialu();
      } else if (t.id === 'obnovitMaterialy') {
        if (confirm('Obnovit výchozí knihovnu materiálů? Vlastní úpravy se ztratí.')) { M.obnovVychozi(); vykresliKnihovnu(); poZmeneMaterialu(); }
      }
    });
  }

  // ---------- projekty ----------
  function obnovSeznam(vybrany) {
    const s = $('seznamProjektu');
    s.length = 1;
    T.ulozeni.seznam().forEach(n => s.add(new Option(n, n)));
    s.value = vybrany || '';
  }

  function navazProjekty() {
    $('nazevProjektu').addEventListener('input', e => { stav.nazev = e.target.value; T.ulozeni.ulozAktualni(stav); });
    $('btnUlozit').addEventListener('click', () => {
      stav.nazev = stav.nazev.trim() || 'Bez názvu';
      $('nazevProjektu').value = stav.nazev;
      T.ulozeni.uloz(stav);
      obnovSeznam(stav.nazev);
      toast(`Uloženo: ${stav.nazev}`);
    });
    $('seznamProjektu').addEventListener('change', e => {
      const p = e.target.value && T.ulozeni.nacti(e.target.value);
      if (p) { nastavStav(JSON.parse(JSON.stringify(p))); toast(`Načteno: ${p.nazev}`); }
    });
    $('btnSmazat').addEventListener('click', () => {
      const n = $('seznamProjektu').value;
      if (!n) { toast('Vyber projekt v seznamu.'); return; }
      if (confirm(`Smazat projekt „${n}“?`)) { T.ulozeni.smaz(n); obnovSeznam(); toast('Smazáno'); }
    });
    $('btnNovy').addEventListener('click', () => { nastavStav(novyStav(stav.produkt)); obnovSeznam(); });
    $('btnExport').addEventListener('click', () => T.ulozeni.exportuj(stav, M));
    $('importSoubor').addEventListener('change', async e => {
      const f = e.target.files[0];
      e.target.value = '';
      if (!f) return;
      try {
        const data = await T.ulozeni.importuj(f);
        M.sluc(data.materialy);
        vykresliKnihovnu();
        nastavStav(data.projekt);
        toast(`Importováno: ${data.projekt.nazev}`);
      } catch (err) {
        toast('Import selhal: ' + err.message);
      }
    });
  }

  // ---------- start ----------
  function init() {
    const sel = $('produkt');
    // výrobky po kategoriích, doporučený první
    const vyrobky = Object.values(T.produkty).sort((a, b) => (b.id === VYCHOZI_PRODUKT) - (a.id === VYCHOZI_PRODUKT));
    KATEGORIE.concat([[undefined, 'Ostatní']]).forEach(([k, popis]) => {
      const list = vyrobky.filter(p => p.kategorie === k || (k === undefined && !KATEGORIE.some(([x]) => x === p.kategorie)));
      if (!list.length) return;
      const og = prvek('optgroup', { label: popis });
      list.forEach(p => og.append(new Option(p.nazev, p.id)));
      sel.append(og);
    });
    sel.addEventListener('change', () => nastavStav(novyStav(sel.value)));
    // ukládání úprav po dokončené změně přepočítá ceny variant
    $('formular').addEventListener('change', () => cenyVariant());

    document.querySelectorAll('.zalozky button').forEach(b => b.addEventListener('click', () => {
      document.querySelectorAll('.zalozky button, .tab').forEach(x => x.classList.remove('aktivni'));
      b.classList.add('aktivni');
      $('tab-' + b.dataset.tab).classList.add('aktivni');
    }));

    $('btnViko').addEventListener('click', e => {
      e.target.textContent = popiskyKloubu[T.viewer.prepniViko() ? 1 : 0];
    });
    $('btnPohled').addEventListener('click', () => T.viewer.vychoziPohled());
    // objednávka materiálu jako TXT (tlačítko je v záložce Nákup a nářez, ta se překresluje)
    $('tab-spotreba').addEventListener('click', e => {
      if (!e.target.closest('[data-akce="objednavka"]') || !posledniNarez) return;
      const projekt = stav.nazev || 'Nový projekt';
      const text = T.narez.objednavka(posledniNarez, { projekt, vyrobek: produkt().nazev, pocet: posledniNarez.pocet });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
      a.download = `objednavka-${projekt.replace(/[\\/:*?"<>|]/g, '_')}.txt`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
    // figurína člověka pro měřítko vedle výrobku – volba se pamatuje v prohlížeči
    const popisPostav = () => { $('btnPostavy').textContent = T.viewer.postavyVidet() ? 'Skrýt postavu' : 'Ukázat postavu'; };
    $('btnPostavy').addEventListener('click', () => { T.viewer.prepniPostavy(); popisPostav(); });
    popisPostav();

    // menu projektu se zavře klikem mimo něj nebo po volbě akce
    document.addEventListener('click', e => {
      const menu = document.querySelector('details.menu');
      if (menu.open && (!menu.contains(e.target) || e.target.closest('.menu-obsah button'))) menu.open = false;
    });

    navazKnihovnu();
    navazProjekty();
    vykresliKnihovnu();
    obnovSeznam();
    nastavStav(T.ulozeni.nactiAktualni());

    setTimeout(() => {
      if (!T.viewer.pripraven()) {
        const h = $('scenaHlaska');
        h.textContent = '3D model se nenačetl (knihovna Three.js z internetu). Výpočty fungují i tak.';
        h.hidden = false;
      }
    }, 8000);
  }

  init();
})(window.Truhla);
