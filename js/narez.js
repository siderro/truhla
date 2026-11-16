window.Truhla = window.Truhla || {};

// Výpočet spotřeby: desky = 2D gilotinový nářez, řezivo = lamely + 1D dělení na obchodní délky.
// U katalogové skupiny (stejný materiál v několika formátech) se hledá nejlevnější kombinace formátů.
(function (T) {
  'use strict';

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const cislo = (x, des = 0) => x.toLocaleString('cs-CZ', { minimumFractionDigits: des, maximumFractionDigits: des });
  const formatyZ = mat => mat.formaty || [mat];

  // Kolik lamel (prken) a jak dlouhých je potřeba na jeden díl z řeziva
  function lamely(dil, mat, nast) {
    const delka = dil.delka + nast.pridavekDelka;
    if (dil.sirka <= mat.sirka) return { n: 1, delka };
    return { n: Math.ceil((dil.sirka + nast.pridavekSirka) / mat.sirka), delka };
  }

  // Cena formátu; když některý formát cenu nemá, porovnává se plocha / délka
  function cenik(formaty, velikost) {
    const sCenou = formaty.every(f => f.cena);
    return { sCenou, cena: f => sCenou ? f.cena : velikost(f) };
  }

  // ---------- desky ----------
  const plochaF = f => f.formatD * f.formatS;
  const orientace = (k, f) => {
    const W = f.formatD - 2 * f.orez, H = f.formatS - 2 * f.orez;
    const o = [{ w: k.d, h: k.s }];
    if (!f.vlakno && k.d !== k.s) o.push({ w: k.s, h: k.d });
    return o.filter(x => x.w > 0 && x.h > 0 && x.w <= W && x.h <= H);
  };
  const vejdeSe = (k, f) => orientace(k, f).length > 0;

  // best-area-fit na desky jednoho formátu; kusy musí na formát pasovat
  function balNaFormat(f, kusy, kerf) {
    const W = f.formatD - 2 * f.orez, H = f.formatS - 2 * f.orez;
    const listy = [];
    for (const k of kusy) {
      const mozne = orientace(k, f);
      let best = null;
      for (const list of listy) {
        for (const fr of list.volne) {
          for (const o of mozne) {
            if (o.w + kerf <= fr.w && o.h + kerf <= fr.h) {
              const sk = fr.w * fr.h - o.w * o.h;
              if (!best || sk < best.sk) best = { list, fr, o, sk };
            }
          }
        }
      }
      if (!best) {
        const list = { format: f, volne: [{ x: 0, y: 0, w: W + kerf, h: H + kerf }], kusy: [], plocha: 0 };
        listy.push(list);
        best = { list, fr: list.volne[0], o: mozne[0] };
      }

      const { list, fr, o } = best;
      const w = o.w + kerf, h = o.h + kerf;
      list.kusy.push({ x: fr.x, y: fr.y, w: o.w, h: o.h, nazev: k.nazev, d: k.d, s: k.s, ref: k });
      list.plocha += k.d * k.s;
      list.volne.splice(list.volne.indexOf(fr), 1);
      const zbW = fr.w - w, zbH = fr.h - h;
      const nove = zbW < zbH
        ? [{ x: fr.x + w, y: fr.y, w: zbW, h }, { x: fr.x, y: fr.y + h, w: fr.w, h: zbH }]
        : [{ x: fr.x + w, y: fr.y, w: zbW, h: fr.h }, { x: fr.x, y: fr.y + h, w, h: zbH }];
      nove.forEach(r => { if (r.w > kerf && r.h > kerf) list.volne.push(r); });
    }
    return listy;
  }

  function balDesky(mat, dily, kerf) {
    const formaty = formatyZ(mat);
    const { sCenou, cena } = cenik(formaty, plochaF);
    const kusy = [];
    dily.forEach(d => { for (let i = 0; i < d.pocet; i++) kusy.push({ nazev: d.nazev, d: d.delka, s: d.sirka }); });
    kusy.sort((a, b) => b.d * b.s - a.d * a.s || Math.max(b.d, b.s) - Math.max(a.d, a.s));
    const nevejde = kusy.filter(k => !formaty.some(f => vejdeSe(k, f)));
    const zbyle = kusy.filter(k => !nevejde.includes(k));

    const naklad = listy => listy.reduce((s, l) => s + cena(l.format), 0);
    const kandidati = [];

    // a) vše z jednoho formátu
    formaty.forEach(f => { if (zbyle.every(k => vejdeSe(k, f))) kandidati.push(balNaFormat(f, zbyle, kerf)); });

    // b) postupně: vždy deska, která dá nejvíc dílů za korunu
    if (formaty.length > 1) {
      let zbyva = zbyle.slice(), listy = [];
      while (zbyva.length) {
        let best = null;
        for (const f of formaty) {
          const pasuje = zbyva.filter(k => vejdeSe(k, f));
          if (!pasuje.length) continue;
          const list = balNaFormat(f, pasuje, kerf).reduce((a, b) => (b.plocha > a.plocha ? b : a));
          const pomer = cena(f) / list.plocha;
          if (!best || pomer < best.pomer) best = { list, pomer };
        }
        listy.push(best.list);
        const pouzite = new Set(best.list.kusy.map(x => x.ref));
        zbyva = zbyva.filter(k => !pouzite.has(k));
      }
      kandidati.push(listy);
    }

    // dorovnání: obsah každé desky zkusit přeložit na levnější formát(y)
    const dorovnej = listy => listy.flatMap(l => {
      const ks = l.kusy.map(x => x.ref);
      let best = [l], bestC = cena(l.format);
      formaty.forEach(f => {
        if (f === l.format || !ks.every(k => vejdeSe(k, f))) return;
        const nove = balNaFormat(f, ks, kerf), c = naklad(nove);
        if (c < bestC) { best = nove; bestC = c; }
      });
      return best;
    });

    let listy = [];
    kandidati.map(dorovnej).forEach(k => {
      if (!listy.length || naklad(k) < naklad(listy) || (naklad(k) === naklad(listy) && k.length < listy.length)) listy = k;
    });
    // větší formáty napřed
    listy.sort((a, b) => plochaF(b.format) - plochaF(a.format));

    const plochaDilu = zbyle.reduce((s, k) => s + k.d * k.s, 0);
    const plochaDesek = listy.reduce((s, l) => s + plochaF(l.format), 0);
    return {
      mat, listy, nevejde, plochaDilu, vyuziti: plochaDesek ? plochaDilu / plochaDesek : 0,
      cena: sCenou ? naklad(listy) : null, nakup: souhrn(listy.map(l => l.format)), formaty,
    };
  }

  // [{format, ks}] v pořadí podle velikosti
  function souhrn(seznam) {
    const m = new Map();
    seznam.forEach(f => m.set(f, (m.get(f) || 0) + 1));
    return [...m].map(([format, ks]) => ({ format, ks }));
  }

  // ---------- řezivo ----------
  function balRezivo(mat, dily, kerf, nast) {
    const formaty = formatyZ(mat).slice().sort((a, b) => a.delka - b.delka);
    const { sCenou, cena } = cenik(formaty, f => f.delka);
    const kusy = [];
    dily.forEach(d => {
      const l = lamely(d, mat, nast);
      for (let i = 0; i < d.pocet * l.n; i++) kusy.push({ nazev: d.nazev, delka: l.delka });
    });
    kusy.sort((a, b) => b.delka - a.delka);
    const maxD = formaty[formaty.length - 1].delka;
    const nevejde = kusy.filter(k => k.delka > maxD);
    const zbyle = kusy.filter(k => k.delka <= maxD);

    // first-fit decreasing na délku L, pak každé prkno zkrátit na nejlevnější délku, do které se vejde
    const naDelku = L => {
      const prkna = [];
      for (const k of zbyle) {
        let p = prkna.find(p => p.vyuzito + kerf + k.delka <= L);
        if (!p) { p = { vyuzito: -kerf, kusy: [] }; prkna.push(p); }
        p.kusy.push(k);
        p.vyuzito += kerf + k.delka;
      }
      prkna.forEach(p => {
        p.format = formaty.filter(f => f.delka >= p.vyuzito).reduce((a, b) => (cena(b) < cena(a) ? b : a));
        p.delka = p.format.delka;
      });
      return prkna;
    };
    const naklad = pr => pr.reduce((s, p) => s + cena(p.format), 0);
    let prkna = [];
    formaty.filter(f => f.delka >= (zbyle[0] ? zbyle[0].delka : 0)).forEach(f => {
      const k = naDelku(f.delka);
      if (!prkna.length || naklad(k) < naklad(prkna)) prkna = k;
    });
    prkna.sort((a, b) => b.delka - a.delka);

    const cisteMm = zbyle.reduce((s, k) => s + k.delka, 0);
    const delkaMm = prkna.reduce((s, p) => s + p.delka, 0);
    return {
      mat, prkna, nevejde, pocetLamel: kusy.length,
      bm: delkaMm / 1000,
      m3: delkaMm * mat.sirka * mat.tloustka / 1e9,
      odpad: delkaMm ? 1 - cisteMm / delkaMm : 0,
      cena: sCenou ? naklad(prkna) : null, nakup: souhrn(prkna.map(p => p.format)), formaty,
    };
  }

  // pocet = kolik výrobků se dělá najednou; díly všech kusů se nařežou společně
  function spocitej(dily, M, pocet = 1) {
    const nast = M.nastaveni();
    const skupiny = new Map();
    dily.map(d => Object.assign({}, d, { pocet: d.pocet * pocet })).forEach(d => {
      const mat = M.najdi(d.material);
      if (!mat) return;
      if (!skupiny.has(mat.id)) skupiny.set(mat.id, { mat, dily: [] });
      skupiny.get(mat.id).dily.push(d);
    });

    const vysledek = { desky: [], rezivo: [], chyby: [], pocet };
    for (const { mat, dily: md } of skupiny.values()) {
      if (mat.typ === 'deska') {
        const r = balDesky(mat, md, nast.prorez);
        vysledek.desky.push(r);
        r.nevejde.forEach(k => vysledek.chyby.push(`Díl „${k.nazev}“ ${k.d} × ${k.s} mm se nevejde na žádný formát ${mat.nazev} (největší ${mat.formatD} × ${mat.formatS}${mat.vlakno ? ', vlákno po délce' : ''}).`));
      } else {
        const r = balRezivo(mat, md, nast.prorez, nast);
        vysledek.rezivo.push(r);
        r.nevejde.forEach(k => vysledek.chyby.push(`Přířez „${k.nazev}“ ${k.delka} mm je delší než ${mat.nazev} (nejdelší ${mat.delka} mm).`));
      }
    }
    // pro srovnání: kolik by se koupilo při výrobě každého kusu zvlášť
    if (pocet > 1) {
      const jeden = spocitej(dily, M, 1);
      const zvlast = new Map();
      jeden.desky.forEach(r => zvlast.set(r.mat.id, { ks: r.listy.length * pocet, cena: r.cena === null ? null : r.cena * pocet }));
      jeden.rezivo.forEach(r => zvlast.set(r.mat.id, { ks: r.prkna.length * pocet, cena: r.cena === null ? null : r.cena * pocet }));
      vysledek.zvlast = zvlast;
    }
    return vysledek;
  }

  function svgDeska(mat, list) {
    const F = list.format.formatD, G = list.format.formatS, o = list.format.orez;
    let s = `<svg viewBox="-4 -4 ${F + 8} ${G + 8}" class="svg-deska" role="img" aria-label="Rozložení dílů na desce">`;
    s += `<rect x="0" y="0" width="${F}" height="${G}" class="deska-podklad"/>`;
    for (const k of list.kusy) {
      const x = k.x + o, y = k.y + o;
      const fs = Math.max(18, Math.min(k.h * 0.2, k.w * 0.075, 64));
      const cx = x + k.w / 2, cy = y + k.h / 2;
      s += `<rect x="${x}" y="${y}" width="${k.w}" height="${k.h}" fill="${esc(mat.barva)}" class="dil"><title>${esc(k.nazev)} ${k.d} × ${k.s}</title></rect>`;
      s += `<text x="${cx}" y="${cy - fs * 0.6}" font-size="${fs}" text-anchor="middle" dominant-baseline="middle" class="dil-text">${esc(k.nazev)}</text>`;
      s += `<text x="${cx}" y="${cy + fs * 0.6}" font-size="${fs * 0.9}" text-anchor="middle" dominant-baseline="middle" class="dil-text">${k.d} × ${k.s}</text>`;
    }
    return s + '</svg>';
  }

  function svgRezivo(r) {
    const L = Math.max(...r.prkna.map(p => p.delka), 1), rh = 70, mez = 24;
    const H = r.prkna.length * (rh + mez);
    let s = `<svg viewBox="-4 -4 ${L + 8} ${H + 8}" class="svg-rezivo" role="img" aria-label="Dělení prken">`;
    r.prkna.forEach((p, i) => {
      const y = i * (rh + mez);
      s += `<rect x="0" y="${y}" width="${p.delka}" height="${rh}" class="deska-podklad"><title>${p.delka} mm</title></rect>`;
      let x = 0;
      for (const k of p.kusy) {
        s += `<rect x="${x}" y="${y}" width="${k.delka}" height="${rh}" fill="${esc(r.mat.barva)}" class="dil"><title>${esc(k.nazev)} ${k.delka}</title></rect>`;
        if (k.delka > 160) s += `<text x="${x + k.delka / 2}" y="${y + rh / 2}" font-size="34" text-anchor="middle" dominant-baseline="middle" class="dil-text">${k.delka}</text>`;
        x += k.delka + T.materialy.nastaveni().prorez;
      }
    });
    return s + '</svg>';
  }

  function vykresli(el, v) {
    const desek = n => `${n} ${n === 1 ? 'deska' : n >= 2 && n <= 4 ? 'desky' : 'desek'}`;
    const kusu = n => `${n} ks`;
    const sCenou = v.desky.concat(v.rezivo).some(r => r.cena !== null);
    const srovnani = (r, nyni, jednotka) => {
      if (!v.zvlast) return '';
      const z = v.zvlast.get(r.mat.id);
      const usporaKs = z.ks - nyni;
      const usporaKc = z.cena !== null && r.cena !== null ? z.cena - r.cena : 0;
      const text = [usporaKs > 0 ? jednotka(usporaKs) : '', usporaKc > 0.5 ? cislo(usporaKc) + ' Kč' : ''].filter(Boolean).join(' · ');
      return `<td class="c">${jednotka(z.ks)}</td><td class="c">${text ? `<strong class="uspora">−${text}</strong>` : '—'}</td>`;
    };
    const nakup = (r, rozmer) => r.nakup.map(n => `${n.ks}× ${rozmer(n.format)}`).join(' + ');
    const vyber = r => r.formaty.length > 1 ? `<br><span class="pozn">nejlevnější kombinace z ${r.formaty.length} formátů</span>` : '';
    let celkem = 0, bezCeny = false;
    const cena = r => {
      if (r.cena !== null) celkem += r.cena; else bezCeny = true;
      return sCenou ? `<td class="c">${r.cena !== null ? cislo(r.cena) + ' Kč' : '—'}</td>` : '';
    };

    let h = v.pocet > 1 ? `<p><strong>Výpočet pro ${v.pocet} výrobků najednou</strong> – díly všech kusů jsou nařezané společně.</p>` : '';
    h += '<table class="tabulka"><thead><tr><th>Materiál</th><th>Nákup</th><th>Detail</th>'
      + (sCenou ? '<th class="c">Cena bez DPH</th>' : '')
      + (v.zvlast ? '<th class="c">Po jednom kusu</th><th class="c">Úspora</th>' : '') + '</tr></thead><tbody>';
    v.desky.forEach(r => {
      h += `<tr><td>${esc(r.mat.nazev)}</td><td><strong>${desek(r.listy.length)}</strong>: ${nakup(r, f => `${f.formatD} × ${f.formatS}`)}${vyber(r)}</td>`
        + `<td>díly ${cislo(r.plochaDilu / 1e6, 2)} m² · využití ${cislo(r.vyuziti * 100)} %</td>`
        + cena(r) + srovnani(r, r.listy.length, desek) + '</tr>';
    });
    v.rezivo.forEach(r => {
      h += `<tr><td>${esc(r.mat.nazev)}</td><td><strong>${r.prkna.length} ks</strong>: ${nakup(r, f => `${f.delka} mm`)}${vyber(r)}</td>`
        + `<td>${cislo(r.bm, 1)} bm · ${cislo(r.m3, 3)} m³ · ${r.pocetLamel} přířezů · odpad ${cislo(r.odpad * 100)} %</td>`
        + cena(r) + srovnani(r, r.prkna.length, kusu) + '</tr>';
    });
    h += '</tbody>';
    if (sCenou) {
      h += `<tfoot><tr><td colspan="3">Celkem materiál${bezCeny ? ' (bez položek bez ceny)' : ''}</td><td class="c">${cislo(celkem)} Kč</td>`
        + (v.zvlast ? '<td></td><td></td>' : '') + '</tr></tfoot>';
    }
    h += '</table>';
    const zdroj = T.materialy.zdroj();
    if (sCenou && zdroj) h += `<p class="pozn">Ceny podle katalogu ${esc(zdroj.nazev)} bez DPH, bez slev za balení – ověř aktuální cenu na webu dodavatele.</p>`;
    const n = T.materialy.nastaveni();
    h += `<p class="pozn">Prořez pily ${n.prorez} mm · u řeziva přídavek ${n.pridavekDelka} mm na délku a ${n.pridavekSirka} mm na šířku slepovaného panelu (změníš v záložce Materiály a nastavení).</p>`;

    v.desky.forEach(r => {
      h += `<h3>${esc(r.mat.nazev)} – nářezový plán</h3>`;
      if (r.formaty.length > 1) h += `<p class="pozn">Zvažované formáty: ${r.formaty.map(f => `${f.formatD} × ${f.formatS}${f.cena ? ` (${cislo(f.cena)} Kč)` : ''}`).join(', ')}.</p>`;
      h += '<div class="desky">';
      r.listy.forEach((list, i) => {
        h += `<figure>${svgDeska(r.mat, list)}<figcaption>Deska ${i + 1} / ${r.listy.length} · ${list.format.formatD} × ${list.format.formatS}${r.mat.vlakno ? ' · vlákno vodorovně' : ''}</figcaption></figure>`;
      });
      h += '</div>';
    });
    v.rezivo.forEach(r => {
      if (!r.prkna.length) return;
      h += `<h3>${esc(r.mat.nazev)} – dělení prken</h3><figure>${svgRezivo(r)}</figure>`;
    });
    el.innerHTML = h;
  }

  T.narez = { spocitej, vykresli, lamely };
})(window.Truhla);
