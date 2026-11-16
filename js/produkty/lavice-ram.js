window.Truhla = window.Truhla || {};

// Rámová lavice: samonosný rám ze 4 sloupků a horních a dolních lubů na čep a dlab, v každé stěně šikmá
// vzpěra (zavětrování). Stěny a dno z desek zasunutých do drážek v sloupcích a lubech, sedák = dva
// masivní díly (zadní pevný na lubech, přední sklopný) spojené klavírovým pantem.
// Drážky pro stěny jsou posunuté k vnějšímu líci, takže za deskou (uvnitř) zůstane kapsa, ve které leží vzpěra
// zarovnaná s vnitřním lícem lubů – zvenku je vidět jen rám a výplň. Dlouhé nízké stěny mají dvě vzpěry do A.
// Souřadnice v mm: x = délka (zleva), y = výška (od podlahy), z = hloubka (0 = záda, roste dopředu).
(function (T) {
  'use strict';
  const { zaokr, SMRK, OSB18, OSB12, sadaDreva } = T.truhla;
  const PREKLIZKA18 = 'demos-161042', PREKLIZKA12 = 'demos-161040';
  const RAMENO = 10;                               // osazení čepu lubu nahoře a dole
  const DNO_POD_HORNI = 10;                        // drážka pro dno pod horní plochou dolního lubu

  T.produkty['lavice-ram'] = {
    id: 'lavice-ram',
    nazev: 'Lavice rámová – trámky, zavětrování, výplně v drážkách',
    predvolby: [
      { skupina: 'Výplně', moznosti: [
        { nazev: 'Překližka', popis: 'stěny a dno z vodovzdorné obalové překližky – drží tvar, hrany se nedrolí', params: { matStena: PREKLIZKA12, matDno: PREKLIZKA18 } },
        { nazev: 'OSB', popis: 'stěny a dno z OSB – nejlevnější, hrany v drážce se drolí', params: { matStena: OSB12, matDno: OSB18 } },
      ] },
      Object.assign(sadaDreva(['matSedak']), { skupina: 'Sedák' }),
    ],
    parametry: [
      { skupina: 'Rozměry', klic: 'delka', nazev: 'Délka (rám)', typ: 'cislo', min: 500, max: 2500, krok: 10, vychozi: 1340 },
      { klic: 'hloubka', nazev: 'Hloubka (rám)', typ: 'cislo', min: 300, max: 700, krok: 10, vychozi: 400 },
      { klic: 'vyska', nazev: 'Výška sedáku (vč. desky)', typ: 'cislo', min: 300, max: 700, krok: 5, vychozi: 480 },
      { klic: 'zavetrovani', nazev: 'Zavětrování', typ: 'volba', vychozi: 'vsechny',
        moznosti: [['vsechny', 'Šikmé vzpěry uvnitř všech stěn'], ['bokyZada', 'Jen boky a záda (vpředu víc místa uvnitř)'], ['zadne', 'Bez vzpěr']] },
      { pokrocile: true, klic: 'nozky', nazev: 'Dolní lub nad podlahou', typ: 'cislo', min: 0, max: 200, krok: 5, vychozi: 50 },

      { skupina: 'Materiál', pokrocile: true, klic: 'matSloupek', nazev: 'Sloupky', typ: 'material', vychozi: 'demos-262545' },
      { pokrocile: true, klic: 'matLub', nazev: 'Luby (horní a dolní)', typ: 'material', vychozi: 'demos-262545' },
      { pokrocile: true, klic: 'matVzpera', nazev: 'Vzpěry (na plocho)', typ: 'material', vychozi: 'demos-262646', kdyz: p => p.zavetrovani !== 'zadne' },
      { pokrocile: true, klic: 'matStena', nazev: 'Stěny (deska)', typ: 'material', vychozi: PREKLIZKA12 },
      { pokrocile: true, klic: 'matDno', nazev: 'Dno (deska)', typ: 'material', vychozi: PREKLIZKA18 },
      { pokrocile: true, klic: 'matSedak', nazev: 'Sedák (masiv)', typ: 'material', vychozi: SMRK },

      { skupina: 'Drážky a čepy', pokrocile: true, klic: 'drazkaHloubka', nazev: 'Hloubka drážky', typ: 'cislo', min: 5, max: 20, krok: 1, vychozi: 12 },
      { pokrocile: true, klic: 'drazkaVule', nazev: 'Vůle desky v drážce (na stranu)', typ: 'cislo', min: 0, max: 3, krok: 0.5, vychozi: 1 },
      { pokrocile: true, klic: 'cepDelka', nazev: 'Délka čepu lubu', typ: 'cislo', min: 15, max: 50, krok: 1, vychozi: 30 },

      { skupina: 'Sedák', pokrocile: true, klic: 'vikoPevna', nazev: 'Hloubka pevné zadní části', typ: 'cislo', min: 60, max: 400, krok: 5, vychozi: 120 },
      { pokrocile: true, klic: 'presahPredni', nazev: 'Přesah vpředu', typ: 'cislo', min: 0, max: 60, krok: 1, vychozi: 50 },
      { pokrocile: true, klic: 'presahBoky', nazev: 'Přesah na bocích', typ: 'cislo', min: 0, max: 60, krok: 1, vychozi: 15 },
    ],

    generuj(p, M) {
      const varovani = [];
      const mat = (id, co) => {
        const m = M.najdi(id);
        if (m) return m;
        varovani.push(`Materiál pro ${co} nenalezen – použit „${M.vse()[0].nazev}“.`);
        return M.vse()[0];
      };
      const sir = m => m.sirka || m.tloustka;
      const mS = mat(p.matSloupek, 'sloupky'), mL = mat(p.matLub, 'luby'), mW = mat(p.matStena, 'stěny');
      const mD = mat(p.matDno, 'dno'), mT = mat(p.matSedak, 'sedák');
      const mV = p.zavetrovani !== 'zadne' ? mat(p.matVzpera, 'vzpěry') : null;

      const dily = [];
      const dil = (nazev, m, delka, sirka, pocet, boxy, extra) => dily.push(Object.assign({
        nazev, material: m.id, delka: zaokr(delka), sirka: zaokr(sirka), tloustka: m.tloustka, pocet, boxy,
      }, extra || {}));

      const L = p.delka, D = p.hloubka, H = p.vyska;
      const s = Math.min(mS.tloustka, sir(mS));      // sloupek čtvercový (bere se menší strana)
      const lt = mL.tloustka, lh = sir(mL);          // lub: tloušťka ve stěně, výška
      const Tw = mW.tloustka, Td = mD.tloustka, Ts = mT.tloustka;
      // tupy = jednoduchá varianta: luby na tupo mezi sloupky, spoj kolíky nebo vruty (bez čepů a dlabů)
      const tupy = !!p.tupy, koliky = tupy && p.spoj !== 'vruty';
      const hd = p.drazkaHloubka, v = p.drazkaVule, cep = tupy ? 0 : p.cepDelka;
      const bt = mV ? mV.tloustka : 0, bw = mV ? Math.min(p.sirkaPrkna || sir(mV), sir(mV)) : 0;
      if (mV && p.sirkaPrkna > sir(mV)) varovani.push(`Prkno ${mV.nazev} je široké jen ${sir(mV)} mm – výztuha počítána s touto šířkou.`);
      const gw = Tw + 2 * v;                          // šířka drážky pro stěnu
      const gd = Td + 2 * v;                          // šířka drážky pro dno

      if (Math.max(mS.tloustka, sir(mS)) !== s) varovani.push(`Sloupek ${mS.tloustka} × ${sir(mS)} mm není čtvercový – počítá se jako ${s} × ${s} mm; zvol čtvercový hranol.`);
      if (lt > s) varovani.push(`Lub (${lt} mm) je tlustší než sloupek (${s} mm) – bude přečnívat dovnitř.`);
      if (hd > 0.4 * Math.min(s, lh)) varovani.push(`Drážka ${hd} mm je hlubší než 4/10 trámku (${zaokr(0.4 * Math.min(s, lh))} mm) – trámek zeslabí; zmenši hloubku drážky.`);

      // drážka pro stěnu: u vnějšího líce, za ní (uvnitř) kapsa pro vzpěru; bez vzpěr doprostřed lubu
      const oG = mV ? lt - bt - gw : Math.round((lt - gw) / 2);   // vnější stěna drážky
      if (oG < 10) varovani.push(`Vnější stěna drážky v lubu má jen ${zaokr(oG)} mm – vzpěra ${bt} mm + deska ${Tw} mm se do lubu ${lt} mm nevejdou; zvol silnější lub nebo tenčí vzpěru.`);
      const tc = Math.max(gw, Math.round(lt / 3));   // čep lubu kryje drážku (drážka v sloupku pak zmizí v dlabu)
      const oC = Math.max(0, Math.min(lt - tc, oG + gw / 2 - tc / 2));
      if (!tupy && oC < 10) varovani.push(`Dlab v sloupku je jen ${zaokr(oC)} mm od vnějšího líce – stěna dlabu se může vylomit; zvol silnější sloupek a lub nebo tenčí vzpěru.`);

      // kolíky Ø8 × 35 (20 mm v lubu, 15 + 2 v sloupku) mezi drážkou pro stěnu a drážkou pro dno; podélné a boční
      // luby mají kolíky výškově vystřídané, aby se ve sloupku nesrazily
      const KOL = 8, zK = (oG + gw + lt - hd) / 2;
      const hK = { x: [0.2, 0.6], z: [0.4, 0.8] };
      if (koliky && lt - hd - (oG + gw) < KOL + 4) varovani.push(`Mezi drážkou pro stěnu a drážkou pro dno zbývá v lubu jen ${zaokr(lt - hd - oG - gw)} mm – kolík Ø${KOL} se nevejde; zvol silnější lub nebo spoj vruty.`);

      // --- Výšky ---
      const yS = H - Ts;                              // vršek sloupků a horních lubů
      const yL0 = p.nozky, yL1 = yL0 + lh;            // dolní lub
      const yH0 = yS - lh;                            // horní lub
      const hSvetla = yH0 - yL1;
      if (hSvetla < 80) varovani.push(`Mezi dolním a horním lubem zbývá jen ${zaokr(hSvetla)} mm – zvyš výšku sedáku nebo zmenši nožky.`);
      const yDno = yL1 - DNO_POD_HORNI - Td;

      // --- Sloupky ---
      const sx = [0, L - s], sz = [0, D - s];
      dil('Sloupek', mS, yS, s, 4, sx.flatMap(x => sz.map(z => ({ pos: [x, 0, z], size: [s, yS, s] }))),
        { poznamka: tupy ? `${koliky ? 'otvory pro kolíky' : 'předvrtat pro vruty'} ze dvou stran, drážky pro stěny` : 'dlaby pro čepy lubů ze dvou stran, drážky pro stěny' });

      // --- Luby: v líci se sloupky zvenku ---
      const sL = L - 2 * s, sD = D - 2 * s;           // světlost mezi sloupky
      const lubX = (nazev, y, pozn) => dil(nazev, mL, sL + 2 * cep, lh, 2, [
        { pos: [s, y, 0], size: [sL, lh, lt] }, { pos: [s, y, D - lt], size: [sL, lh, lt] }], { poznamka: pozn });
      const lubZ = (nazev, y, pozn) => dil(nazev, mL, sD + 2 * cep, lh, 2, [
        { pos: [0, y, s], size: [lt, lh, sD] }, { pos: [L - lt, y, s], size: [lt, lh, sD] }], { poznamka: pozn });
      const pH = 'drážka pro stěnu zespodu; zadní a boční nesou pevnou část sedáku', pD = 'drážka pro stěnu shora, pro dno z vnitřní strany';
      lubX('Horní lub – přední a zadní', yH0, pH);
      lubZ('Horní lub – boční', yH0, 'drážka pro stěnu zespodu');
      lubX('Dolní lub – přední a zadní', yL0, pD);
      lubZ('Dolní lub – boční', yL0, pD);

      // --- Stěny: desky v drážkách ---
      const zW = oG + v;                              // vnější líc desky od vnějšího líce rámu
      const hW = hSvetla + 2 * (hd - v);
      const yW = yL1 - hd + v;
      dil('Stěna přední a zadní', mW, sL + 2 * (hd - v), hW, 2, [
        { pos: [s - hd + v, yW, zW], size: [sL + 2 * (hd - v), hW, Tw] },
        { pos: [s - hd + v, yW, D - zW - Tw], size: [sL + 2 * (hd - v), hW, Tw] }],
        { poznamka: `volně v drážkách ${zaokr(gw)} × ${hd} mm, nelepit` });
      dil('Stěna boční', mW, sD + 2 * (hd - v), hW, 2, [
        { pos: [zW, yW, s - hd + v], size: [Tw, hW, sD + 2 * (hd - v)] },
        { pos: [L - zW - Tw, yW, s - hd + v], size: [Tw, hW, sD + 2 * (hd - v)] }],
        { poznamka: `volně v drážkách ${zaokr(gw)} × ${hd} mm, nelepit` });

      // --- Dno: v drážkách dolních lubů, rohy zastřižené kolem sloupků ---
      const dL = L - 2 * lt + 2 * (hd - v), dD = D - 2 * lt + 2 * (hd - v);
      const roh = s - lt + hd - v;
      dil('Dno', mD, dL, dD, 1, [{ pos: [lt - hd + v, yDno, lt - hd + v], size: [dL, Td, dD] }],
        { poznamka: `v drážkách ${zaokr(gd)} × ${hd} mm ve dolních lubech, ${DNO_POD_HORNI} mm pod horní plochou; rohy vyříznout ${zaokr(roh)} × ${zaokr(roh)} mm kolem sloupků` });
      if (yDno - yL0 < 10) varovani.push('Pod drážkou pro dno zůstane v dolním lubu méně než 10 mm dřeva – zvol vyšší lub nebo tenčí dno.');

      // --- Zavětrování: šikmá vzpěra na plocho v kapse za deskou (uvnitř), konce svisle na sraz do sloupků ---
      // vzpěra šířky bw mezi svislými řezy vzdálenými w: tg θ = (h − bw / cos θ) / w; rohy dosedají na luby
      const sklon = (w, h) => {
        let th = Math.atan(h / w);
        for (let i = 0; i < 20; i++) th = Math.atan(Math.max(0, h - bw / Math.cos(th)) / w);
        return th;
      };
      const vzpery = [];
      if (mV && p.zavetrovani !== 'prkna') {
        const steny = [
          { nazev: 'zadní', w: sL, bok: false, z: lt - bt, znam: 1 },
          { nazev: 'přední', w: sL, bok: false, z: D - lt, znam: -1 },
          { nazev: 'boční', w: sD, bok: true, x: lt - bt, znam: 1 },
          { nazev: 'boční', w: sD, bok: true, x: L - lt, znam: -1 },
        ].filter(st => p.zavetrovani === 'vsechny' || st.nazev !== 'přední');
        steny.forEach(st => {
          // plochá vzpěra přes celou stěnu vyztuží málo → dvě vzpěry do A (vrchol uprostřed horního lubu)
          const n = sklon(st.w, hSvetla) < 25 * Math.PI / 180 && sklon(st.w / 2, hSvetla) >= sklon(st.w, hSvetla) ? 2 : 1;
          const w = st.w / n, th = sklon(w, hSvetla), delka = w / Math.cos(th);
          for (let i = 0; i < n; i++) {
            // do A: první stoupá ke středu, druhá zrcadlově (rotace kolem x stoupá k −z)
            const zn = n > 1 ? (st.bok ? -1 : 1) * (i ? -1 : 1) : st.znam;
            const a0 = s + i * w, a1 = a0 + w;        // svislé řezy (po délce stěny)
            const yc = yL1 + hSvetla / 2, dl = delka + bw;
            const box = st.bok
              ? { pos: [st.x, yc - bw / 2, (a0 + a1) / 2 - dl / 2], size: [bt, bw, dl], rot: [zn * th, 0, 0], rez: [[0, 0, -1, -a0], [0, 0, 1, a1]] }
              : { pos: [(a0 + a1) / 2 - dl / 2, yc - bw / 2, st.z], size: [dl, bw, bt], rot: [0, 0, zn * th], rez: [[-1, 0, 0, -a0], [1, 0, 0, a1]] };
            vzpery.push({ st, n, th, delka, box });
          }
        });
        const pozn = (th, n) => `na plocho v kapse za deskou (uvnitř), ${n > 1 ? 'dvě do A, ' : ''}oba konce rovnoběžně svisle – pokos ${zaokr(th * 180 / Math.PI)}°, na sraz do sloupků${n > 1 ? ' a k sobě' : ''}, rohy dosednou na luby; 2 vruty šikmo do sloupku a 1 přes roh do lubu, předvrtat; k desce nelepit`;
        for (const nazev of ['zadní', 'přední', 'boční']) {
          const vs = vzpery.filter(x => x.st.nazev === nazev);
          if (vs.length) dil(`Vzpěra ${nazev}`, mV, vs[0].delka, bw, vs.length, vs.map(x => x.box), { poznamka: pozn(vs[0].th, vs[0].n) });
        }
        if (hSvetla < 2 * bw) varovani.push(`Stěna mezi luby (${zaokr(hSvetla)} mm) je na vzpěru ${bw} mm nízká – vzpěra by byla skoro vodorovná a nevyztužila by; zvol užší vzpěru nebo vyšší lavici.`);
      } else if (mV) {
        // výztužná prkna na stojato v kapse za deskou: pod horním lubem a na dolním (vejdou-li se obě),
        // s lubem slepená a sešroubovaná → široký skrytý lub, čela na sraz do sloupků
        const n = 2 * bw + 20 <= hSvetla ? 2 : 1;
        if (bw + 20 > hSvetla) varovani.push(`Výztužné prkno ${bw} mm se mezi luby (${zaokr(hSvetla)} mm) nevejde – zvol užší prkno nebo vyšší lavici.`);
        const ys = n > 1 ? [yH0 - bw, yL1] : [yH0 - bw];
        const prk = (nazev, delka, boxy) => dil(nazev, mV, delka, bw, boxy.length, boxy, { poznamka:
          `na stojato v kapse za deskou (uvnitř), ${n > 1 ? 'jedno těsně pod horním lubem, druhé na dolním' : 'těsně pod horním lubem'}; k lubu nalepit a přišroubovat skrz lub vruty á 150 mm (předvrtat), čela na sraz do sloupků + 2 vruty šikmo do sloupku z každého konce; k desce nelepit` });
        prk('Výztužné prkno – přední a zadní', sL, ys.flatMap(y => [
          { pos: [s, y, lt - bt], size: [sL, bw, bt] }, { pos: [s, y, D - lt], size: [sL, bw, bt] }]));
        prk('Výztužné prkno – boční', sD, ys.flatMap(y => [
          { pos: [lt - bt, y, s], size: [bt, bw, sD] }, { pos: [L - lt, y, s], size: [bt, bw, sD] }]));
      }

      // --- Sedák: zadní pevná část na lubech + přední sklopná, spojené klavírovým pantem po celé délce ---
      const { vD: sedD, pred, zad, uhel } = T.truhla.viko(dil, varovani, p, mT, L, D, yS, 0, { Tc: lt });
      const sedS = D + p.presahPredni;
      const vrutP = Math.max(10, Math.min(16, Ts - 4));
      dily[dily.length - 2].nazev = 'Sedák – zadní pevná část';
      dily[dily.length - 1].nazev = 'Sedák – přední sklopná část';
      dily[dily.length - 2].poznamka = `masiv, vlákno po délce; leží na zadním a bočních horních lubech, přišroubovat zespodu skrz luby (vruty šikmo, předvrtat), nelepit – masiv pracuje`;
      dily[dily.length - 1].poznamka = `masiv, vlákno po délce; klavírový pant ${zaokr(sedD)} mm po celé délce na spáru 2 mm (vruty 3 × ${vrutP} do obou dílů), nůžkový výklopník na ${uhel}°`;
      if (mT.typ === 'deska' && mT.formatS && Math.max(zad, pred) > mT.formatS - 2 * (mT.orez || 0))
        varovani.push(`Sedák je hlubší než deska ${mT.nazev} – slep ho ze dvou dílů na pero a drážku.`);
      if (zad < lt + 20) varovani.push(`Pevná část sedáku (${zaokr(zad)} mm) sotva přesahuje zadní lub (${lt} mm) – dej ji aspoň ${lt + 20} mm, ať se pant má kam přišroubovat.`);

      // --- Výkresy: luby (čepy + drážka pro dno), sloupek (dlaby, drážky) ---
      const cs = x => zaokr(x).toLocaleString('cs-CZ');
      const vykresy = [];
      const popisDr = kde => `Drážka pro stěnu ${kde}: ${cs(gw)} mm široká, ${hd} mm hluboká, ${cs(oG)} mm od vnějšího líce (${mV ? `za ní uvnitř kapsa ${bt} mm pro ${p.zavetrovani === 'prkna' ? 'výztužné prkno' : 'vzpěru'}` : 'uprostřed'}), po celé délce – vyjde v čepu.`;
      if (tupy) {
        // luby na tupo: pohled na vnitřní líc + čelo lubu (otvory pro kolíky a průřez drážek)
        const otv = (y0, osa) => hK[osa].map(k => ({ x: y0 + k * lh - KOL / 2, y: zK - KOL / 2, w: KOL, h: KOL }));
        const spojLub = koliky
          ? osa => `Na každém čele 2 otvory pro kolíky Ø${KOL} × 35 mm, hloubka 20 mm, ${cs(zK)} mm od vnějšího líce, ve výšce ${hK[osa].map(k => cs(k * lh)).join(' a ')} mm od spodní plochy (${osa === 'x' ? 'přední a zadní luby níž' : 'boční luby výš'} než ${osa === 'x' ? 'boční' : 'přední a zadní'} – ve sloupku se nesrazí). Kolíky i čela klížit.`
          : () => `Spoj se sloupkem 2 vruty 6 × 120 mm zvenku skrz sloupek do čela lubu (předvrtat Ø4, hlavu zapustit a zakrýt zátkou), čela klížit. Lub navíc drží výztužné prkno přišroubované do sloupků.`;
        for (const [nazev, sv, osa] of [['přední a zadní', sL, 'x'], ['boční', sD, 'z']]) {
          for (const dole of [false, true]) {
            const yDr = yDno - yL0 - v;
            const drazky = dole ? [{ x: 0, y: yDr, w: sv, h: gd }] : [];
            const cela = [
              ...(koliky ? otv(0, osa).map(o => ({ x: o.y, y: o.x, w: o.h, h: o.w })) : []),
              { x: oG, y: dole ? lh - hd : 0, w: gw, h: hd },
              ...(dole ? [{ x: lt - hd, y: yDr, w: hd, h: gd }] : []),
            ];
            vykresy.push({
              nazev: `${dole ? 'Dolní' : 'Horní'} lub – ${nazev}`, ks: 2, W: sv, H: lh, barva: mL.barva, odpad: [], dlaby: [], drazky, vyrezu: 0, dlabu: 0,
              detail: { w: Math.min(sv, 4 * lh), h: lh }, kotyX: [0, sv], kotyY: dole ? [0, yDr, yDr + gd, lh] : [0, lh],
              pohledy: [{ nazev: `Čelo lubu (oba konce stejně): vlevo vnější líc, ${koliky ? 'otvory pro kolíky, ' : ''}drážka pro stěnu${dole ? ' a pro dno' : ''} v průřezu`, W: lt, H: lh,
                drazky: cela, kotyX: [0, oG, oG + gw, ...(koliky ? [zK] : []), ...(dole ? [lt - hd] : []), lt], kotyY: [0, ...(koliky ? hK[osa].map(k => k * lh) : []), ...(dole ? [yDr, yDr + gd, lh - hd] : [hd]), lh].sort((a, b) => a - b) }],
              popis: [`Délka ${cs(sv)} mm = světlost mezi sloupky, oba konce kolmo. Pohled na vnitřní líc.`, spojLub(osa), popisDr(dole ? 'na horní ploše' : 'na spodní ploše').replace(' – vyjde v čepu', ', průběžná'),
                ...(dole ? [`Drážka pro dno na vnitřním líci: ${cs(gd)} mm široká, ${hd} mm hluboká, ${DNO_POD_HORNI} mm pod horní plochou, průběžná (konce zakryje sloupek).`] : [])],
            });
          }
        }
        const drazky = [{ x: yL1 - hd, y: oG, w: hSvetla + 2 * hd, h: gw }];
        const strana = osa => ({ nazev: `Strana k ${osa === 'x' ? 'přednímu a zadnímu' : 'bočnímu'} lubu: ${koliky ? `otvory pro kolíky Ø${KOL}, hloubka 17 mm, ${cs(zK)} mm od vnějšího líce` : 'bez otvorů'} – kóty od spodního konce`,
          W: yS, H: s, drazky: drazky.concat(koliky ? [...otv(yL0, osa), ...otv(yH0, osa)] : []),
          kotyX: [0, ...(koliky ? [yL0, yH0].flatMap(y0 => hK[osa].map(k => y0 + k * lh)) : [yL0, yL1, yH0]), yL1 - hd, yH0 + hd, yS], kotyY: [0, oG, oG + gw, ...(koliky ? [zK] : []), s] });
        vykresy.push({
          nazev: 'Sloupek (pohled na stranu ke stěně)', ks: 4, W: yS, H: s, barva: mS.barva, odpad: [], dlaby: [], drazky, vyrezu: 0, dlabu: 0,
          detail: { w: Math.min(yS, yL1 + 60), h: s }, kotyX: [0, yL0, yL1 - hd, yL1, yH0, yH0 + hd, yS], kotyY: [0, oG, oG + gw, s],
          pohledy: [strana('x'), strana('z')],
          popis: [
            `Délka ${cs(yS)} mm (od podlahy po spodní plochu sedáku), oba konce kolmo. Luby dosedají na tupo: dolní ${cs(yL0)}–${cs(yL1)} mm, horní ${cs(yH0)}–${cs(yS)} mm od spodního konce.`,
            koliky ? `Na obou vnitřních stranách (k lubům) otvory pro kolíky Ø${KOL}, hloubka 17 mm, ${cs(zK)} mm od vnějšího líce – výšky viz pohledy; na každé straně jinak (vystřídané). Nejlíp vrtat podle lubu se značkovači kolíků.`
              : 'Pro vruty zvenku předvrtat Ø6 skrz sloupek a zahloubit pro zátku (Ø12–15); vnější strany pak zůstanou čisté.',
            `Drážka pro stěnu ${cs(gw)} × ${hd} mm, ${cs(oG)} mm od vnějšího líce, od ${cs(yL1 - hd)} do ${cs(yH0 + hd)} mm (zastavená, ${hd} mm zajede za lub).`,
          ],
        });
      } else {
        const ramena = W => [{ x: 0, y: 0, w: cep, h: RAMENO }, { x: 0, y: lh - RAMENO, w: cep, h: RAMENO },
          { x: W - cep, y: 0, w: cep, h: RAMENO }, { x: W - cep, y: lh - RAMENO, w: cep, h: RAMENO }];
        // čepy z obou stran sloupku: dlab do hloubky cep + 2 od líce, druhý čep leží oC … oC + tc od vnějšího líce
        const prekryv = Math.max(0, oC + tc - (s - cep - 2));
        const popisCep = `Čep ${cep} mm dlouhý, ${tc} mm tlustý (posunutý k drážce, ${cs(oC)} mm od vnějšího líce) a ${cs(lh - 2 * RAMENO)} mm vysoký, osazení ${RAMENO} mm nahoře a dole; ${prekryv > 0 ? `konec čepu seříznout na pokos 45° – v sloupku by se o ${cs(prekryv)} mm potkal s čepem z druhé strany (nebo čep zkrať na ${cs(cep - prekryv)} mm).` : 'čepy z obou stran se v sloupku nepotkají, konec kolmo.'}`;
        const rezCepu = prekryv > 0 ? [{ nazev: 'Nastavení řezu', sloupce: ['Řez', 'Pila – pokos', 'Pila – úkos listu', 'Rýsování bez úhloměru (posun rysky)'],
          radky: [['Konec čepu (vnitřní roh)', '45°', '0°', `na čele čepu odměř ${cs(Math.min(tc, prekryv + 2))} mm z obou stran rohu`]] }] : [];
        for (const [nazev, sv] of [['přední a zadní', sL], ['boční', sD]]) {
          const W = sv + 2 * cep;
          vykresy.push({
            nazev: `Horní lub – ${nazev}`, ks: 2, W, H: lh, barva: mL.barva, odpad: ramena(W), dlaby: [], vyrezu: 4, dlabu: 0,
            detail: { w: Math.min(W, cep * 4), h: lh }, kotyX: [0, cep, W - cep, W], kotyY: [0, RAMENO, lh - RAMENO, lh],
            popis: [`Délka ${cs(W)} mm = světlost ${cs(sv)} mm + 2 čepy ${cep} mm. Pohled na vnitřní líc.`, popisCep, popisDr('na spodní ploše')], tabulky: rezCepu, sikmych: prekryv > 0 ? 2 : 0,
          });
          const drDno = [{ x: cep, y: yDno - yL0 - v, w: sv, h: gd }];
          vykresy.push({
            nazev: `Dolní lub – ${nazev}`, ks: 2, W, H: lh, barva: mL.barva, odpad: ramena(W), dlaby: [], drazky: drDno, vyrezu: 4, dlabu: 0,
            detail: { w: Math.min(W, cep * 4), h: lh }, kotyX: [0, cep, W - cep, W], kotyY: [0, RAMENO, yDno - yL0 - v, yDno - yL0 - v + gd, lh - RAMENO, lh],
            popis: [`Délka ${cs(W)} mm = světlost ${cs(sv)} mm + 2 čepy ${cep} mm. Pohled na vnitřní líc.`, popisCep, popisDr('na horní ploše'),
              `Drážka pro dno na vnitřním líci: ${cs(gd)} mm široká, ${hd} mm hluboká, ${DNO_POD_HORNI} mm pod horní plochou, mezi rameny čepů (zastavená).`],
            tabulky: rezCepu, sikmych: prekryv > 0 ? 2 : 0,
          });
        }
        {
          const dl = (y0, h) => ({ x: y0 + RAMENO, y: oC, w: h - 2 * RAMENO, h: tc });
          const dlaby = [dl(yL0, lh), dl(yH0, lh)];
          const drazky = [{ x: yL1 - hd, y: oG, w: hSvetla + 2 * hd, h: gw }];
          const kotyX = [0, yL0 + RAMENO, yL1 - RAMENO, yH0 + RAMENO, yS - RAMENO, yS], kotyY = [0, oC, oC + tc, oG, oG + gw, s];
          // průřez shora (levý zadní sloupek): x = k pravému sousedovi, y = dopředu; 0 = vnější líce
          const hl = cep + 2;
          vykresy.push({
            nazev: 'Sloupek (pohled na stranu ke stěně)', ks: 4, W: yS, H: s, barva: mS.barva, odpad: [], dlaby, drazky, vyrezu: 0, dlabu: 4,
            detail: { w: Math.min(yS, yL1 + 60), h: s }, kotyX, kotyY,
            pohledy: [
              { nazev: `Umístění dlabů po délce – dolní ${cs(yL0 + RAMENO)}–${cs(yL1 - RAMENO)} mm, horní ${cs(yH0 + RAMENO)}–${cs(yS - RAMENO)} mm od spodního konce`,
                W: yS, H: s, dlaby, drazky, kotyX, kotyY },
              { nazev: `Průřez ve výšce dlabu (shora): vlevo a dole vnější líce (vidět zvenku), vpravo a nahoře strany k lubům – dlaby ${cs(oC)} mm od vnějšího líce, hloubka ${hl} mm; drážka pro stěnu ústí do dlabu`,
                W: s, H: s,
                dlaby: [{ x: s - hl, y: oC, w: hl, h: tc }, { x: oC, y: s - hl, w: tc, h: hl }],
                drazky: [{ x: s - hd, y: oG, w: hd, h: gw }, { x: oG, y: s - hd, w: gw, h: hd }],
                kotyX: [0, oC, oC + tc, s - hl, s], kotyY: [0, oC, oC + tc, s - hl, s] },
            ],
            popis: [
              `Délka ${cs(yS)} mm (od podlahy po spodní plochu sedáku). Kreslena jedna ze dvou stran, kam míří luby – druhá je stejná (zrcadlově).`,
              `Na každé z obou vnitřních stran (k lubům) 2 dlaby ${cs(lh - 2 * RAMENO)} × ${tc} mm, hloubka ${hl} mm, ${cs(oC)} mm od vnějšího líce: dolní od ${cs(yL0 + RAMENO)} do ${cs(yL1 - RAMENO)} mm, horní od ${cs(yH0 + RAMENO)} do ${cs(yS - RAMENO)} mm od spodního konce. Vnější strany sloupku (vidět zvenku) zůstanou čisté.`,
              `Drážka pro stěnu ${cs(gw)} × ${hd} mm, ${cs(oG)} mm od vnějšího líce, mezi luby (od ${cs(yL1 - hd)} do ${cs(yH0 + hd)} mm) – zastavená, ústí do dlabů.`,
            ],
          });
        }

      }

      // vzpěry: rovnoběžník – oba konce svisle (v lavici), na díle šikmo pod θ; y = 0 spodní hrana
      for (const nazev of ['zadní', 'přední', 'boční']) {
        const vz = vzpery.find(x => x.st.nazev === nazev);
        if (!vz) continue;
        const ks = vzpery.filter(x => x.st.nazev === nazev).length, th = vz.th;
        const o = bw * Math.tan(th), W = vz.delka + o, deg = th * 180 / Math.PI;
        vykresy.push({
          nazev: `Vzpěra ${nazev}`, ks, W, H: bw, barva: mV.barva, dlaby: [], vyrezu: 0, dlabu: 0, sikmych: 2,
          odpad: [{ pts: [[0, 0], [o, bw], [0, bw]] }, { pts: [[vz.delka, 0], [W, 0], [W, bw]] }],
          uhly: [{ x: 0, y: 0, od: 90 - deg, do: 90, text: `${cs(deg)}°` }],
          detail: { w: Math.min(W, o + 2.5 * bw), h: bw }, detailPopis: 'Detail levého konce – šikmý řez (pravý konec rovnoběžně)', kotyX: [0, o, vz.delka, W], kotyY: [0, bw],
          postup: [
            `Nastav pokos ${cs(deg)}° (úkos listu 0°), vzpěru polož na plocho.`,
            `Seřízni první konec, odměř ${cs(vz.delka)} mm po hraně a druhý konec seřízni rovnoběžně (stejné nastavení, kus otoč) – vznikne rovnoběžník.`,
            `Bez pokosové pily: na šířce ${bw} mm posuň rysku o ${cs(o)} mm.`,
            `Vzpěru vlož do kapsy za deskou ${vz.n > 1 ? 'z dolního rohu u sloupku k vrcholu uprostřed horního lubu (dvě do A)' : 'z dolního rohu do protějšího horního'}; konce svisle na sraz${vz.n > 1 ? ' do sloupku a k druhé vzpěře' : ' do sloupků'}.`,
            'Upevni 2 vruty šikmo do sloupku a 1 vrutem přes roh do lubu, předvrtat. K desce nelepit – deska v drážce volně pracuje.',
          ],
          popis: [`Délka ${cs(vz.delka)} mm po každé dlouhé hraně (obě stejné), přířez aspoň ${cs(W)} mm. Sklon ve stěně ${cs(deg)}° od vodorovné.`],
          tabulky: [{ nazev: 'Nastavení řezu', sloupce: ['Řez', 'Pila – pokos', 'Pila – úkos listu', 'Rýsování bez úhloměru (posun rysky)'],
            radky: [['Oba konce (rovnoběžně)', `${cs(deg)}°`, '0°', `${cs(o)} mm přes šířku ${bw} mm`]] }],
        });
      }

      const kapsa = mV ? ` · ${p.zavetrovani === 'prkna' ? 'výztužná prkna' : 'vzpěry'} ${bt} × ${bw} mm uvnitř za deskou` : '';
      const objem = (L - 2 * lt) * (D - 2 * lt) * (yS - yDno - Td) / 1e6;
      const souhrn = `${zaokr(sedD)} × ${zaokr(sedS)} × ${zaokr(H)} mm (D × H × V) · rám ${s} × ${s} mm ${tupy ? (koliky ? 'luby na tupo, kolíky' : 'luby na tupo, vruty') : 'na čep a dlab'} · úložný prostor ≈ ${Math.round(objem)} l${kapsa} · kování: klavírový pant ${zaokr(sedD)} mm, nůžkový výklopník`;
      return { dily, varovani, souhrn, vykresy };
    },
  };

  // Jednoduchá varianta: bez čepů a dlabů – luby na tupo mezi sloupky na kolíky (nebo vruty), místo šikmých vzpěr
  // pravoúhlá výztužná prkna na stojato skrytá v kapse za deskou, slepená s luby a přišroubovaná do sloupků.
  const zakl = T.produkty['lavice-ram'];
  T.produkty['lavice-ram-prkna'] = {
    id: 'lavice-ram-prkna',
    nazev: 'Lavice rámová jednoduchá – luby na tupo, skrytá výztužná prkna',
    predvolby: zakl.predvolby,
    parametry: zakl.parametry
      .filter(x => x.klic !== 'zavetrovani' && x.klic !== 'cepDelka')
      .map(x => x.klic === 'matVzpera' ? Object.assign({}, x, { nazev: 'Výztužná prkna (na stojato)', vychozi: 'demos-305364', kdyz: undefined }) : x)
      .concat([
        { skupina: 'Spoje', klic: 'spoj', nazev: 'Lub ke sloupku', typ: 'volba', vychozi: 'koliky',
          moznosti: [['koliky', 'Kolíky Ø8 (neviditelné, klížené)'], ['vruty', 'Vruty zvenku skrz sloupek, zátky']] },
        { klic: 'sirkaPrkna', nazev: 'Šířka výztužného prkna', typ: 'cislo', min: 50, max: 160, krok: 5, vychozi: 80 },
      ]),
    generuj(p, M) {
      return zakl.generuj(Object.assign({}, p, { zavetrovani: 'prkna', tupy: true }), M);
    },
  };
})(window.Truhla);
