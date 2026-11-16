window.Truhla = window.Truhla || {};

// Propojení: formulář (táhlo + pole) → generátor dílů → kusovník, nářez, 3D.
(function (T) {
  'use strict';
  const $ = id => document.getElementById(id);
  const M = T.materialy;
  let stav = null;
  let naplanovano = false;
  let pokrocileOtevrene = false;
  let popiskyKloubu = ['Otevřít víko', 'Zavřít víko'];
  let posledniNarez = null;                       // pro export objednávky
  const VYCHOZI_PRODUKT = 'lavice-truhla-luby'; // nejsnazší na ruční výrobu

  const produkt = () => T.produkty[stav.produkt];
  // parametry společné všem výrobkům
  const SPOLECNE = [
    { skupina: 'Výroba', klic: 'pocet', nazev: 'Počet kusů', typ: 'cislo', min: 1, max: 20, krok: 1, vychozi: 1, jednotka: 'ks' },
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
    $('nazevProjektu').value = stav.nazev || '';
    vykresliFormular();
    prepocitej();
  }

  function toast(text) {
    const t = $('toast');
    t.textContent = text;
    t.hidden = false;
    clearTimeout(toast.casovac);
    toast.casovac = setTimeout(() => { t.hidden = true; }, 2200);
  }

  // ---------- formulář ----------
  function prvek(tag, atributy) {
    const e = document.createElement(tag);
    Object.entries(atributy || {}).forEach(([k, v]) => { e[k] = v; });
    return e;
  }

  const kc = x => Math.round(x).toLocaleString('cs-CZ') + ' Kč';

  function vyberMaterialu(hodnota) {
    const sel = prvek('select');
    const skupiny = new Map([
      ['Vlastní – desky', M.vlastni().filter(m => m.typ === 'deska')],
      ['Vlastní – řezivo', M.vlastni().filter(m => m.typ === 'rezivo')],
    ]);
    // katalog po skupinách materiál + kvalita + tloušťka; formát volí nářez
    M.skupiny().forEach(s => {
      const k = s.dodavatel + ' – ' + s.kategorie;
      if (!skupiny.has(k)) skupiny.set(k, []);
      skupiny.get(k).push(s);
    });
    const popisSkupiny = s => {
      const f = s.formaty, deska = s.typ === 'deska';
      const formaty = f.length > 1 ? `${f.length} ${deska ? 'formáty' : 'délky'}`
        : deska ? `${f[0].formatD}×${f[0].formatS}` : `${f[0].delka} mm`;
      return `${s.nazev} – ${formaty}` + (s.cenaOd ? `, od ${kc(s.cenaOd)}/${deska ? 'm²' : 'bm'}` : '');
    };
    skupiny.forEach((list, popis) => {
      if (!list.length) return;
      const og = prvek('optgroup', { label: popis });
      list.forEach(m => og.append(new Option(m.skupina ? popisSkupiny(m) : m.nazev, m.id)));
      sel.append(og);
    });
    sel.value = hodnota;
    if (sel.value !== hodnota) sel.append(new Option('(chybí v knihovně)', hodnota, true, true));
    return sel;
  }

  function radek(d) {
    const r = prvek('div', { className: 'pole pole-' + d.typ });
    r.dataset.klic = d.klic;
    const id = 'p-' + d.klic;
    const v = stav.params[d.klic];

    if (d.typ === 'prepinac') {
      const cb = prvek('input', { type: 'checkbox', id, checked: !!v });
      cb.addEventListener('change', () => nastav(d, cb.checked));
      const lab = prvek('label', { htmlFor: id, textContent: d.nazev });
      r.append(cb, lab);
      return r;
    }

    r.append(prvek('label', { htmlFor: id, textContent: d.nazev }));
    if (d.typ === 'cislo') {
      const ovl = prvek('div', { className: 'ovladac' });
      const tahlo = prvek('input', { type: 'range', min: d.min, max: d.max, step: d.krok, value: v, tabIndex: -1 });
      tahlo.setAttribute('aria-label', d.nazev + ' – táhlo');
      const pole = prvek('input', { type: 'number', id, step: d.krok, value: v, min: 0 });
      tahlo.addEventListener('input', () => { pole.value = tahlo.value; nastav(d, +tahlo.value); });
      pole.addEventListener('input', () => {
        const x = pole.valueAsNumber;
        if (!Number.isFinite(x)) return;
        tahlo.value = x; // táhlo se zarazí na kraji rozsahu, platí hodnota z pole
        nastav(d, x);
      });
      pole.addEventListener('change', () => { if (!Number.isFinite(pole.valueAsNumber)) pole.value = stav.params[d.klic]; });
      ovl.append(tahlo, pole, prvek('span', { className: 'jednotka', textContent: d.jednotka || 'mm' }));
      r.append(ovl);
    } else if (d.typ === 'material' || d.typ === 'volba') {
      const sel = d.typ === 'material' ? vyberMaterialu(v) : prvek('select');
      if (d.typ === 'volba') {
        d.moznosti.forEach(([hod, popis]) => sel.append(new Option(popis, hod)));
        sel.value = v;
      }
      sel.id = id;
      sel.addEventListener('change', () => nastav(d, sel.value));
      r.append(sel);
    }
    return r;
  }

  // ---------- předvolby (praktické velikosti, dřevo) ----------
  const predvolbaParams = m => Object.fromEntries(Object.entries(m.params)
    .map(([k, v]) => [k, typeof v === 'string' ? M.normalizuj(v) : v]));

  function vykresliPredvolby(f) {
    (produkt().predvolby || []).forEach(sk => {
      const box = prvek('div', { className: 'predvolby' });
      const tlacitka = prvek('div', { className: 'predvolby-tlacitka' });
      sk.moznosti.forEach(m => {
        const b = prvek('button', { type: 'button', className: 'predvolba', title: m.popis });
        b.append(prvek('span', { className: 'predvolba-nazev', textContent: m.nazev }), prvek('span', { className: 'predvolba-cena' }));
        b.addEventListener('click', () => {
          Object.assign(stav.params, predvolbaParams(m));
          vykresliFormular();
          prepocitej();
        });
        b._predvolba = m;
        tlacitka.append(b);
      });
      box.append(prvek('div', { className: 'predvolby-nadpis', textContent: sk.skupina }), tlacitka, prvek('p', { className: 'predvolby-popis' }));
      f.append(box);
    });
  }

  // zvýrazní předvolbu, která odpovídá aktuálním parametrům, a vypíše její popis
  function aktualizujPredvolby() {
    document.querySelectorAll('#formular .predvolby').forEach(box => {
      let aktivni = null;
      box.querySelectorAll('.predvolba').forEach(b => {
        const shoda = Object.entries(predvolbaParams(b._predvolba)).every(([k, v]) => stav.params[k] === v);
        b.classList.toggle('aktivni', shoda);
        if (shoda && !aktivni) aktivni = b._predvolba;
      });
      box.querySelector('.predvolby-popis').textContent = aktivni ? aktivni.popis : 'vlastní nastavení';
    });
  }

  // Cena materiálu pro každou variantu při současných rozměrech (s odkladem, ať táhlo nezasekává)
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

  // Základní parametry ve skupinách nahoře, pokročilé (pokrocile: true) sbalené pod „Další nastavení“
  function vykresliFormular() {
    const f = $('formular');
    f.innerHTML = '';
    vykresliPredvolby(f);
    const det = prvek('details', { className: 'pokrocile', open: pokrocileOtevrene });
    det.append(prvek('summary', { textContent: 'Další nastavení – materiály, spoje, detaily' }));
    det.addEventListener('toggle', () => { pokrocileOtevrene = det.open; });
    const skupiny = new Map();
    let sk = 'Parametry';
    for (const d of parametry()) {
      if (d.skupina) sk = d.skupina;
      const nazev = d.pokrocile ? sk : (d.zakladSkupina || sk);
      const klic = (d.pokrocile ? 'P:' : 'Z:') + nazev;
      if (!skupiny.has(klic)) {
        const fs = prvek('fieldset');
        fs.append(prvek('legend', { textContent: nazev }));
        skupiny.set(klic, fs);
        (d.pokrocile ? det : f).append(fs);
      }
      skupiny.get(klic).append(radek(d));
    }
    if (det.children.length > 1) f.append(det);
    aktualizujViditelnost();
    aktualizujPredvolby();
  }

  function aktualizujViditelnost() {
    for (const d of parametry()) {
      const r = document.querySelector(`.pole[data-klic="${d.klic}"]`);
      if (r) r.hidden = d.kdyz ? !d.kdyz(stav.params) : false;
    }
    // skupina, ve které je všechno skryté, se nezobrazí
    document.querySelectorAll('#formular fieldset').forEach(fs => {
      fs.hidden = ![...fs.querySelectorAll('.pole')].some(r => !r.hidden);
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
    cenyVariant();
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
    // doporučený výrobek první
    Object.values(T.produkty).sort((a, b) => (b.id === VYCHOZI_PRODUKT) - (a.id === VYCHOZI_PRODUKT))
      .forEach(p => sel.add(new Option(p.nazev, p.id)));
    sel.addEventListener('change', () => nastavStav(novyStav(sel.value)));

    // zdroj ceníku (později přepínač mezi dodavateli)
    const z = M.zdroj();
    $('zdrojDat').innerHTML = z
      ? `Ceník: <strong>${esc(z.nazev)}</strong> · <a href="${esc(z.url)}" target="_blank" rel="noopener">${esc(z.web)}</a> · staženo ${new Date(z.stazeno).toLocaleDateString('cs-CZ')}`
      : 'Ceník: jen vlastní materiály';

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
    // postavy pro měřítko (muž, žena) vedle výrobku – volba se pamatuje v prohlížeči
    const popisPostav = () => { $('btnPostavy').textContent = T.viewer.postavyVidet() ? 'Skrýt postavy' : 'Ukázat postavy'; };
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
