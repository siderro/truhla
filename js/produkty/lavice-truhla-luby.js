window.Truhla = window.Truhla || {};

// Truhla s luby: přední čelo a boky ze spárovky čepované jen na předních rozích, záda a dno
// z levnější desky (MDF, OSB…) v drážkách, uvnitř přední a zadní lub (nad dnem, nebo pod ním).
// Souřadnice jako u lavice-truhla: x = délka, y = výška, z = hloubka (0 = záda, roste dopředu).
(function (T) {
  'use strict';
  const { zaokr, cepu, deleni, popisDilku, postupOzubu, sokl, viko, SMRK, OSB18, OSB12, sadaDreva } = T.truhla;

  // Ozuby na konci stěny W × Hk: odpad v dílcích, které patří protikusu (sude = vyřezávají se sudé odspodu)
  function ozuby(W, b, Tp, sude, konce) {
    const r = [], n = b.length - 1;
    for (let i = sude ? 1 : 0; i < n; i += 2) {
      const h = b[i + 1] - b[i];
      if (konce.includes('L')) r.push({ x: 0, y: b[i], w: Tp, h });
      if (konce.includes('P')) r.push({ x: W - Tp, y: b[i], w: Tp, h });
    }
    return r;
  }

  function vykresy(o) {
    const { L, D, Hk, Tc, Tb, Td, Tz, hd, zap, vule, oz, n, b, Li, Wd, Dd, dnoOdspodu, mc, mb, md } = o;
    const cs = x => zaokr(x).toLocaleString('cs-CZ');
    const rysky = b;
    const vyskaDetailu = Math.min(Hk, b[Math.min(n, 5)]);
    const okraj = Math.max(Tc, Tb) * 3.5 + 50;
    const sDno = Td + vule, sZada = Tz + vule;
    const tabOzuby = sude => ({
      nazev: 'Ozuby (měřeno od spodní hrany)', zvyraznit: 5,
      sloupce: ['#', 'Od', 'Do', 'Šířka', 'Hloubka', 'Co udělat'],
      radky: Array.from({ length: n }, (_, i) => {
        const vyrez = sude ? i % 2 === 1 : i % 2 === 0;
        return [i + 1, cs(b[i]), cs(b[i + 1]), cs(b[i + 1] - b[i]), sude ? Tb : Tc, vyrez ? 'VYŘEZAT' : 'čep – ponechat'];
      }),
    });
    const tabDrazky = (nazev, d) => ({
      nazev, sloupce: ['Drážka', 'X od', 'X do', 'Y od', 'Y do', 'Šířka', 'Hloubka'],
      radky: d.map(x => [x.co, cs(x.x), cs(x.x + x.w), cs(x.y), cs(x.y + x.h), cs(x.sirka), hd]),
    });

    const drazkaCela = [{ co: 'dno', x: Tb, y: dnoOdspodu, w: Li, h: sDno, sirka: sDno }];
    // bok kreslený zevnitř, přední hrana vlevo; drážka pro dno končí u zad, drážka pro záda je otevřená nahoru
    const drazkyBoku = [
      { co: 'dno', x: Tc, y: dnoOdspodu, w: D - oz - Tc, h: sDno, sirka: sDno },
      { co: 'záda', x: D - oz - sZada, y: dnoOdspodu, w: sZada, h: Hk - dnoOdspodu, sirka: sZada },
    ];
    const rohy = [{ x: 0, y: 0, w: zap, h: zap }, { x: Wd - zap, y: 0, w: zap, h: zap }];
    const dr = dnoOdspodu > 0 ? 'drážka' : 'polodrážka (falc, dno zarovnané se spodní hranou)';

    return [
      {
        nazev: 'Přední čelo', ks: 1, W: L, H: Hk, barva: mc.barva,
        odpad: ozuby(L, b, Tb, true, 'LP'), dlaby: [], drazky: drazkaCela,
        vyrezu: 2 * Math.floor(n / 2), dlabu: 0,
        detail: { w: Math.min(L, okraj), h: vyskaDetailu },
        postup: postupOzubu({ W: L, H: Hk, Tw: Tc, Tp: Tb, b, sude: true, konce: 'Na obou koncích', protikus: 'boku', prvni: true,
          navic: [`Drážku pro dno (${cs(sDno)} mm široká, ${hd} mm hluboká, ${cs(dnoOdspodu)} mm od spodní hrany) vyfrézuj z vnitřní strany horní frézkou s pravítkem, nebo na kotoučovce víc průchody vedle sebe; zastav ji ${cs(Tb)} mm od konců, ať není vidět v čepech.`] }),
        kotyY: rysky.concat([dnoOdspodu, dnoOdspodu + sDno]), kotyX: [0, Tb],
        popis: [
          `Na každém konci ${popisDilku(b)} – vyřezávají se sudé (2., 4., …) odspodu.`,
          `Na vnitřní straně zastavená ${dr} pro dno ${cs(sDno)} × ${hd} mm mezi ozuby (od ${cs(Tb)} do ${cs(L - Tb)} mm), aby nebyla vidět na čepech.`,
        ],
        tabulky: [tabOzuby(true), tabDrazky('Drážky (vnitřní strana)', drazkaCela)],
      },
      {
        nazev: 'Bok (levý a pravý zrcadlově)', ks: 2, W: D, H: Hk, barva: mb.barva,
        odpad: ozuby(D, b, Tc, false, 'L'), dlaby: [], drazky: drazkyBoku,
        vyrezu: Math.ceil(n / 2), dlabu: 0,
        detail: { w: Math.min(D, okraj), h: vyskaDetailu },
        postup: postupOzubu({ W: D, H: Hk, Tw: Tb, Tp: Tc, b, sude: false, konce: 'Na předním konci', protikus: 'čela', prvni: false,
          navic: ['Drážky pro dno a záda frézuj až po ozubech, z vnitřní strany – levý a pravý bok jsou zrcadlové, před frézováním si vnitřní strany označ.'] }),
        kotyY: rysky.concat([dnoOdspodu, dnoOdspodu + sDno]), kotyX: [0, Tc],
        popis: [
          `Kresleno zevnitř – vlevo přední hrana s ozuby, vpravo zadní hrana (rovná).`,
          `Na předním konci ${popisDilku(b)} – vyřezávají se liché (1., 3., …) odspodu, hloubka ${Tc} mm.`,
          `${dr[0].toUpperCase() + dr.slice(1)} pro dno od ozubů (${cs(Tc)} mm) až k zádům (${cs(D - oz)} mm), ${oz > 0 ? `drážka pro záda ${cs(oz)} mm od zadní hrany` : 'polodrážka pro záda na zadní hraně'}, nahoře otevřená. Levý a pravý bok jsou zrcadlové – drážky vždy na vnitřní straně.`,
        ],
        tabulky: [tabOzuby(false), tabDrazky('Drážky (vnitřní strana, X od přední hrany)', drazkyBoku)],
      },
      {
        nazev: 'Dno (pohled shora)', ks: 1, W: Wd, H: Dd, barva: md.barva, odpad: rohy, dlaby: [], drazky: [],
        vyrezu: 2, dlabu: 0,
        detail: { w: Math.min(Wd, okraj), h: Math.min(Dd, okraj) },
        kotyX: [0, zap], kotyY: [0, zap],
        popis: [
          `Přířez ${cs(Wd)} × ${cs(Dd)} × ${Td} mm (vnitřní délka + 2 × ${cs(zap)} mm do drážek v bocích, vpředu ${cs(zap)} mm do drážky v čele; drážka je hluboká ${hd} mm, zbytek je vůle). Vzadu končí pod zády a přišroubuje se k zadnímu lubu.`,
          `Přední rohy seřízni ${cs(zap)} × ${cs(zap)} mm – drážka v boku končí u ozubů.`,
        ],
      },
    ];
  }

  const jeDeska = id => { const m = T.materialy.najdi(id); return !m || m.typ === 'deska'; };

  T.produkty['lavice-truhla-luby'] = {
    id: 'lavice-truhla-luby',
    nazev: 'Lavice-truhla s luby – doporučeno',
    predvolby: [
      sadaDreva(['matCelo', 'matBok', 'matViko', 'matZada', 'matSokl'],
        { matCelo: SMRK, matViko: SMRK, matBok: OSB18, matZada: OSB12, matDno: OSB12, matSokl: OSB18 }),
    ],
    parametry: [
      { skupina: 'Rozměry', klic: 'delka', nazev: 'Délka', typ: 'cislo', min: 400, max: 2500, krok: 10, vychozi: 1200 },
      { klic: 'hloubka', nazev: 'Hloubka', typ: 'cislo', min: 250, max: 800, krok: 10, vychozi: 400 },
      { klic: 'vyska', nazev: 'Výška sedáku (vč. víka)', typ: 'cislo', min: 250, max: 700, krok: 5, vychozi: 450 },
      { klic: 'sokl', nazev: 'Sokl', typ: 'prepinac', vychozi: true },

      // dno zůstává z OSB: masivní dno by v drážce pracovalo (bobtná napříč vláknem)
      { skupina: 'Materiál', pokrocile: true, klic: 'matCelo', nazev: 'Přední čelo', typ: 'material', vychozi: SMRK },
      { pokrocile: true, klic: 'matBok', nazev: 'Boky', typ: 'material', vychozi: SMRK },
      { pokrocile: true, klic: 'matViko', nazev: 'Víko', typ: 'material', vychozi: SMRK },
      { pokrocile: true, klic: 'matZada', nazev: 'Záda', typ: 'material', vychozi: SMRK },
      { pokrocile: true, klic: 'matDno', nazev: 'Dno (deska, ne masiv)', typ: 'material', vychozi: 'demos-00314' },
      { pokrocile: true, klic: 'matLub', nazev: 'Luby', typ: 'material', vychozi: 'demos-262642' },
      { pokrocile: true, klic: 'matSokl', nazev: 'Sokl', typ: 'material', vychozi: SMRK, kdyz: p => p.sokl },

      { skupina: 'Čepy a drážky', pokrocile: true, klic: 'cepSirka', nazev: 'Šířka čepu', typ: 'cislo', min: 15, max: 150, krok: 1, vychozi: 40 },
      { pokrocile: true, klic: 'drazkaHloubka', nazev: 'Hloubka drážky', typ: 'cislo', min: 3, max: 15, krok: 1, vychozi: 7 },
      { pokrocile: true, klic: 'drazkaVule', nazev: 'Vůle v drážce', typ: 'cislo', min: 0, max: 3, krok: 0.5, vychozi: 0.5 },
      { pokrocile: true, klic: 'dnoOdspodu', nazev: 'Dno od spodní hrany', typ: 'cislo', min: 0, max: 150, krok: 1, vychozi: 20, kdyz: p => p.lubUmisteni !== 'pod' },
      { pokrocile: true, klic: 'zadaOdsazeni', nazev: 'Záda od zadní hrany boku', typ: 'cislo', min: 0, max: 60, krok: 1, vychozi: 10 },

      { skupina: 'Luby', pokrocile: true, klic: 'lubUmisteni', nazev: 'Umístění', typ: 'volba', vychozi: 'nad',
        moznosti: [['nad', 'Uvnitř nad dnem (u čela a u zad)'], ['pod', 'Pod dnem (nesou dno, dno leží na nich)']] },
      { pokrocile: true, klic: 'lubNadDnem', nazev: 'Přední lub nad dnem', typ: 'cislo', min: 0, max: 300, krok: 5, vychozi: 0, kdyz: p => p.lubUmisteni !== 'pod' },
      { pokrocile: true, klic: 'lubVyska', nazev: 'Výška lubu', typ: 'cislo', min: 15, max: 150, krok: 1, vychozi: 60 },
      { pokrocile: true, klic: 'lubHloubka', nazev: 'Tloušťka lubu (od stěny)', typ: 'cislo', min: 15, max: 100, krok: 1, vychozi: 40, kdyz: p => !jeDeska(p.matLub) },

      { skupina: 'Víko', pokrocile: true, klic: 'vikoPevna', nazev: 'Hloubka pevné zadní části', typ: 'cislo', min: 40, max: 400, krok: 5, vychozi: 120 },
      { klic: 'presahPredni', nazev: 'Přesah vpředu', typ: 'cislo', min: 0, max: 60, krok: 1, vychozi: 20 },
      { klic: 'presahBoky', nazev: 'Přesah na bocích', typ: 'cislo', min: 0, max: 60, krok: 1, vychozi: 10 },

      { skupina: 'Sokl', pokrocile: true, klic: 'soklVyska', nazev: 'Výška soklu', typ: 'cislo', min: 30, max: 200, krok: 5, vychozi: 80, kdyz: p => p.sokl },
      { pokrocile: true, klic: 'soklOdsazeni', nazev: 'Odsazení soklu', typ: 'cislo', min: 0, max: 100, krok: 1, vychozi: 30, kdyz: p => p.sokl },
    ],

    generuj(p, M) {
      const varovani = [];
      const mat = (id, co) => {
        const m = M.najdi(id);
        if (m) return m;
        varovani.push(`Materiál pro ${co} nenalezen – použit „${M.vse()[0].nazev}“.`);
        return M.vse()[0];
      };
      const mc = mat(p.matCelo, 'čelo'), mb = mat(p.matBok, 'boky'), mv = mat(p.matViko, 'víko');
      const mz = mat(p.matZada, 'záda'), md = mat(p.matDno, 'dno'), ml = mat(p.matLub, 'luby');
      const ms = p.sokl ? mat(p.matSokl, 'sokl') : null;

      const L = p.delka, D = p.hloubka;
      const Tc = mc.tloustka, Tb = mb.tloustka, Td = md.tloustka, Tz = mz.tloustka, Tv = mv.tloustka;
      const vule = p.drazkaVule, oz = p.zadaOdsazeni;
      const pod = p.lubUmisteni === 'pod';
      const hS = p.sokl ? p.soklVyska : 0;
      const Hk = p.vyska - Tv - hS, y0 = hS;
      const Li = L - 2 * Tb;

      if (Hk < 80) varovani.push(`Stěny korpusu vychází jen ${zaokr(Hk)} mm vysoké – zvyš výšku sedáku nebo sniž sokl.`);
      if (Li <= 0 || D - Tc - oz - Tz <= 0) varovani.push('Délka nebo hloubka je na tloušťky stěn příliš malá.');

      // drážka musí ve stěně nechat aspoň 4 mm, jinak ji prořízne
      const Tmin = Math.min(Tc, Tb);
      const hd = Math.max(1, Math.min(p.drazkaHloubka, Tmin - 4));
      if (Tmin < 6) varovani.push(`Čelo/bok ${Tmin} mm je na drážku příliš tenký – zvol stěny aspoň 12 mm.`);
      else if (hd < p.drazkaHloubka) varovani.push(`Drážka ${p.drazkaHloubka} mm by v ${Tmin} mm stěně zbyla příliš tenká – zmenšena na ${hd} mm.`);
      else if (hd > Tmin / 2) varovani.push(`Drážka ${hd} mm je hlubší než polovina tloušťky čela/boku – stěna zeslábne.`);
      // dno a záda kratší o vůli na dně drážky (aby šly zasunout a měly kam pracovat)
      const vH = Math.min(Math.max(1, vule), hd / 2), zap = hd - vH;

      // --- Průřez lubů: řezivo se rozmítne, z desky se řeže pruh (tloušťka od stěny = tloušťka desky) ---
      const rezivo = ml.typ === 'rezivo';
      // průřez h × w z materiálu lubů (jedna strana u desky = tloušťka desky)
      const prurez = (h, w) => {
        const a = Math.min(h, w), b = Math.max(h, w);
        if (rezivo) {
          if (a > ml.tloustka + 0.01 || b > ml.sirka + 0.01) return { sirka: ml.sirka, chyba: true, pozn: '' };
          const r = a < ml.tloustka - 0.01 || b < ml.sirka - 0.01;
          return { sirka: ml.sirka, pozn: r ? `; rozmítnout z ${ml.tloustka} × ${ml.sirka} na ${zaokr(h)} × ${zaokr(w)} mm` : '' };
        }
        if (Math.abs(a - ml.tloustka) < 0.5) return { sirka: b, pozn: '' };
        return { sirka: b, chyba: a > ml.tloustka, pozn: a < ml.tloustka ? `; ohoblovat na ${zaokr(a)} mm` : '' };
      };
      let hL = 0, dL = rezivo ? p.lubHloubka : ml.tloustka;
      // lub se zmenší na průřez řeziva (širší strana nastojato, pokud je lub vyšší než tlustší)
      const naPrurez = () => {
        if (!rezivo || hL <= 0 || !prurez(hL, dL).chyba) return;
        const [mh, md2] = hL >= dL ? [ml.sirka, ml.tloustka] : [ml.tloustka, ml.sirka];
        varovani.push(`Lub ${zaokr(hL)} × ${zaokr(dL)} mm se nevejde do průřezu ${ml.nazev} (${ml.tloustka} × ${ml.sirka}) – zmenšen na ${zaokr(Math.min(hL, mh))} × ${zaokr(Math.min(dL, md2))} mm; pro větší lub zvol silnější řezivo.`);
        hL = Math.min(hL, mh); dL = Math.min(dL, md2);
      };

      // --- Výška dna: pod dnem leží dno přímo na lubech (stojí na spodní hraně boků), jinak dle parametru; nad dnem musí zbýt místo ---
      const dnoMax = Math.max(0, Hk - Td - 50);
      let dnoOd, hLmax;
      if (pod) {
        hLmax = dnoMax;
        hL = Math.min(p.lubVyska, hLmax);
        naPrurez();
        dnoOd = hL;
      } else {
        dnoOd = p.dnoOdspodu;
        if (dnoOd > dnoMax) {
          varovani.push(`Dno sníženo na ${zaokr(dnoMax)} mm od spodní hrany, aby nad ním zbylo aspoň 50 mm (stěny ${zaokr(Hk)} mm).`);
          dnoOd = dnoMax;
        }
      }
      if (dnoOd > 0 && dnoOd < 6) varovani.push(`Pod drážkou pro dno zbývá jen ${zaokr(dnoOd)} mm – tenký ret se ulomí; dej dno na 0 (polodrážka) nebo aspoň 6 mm.`);
      if (oz === 0) varovani.push('Záda jsou zarovnaná se zadní hranou boků – drážka bude polodrážka (falc), zezadu viditelná.');
      const yD = y0 + dnoOd;
      const Hz = Hk - dnoOd - Td;
      const maDno = Hk >= Td, maZada = Hz > 0;
      if (!pod) {
        hLmax = Math.max(0, Hz);
        hL = Math.min(p.lubVyska, hLmax);
        naPrurez();
      }
      if (!maDno) varovani.push('Stěny jsou nižší než tloušťka dna – dno, záda ani luby nejdou udělat.');

      const dily = [];
      const dil = (nazev, m, delka, sirka, pocet, boxy, extra) => dily.push(Object.assign({
        nazev, material: m.id, delka: zaokr(delka), sirka: zaokr(sirka), tloustka: m.tloustka, pocet, boxy,
      }, extra || {}));

      // --- Přední rohy: lichý počet dílků (aspoň 3), sudé patří čelu ---
      let n = Math.max(1, Math.round(Hk / p.cepSirka));
      if (n % 2 === 0) n += Hk / n > p.cepSirka ? 1 : -1;
      if (n < 3) {
        n = 3;
        varovani.push(`Šířka čepu upravena na ${zaokr(Hk / 3)} mm, aby na rohu vyšly aspoň 3 dílky (jinak by byl spoj jen na tupo).`);
      }
      const b = deleni(Hk, n);

      const zC = D - Tc;
      const celoBoxy = [{ pos: [Tb, y0, zC], size: [Li, Hk, Tc] }];
      for (let i = 0; i < n; i += 2) {
        celoBoxy.push({ pos: [0, y0 + b[i], zC], size: [Tb, b[i + 1] - b[i], Tc] });
        celoBoxy.push({ pos: [L - Tb, y0 + b[i], zC], size: [Tb, b[i + 1] - b[i], Tc] });
      }
      const bokBoxy = [];
      for (const x of [0, L - Tb]) {
        bokBoxy.push({ pos: [x, y0, 0], size: [Tb, Hk, zC] });
        for (let i = 1; i < n; i += 2) bokBoxy.push({ pos: [x, y0 + b[i], zC], size: [Tb, b[i + 1] - b[i], Tc] });
      }
      const drazkaSlovo = dnoOd > 0 ? 'drážka' : 'polodrážka (falc)';
      dil('Přední čelo', mc, L, Hk, 1, celoBoxy,
        { poznamka: `${cepu((n + 1) / 2)} na každém konci, ${popisDilku(b)}, hloubka ${Tb} mm; ${drazkaSlovo} pro dno` });
      dil('Bok', mb, D, Hk, 2, bokBoxy,
        { poznamka: `${cepu((n - 1) / 2)} vpředu, hloubka ${Tc} mm; ${drazkaSlovo} pro dno a ${oz > 0 ? 'drážka' : 'polodrážka'} pro záda (levý a pravý zrcadlově)` });

      // --- Luby mezi boky: přední za čelem, zadní u zad (nad dnem před zády, pod dnem pod nimi) ---
      const maLuby = maDno && hL >= 15;
      const zZadni = pod ? oz : oz + Tz;
      let yLp = 0, yLz = 0, kde = '', lub = null;
      if (!maLuby) {
        varovani.push(`${pod ? 'Pod dnem' : 'Nad dnem'} není místo na lub – luby vynechány, zadní hranu dna podepři lištou přišroubovanou k bokům.`);
      } else {
        if (p.lubVyska > hLmax) varovani.push(`Lub ${p.lubVyska} mm se nevejde ${pod ? `pod dno (nad dnem musí zbýt aspoň 50 mm, stěny ${zaokr(Hk)} mm)` : `do vnitřní výšky ${zaokr(Hz)} mm`} – zmenšen na ${zaokr(hLmax)} mm.`);
        if (pod) {
          yLp = yLz = y0;   // dno leží přímo na lubech (dnoOd = hL)
          kde = 'pod dnem, spodní hranou v rovině boků (dno na ně shora přišroubovat)';
        } else {
          // zadní lub vždy na dně – nese zadní hranu dna, která nemá drážku
          yLz = yD + Td;
          const nad = Math.min(p.lubNadDnem, Hz - hL);
          if (nad < p.lubNadDnem) varovani.push(`Přední lub posunut na ${zaokr(nad)} mm nad dnem, aby nepřečníval horní hranu.`);
          yLp = yD + Td + nad;
          kde = nad > 0 ? `přední ${zaokr(nad)} mm nad dnem, zadní na dně` : 'na dně';
        }
        // přední a zadní lub se nesmí potkat
        const mezera = zC - zZadni;
        if (2 * dL > mezera && Math.abs(yLp - yLz) < hL) {
          if (rezivo) {
            varovani.push(`Luby ${zaokr(dL)} mm se mezi čelo a záda nevejdou – zúženy na ${zaokr(Math.floor(mezera / 2))} mm.`);
            dL = Math.floor(mezera / 2);
          } else varovani.push('Přední a zadní lub se mezi čelem a zády překrývají – zvětši hloubku.');
        }
        const pr = prurez(hL, dL);   // u řeziva je v kusovníku celý průřez řeziva
        lub = ['Lub přední + zadní', ml, Li, pr.sirka, 2, [
          { pos: [Tb, yLp, zC - dL], size: [Li, hL, dL] },
          { pos: [Tb, yLz, zZadni], size: [Li, hL, dL] },
        ], { poznamka: `${kde}, ${zaokr(hL)} × ${zaokr(dL)} mm${pr.pozn}; přišroubovat k bokům, přední k čelu, zadní k zádům${pod ? '' : '; dno zespodu přišroubovat do zadního lubu'}` }];
      }

      // --- Dno v drážkách čela a boků, vzadu končí pod zády a leží na zadním lubu ---
      const Wd = Li + 2 * zap, Dd = zC + zap - oz;
      if (maDno) dil('Dno', md, Wd, Dd, 1, [
        { pos: [Tb, yD, oz], size: [Li, Td, Dd] },
        { pos: [Tb - zap, yD, oz], size: [zap, Td, zC - oz] },
        { pos: [L - Tb, yD, oz], size: [zap, Td, zC - oz] },
      ], { poznamka: `v ${dnoOd > 0 ? 'drážce' : 'polodrážce'} ${hd} mm (o ${zaokr(vH)} mm na každé straně kratší), přední rohy seříznout ${zaokr(zap)} × ${zaokr(zap)} mm${maLuby ? '; zadní hranu přišroubovat do zadního lubu' : ''}` });

      // --- Záda v drážkách boků, stojí na dně ---
      if (maDno && maZada) dil('Záda', mz, Wd, Hz, 1, [
        { pos: [Tb - zap, yD + Td, oz], size: [Wd, Hz, Tz] },
      ], { poznamka: `v ${oz > 0 ? 'drážkách' : 'polodrážkách'} boků ${hd} mm, ${oz} mm od zadní hrany, stojí na dně${maLuby && !pod ? '; dole přišroubovat k zadnímu lubu' : ''}` });

      if (lub) dil(...lub);

      // --- Sokl: kde na něm nestojí stěna ani lub, dostane nosnou lištu pod dno.
      // Lišta sahá od vnitřní plochy stěny (resp. od lubu) přes celý sokl, ke stěně se přišroubuje – stěny tak nesou přes ni, ne jen přes drážku.
      if (ms) {
        const naSpodu = dily.flatMap(d => d.boxy).filter(b => Math.abs(b.pos[1] - y0) < 0.01);
        const sv = sokl(dil, p, ms, L, D);
        varovani.push(...sv);
        const o = sv.odsazeni, Ts = ms.tloustka;   // skutečné odsazení (sokl ho u mělké truhly zmenší)
        const lubDole = pod && !!lub;
        const zMin = lubDole ? zZadni + dL : oz, zMax = lubDole ? zC - dL : zC;
        const ramy = [
          { co: 'přední', podel: true, x: [o, L - o], z: [D - o - Ts, D - o], lx: [Tb, L - Tb], lz: [D - o - Ts, zMax], k: lubDole ? 'přednímu lubu' : 'čelu' },
          { co: 'zadní', podel: true, x: [o, L - o], z: [o, o + Ts], lx: [Tb, L - Tb], lz: [zMin, o + Ts], k: lubDole ? 'zadnímu lubu' : 'bokům' },
          { co: 'levá', x: [o, o + Ts], z: [o + Ts, D - o - Ts], lx: [Tb, o + Ts], lz: [Math.max(o + Ts, zMin), Math.min(D - o - Ts, zMax)], k: 'boku' },
          { co: 'pravá', x: [L - o - Ts, L - o], z: [o + Ts, D - o - Ts], lx: [L - o - Ts, L - Tb], lz: [Math.max(o + Ts, zMin), Math.min(D - o - Ts, zMax)], k: 'boku' },
        ];
        const pres = (a, b0, b1) => Math.min(a[1], b1) - Math.max(a[0], b0) > 0.01;
        const lezi = r => naSpodu.some(b => pres(r.x, b.pos[0], b.pos[0] + b.size[0]) && pres(r.z, b.pos[2], b.pos[2] + b.size[2]));
        const hLi = yD - y0;
        const listy = new Map(), nic = [];
        let tenka = false;
        for (const r of ramy) {
          if (r.x[1] - r.x[0] <= 0 || r.z[1] - r.z[0] <= 0 || lezi(r)) continue;
          const { lx, lz } = r;
          // lišta jen pod plochou dna a jen tam, kde leží na soklu
          if (!maDno || hLi <= 0 || lx[1] - lx[0] <= 0.01 || lz[1] - lz[0] <= 0.01 || !pres(lx, r.x[0], r.x[1]) || !pres(lz, r.z[0], r.z[1])) { nic.push(r.co); continue; }
          if (hLi < 6) { tenka = true; nic.push(r.co); continue; }
          // vlákno po delší straně (krátký široký špalík u mělkého soklu se řeže napříč)
          const a = r.podel ? lx[1] - lx[0] : lz[1] - lz[0], b = r.podel ? lz[1] - lz[0] : lx[1] - lx[0];
          const del = Math.max(a, b), w = Math.min(a, b);
          const klic = zaokr(del) + '×' + zaokr(w);
          if (!listy.has(klic)) listy.set(klic, { del, w, boxy: [], co: [], k: r.k });
          listy.get(klic).boxy.push({ pos: [lx[0], y0, lz[0]], size: [lx[1] - lx[0], hLi, lz[1] - lz[0]] });
          listy.get(klic).co.push(r.co);
        }
        const nejde = [];
        for (const { del, w, boxy, co, k } of listy.values()) {
          const pr = prurez(hLi, w);
          if (pr.chyba) nejde.push(`${zaokr(hLi)} × ${zaokr(w)}`);
          dil(`Nosná lišta na soklu (${co.join(' + ')})`, ml, del, pr.sirka, boxy.length, boxy,
            { poznamka: `${zaokr(hLi)} × ${zaokr(w)} mm${pr.pozn}; leží na soklu, přišroubovat k ${k}, dno na ni přišroubovat` });
        }
        if (nejde.length) varovani.push(`Nosné lišty ${[...new Set(nejde)].join(', ')} mm nejdou vyrobit z ${ml.nazev} (materiál lubů) – zvol silnější řezivo nebo zmenši odsazení soklu.`);
        if (tenka) varovani.push(`Mezera ${zaokr(hLi)} mm mezi soklem a dnem je na nosnou lištu moc malá – dej dno na 0 mm nebo aspoň 6 mm od spodní hrany.`);
        else if (nic.length) varovani.push(`Sokl (${nic.join(', ')}) nic nenese – neleží pod stěnou ani pod dnem; uprav odsazení soklu nebo zad.`);
      }

      // desková díla z řeziva: kolik lamel sklížit
      for (const d of dily) {
        const m = M.najdi(d.material);
        if (!['Přední čelo', 'Bok', 'Dno', 'Záda'].includes(d.nazev) || !m || m.typ !== 'rezivo' || d.sirka <= m.sirka) continue;
        const k = Math.ceil(d.sirka / m.sirka);
        d.poznamka += `; sklížit z ${k} lamel`;
        varovani.push(`${d.nazev} (šířka ${zaokr(d.sirka)} mm) je z řeziva ${m.nazev} – je potřeba sklížit z ${k} lamel.`);
      }

      const { vD, pp } = viko(dil, varovani, p, mv, L, D, y0 + Hk, 0, { Tc });

      const Di = zC - oz - Tz;
      const objem = Li > 0 && Di > 0 && Hz > 0 ? (Li * Di * Hz) / 1e6 : 0;
      const souhrn = `${zaokr(vD)} × ${zaokr(D + pp)} × ${zaokr(p.vyska)} mm (D × H × V) · úložný prostor ${zaokr(Math.max(0, Li))} × ${zaokr(Math.max(0, Di))} × ${zaokr(Math.max(0, Hz))} mm ≈ ${Math.round(objem)} l · na rohu ${popisDilku(b)}`;

      return {
        dily, varovani, souhrn,
        vykresy: vykresy({ L, D, Hk, Tc, Tb, Td, Tz, hd, zap, vule, oz, n, b, Li, Wd, Dd, dnoOdspodu: dnoOd, mc, mb, md }),
      };
    },
  };
})(window.Truhla);
