window.Truhla = window.Truhla || {};

// Dřevník: sloupky na podlahovém rámu, pozednice vpředu a vzadu, pultová střecha se spádem kterýmkoli směrem
// (i rovná), krokve s osedláním na pozednicích, latě, čelní a závětrná prkna, pásky 45°, obklad z prken s mezerou.
// Souřadnice v mm: x = délka (zleva), y = výška (od země), z = hloubka (0 = záda, roste dopředu).
// Střecha se počítá v rovině krokví: u = podél krokve od zadního konce, v = kolmo nahoru od spodní hrany krokve.
(function (T) {
  'use strict';
  const zaokr = x => Math.round(x * 10) / 10;
  const S45 = Math.SQRT2;
  const RAMENO = 15;                               // osazení čepu z úzkých stran
  const SLOUPCE_REZU = ['Řez', 'Pila – pokos', 'Pila – úkos listu', 'Rýsování bez úhloměru (posun rysky)'];

  // Rozdělí délku na kusy nejvýš max dlouhé se spoji jen v místech `spoje` (od začátku); null = nejde.
  // Spoj se volí co nejblíž rovnoměrnému dělení; posun = vzít sousední možný spoj (střídání spojů ob prkno)
  function rozdel(celkem, spoje, max, posun = 0) {
    if (celkem <= max) return [celkem];
    const kusy = [];
    let od = 0;
    while (celkem - od > max) {
      const moz = spoje.filter(s => s > od + 1 && s < celkem - 1 && s - od <= max);
      if (!moz.length) return null;
      const cil = od + (celkem - od) / Math.ceil((celkem - od) / max);
      let i = moz.reduce((b, s, j) => Math.abs(s - cil) < Math.abs(moz[b] - cil) ? j : b, 0);
      // střídání: sousední spoj, přednostně ten, který dá delší kus
      if (posun % 2) i = moz[i] <= cil && i + 1 < moz.length ? i + 1 : i > 0 ? i - 1 : Math.min(i + 1, moz.length - 1);
      const s = moz[i];
      kusy.push(s - od);
      od = s;
    }
    kusy.push(celkem - od);
    return kusy;
  }

  // natočený kvádr: zadaný středem, rozměrem a rotací (viewer otáčí kolem středu)
  const sikmy = (stred, size, rot) => ({ pos: stred.map((c, i) => c - size[i] / 2), size, rot });

  T.produkty.drevnik = {
    id: 'drevnik',
    nazev: 'Dřevník',
    podtitul: 'přístřešek s pultovou střechou, sloupky a pozednice',
    narocnost: 2,
    kategorie: 'dilna',
    // materiálové varianty: hrubé řezivo z pily, nebo KVH (hoblované, sušené, rovné – dražší)
    predvolby: [{ skupina: 'Materiál a cena', moznosti: [
      { nazev: 'Hrubé řezivo', popis: 'smrkové hranoly a fošny z pily – nejlevnější, nehoblované, vlhké (sesychá a kroutí se)',
        params: { matSloupek: 'demos-262639', matPozednice: 'demos-262649', matKrokev: 'demos-308043', matRam: 'demos-262639', matPaska: 'demos-262659' } },
      { nazev: 'KVH', popis: 'konstrukční hranoly KVH – hoblované, sušené, rovné a bez trhlin; nosné prvky dražší',
        params: { matSloupek: 'demos-262528', matPozednice: 'demos-262528', matKrokev: 'demos-404466', matRam: 'demos-262528', matPaska: 'demos-262544' } },
    ] }],
    parametry: [
      { skupina: 'Rozměry', klic: 'delka', nazev: 'Délka', typ: 'cislo', min: 1500, max: 8000, krok: 50, vychozi: 3000 },
      { klic: 'hloubka', nazev: 'Hloubka', typ: 'cislo', min: 600, max: 2500, krok: 10, vychozi: 1200 },
      { klic: 'vyskaPredni', nazev: 'Výška vpředu', napoveda: 'horní hrana pozednice', typ: 'cislo', min: 1200, max: 3200, krok: 10, vychozi: 2200 },
      { klic: 'vyskaZadni', nazev: 'Výška vzadu', napoveda: 'horní hrana pozednice', typ: 'cislo', min: 1000, max: 3200, krok: 10, vychozi: 1900 },
      { pokrocile: true, klic: 'rozponMax', nazev: 'Největší rozpon pole', skupina: 'Nosná konstrukce', typ: 'cislo', min: 800, max: 3000, krok: 50, vychozi: 1600 },

      { skupina: 'Materiál', pokrocile: true, klic: 'matSloupek', nazev: 'Sloupky', typ: 'material', vychozi: 'demos-262639' },
      { pokrocile: true, klic: 'matPozednice', nazev: 'Pozednice a boční příčle', typ: 'material', vychozi: 'demos-262649' },
      { pokrocile: true, klic: 'matKrokev', nazev: 'Krokve', typ: 'material', vychozi: 'demos-308043' },
      { pokrocile: true, klic: 'matLat', nazev: 'Střešní latě', napoveda: 'na plocho', typ: 'material', vychozi: 'demos-262642' },
      { pokrocile: true, klic: 'matCelo', nazev: 'Čelní a závětrná prkna', typ: 'material', vychozi: 'demos-305364' },
      { pokrocile: true, klic: 'matObklad', nazev: 'Obklad stěn', typ: 'material', vychozi: 'demos-305364' },
      { pokrocile: true, klic: 'matRam', nazev: 'Podlahový rám', typ: 'material', vychozi: 'demos-262639', kdyz: p => p.podlaha },
      { pokrocile: true, klic: 'matPodlaha', nazev: 'Podlaha', typ: 'material', vychozi: 'demos-305364', kdyz: p => p.podlaha },
      { pokrocile: true, klic: 'matPaska', nazev: 'Pásky', typ: 'material', vychozi: 'demos-262659', kdyz: p => p.pasky },

      { skupina: 'Střecha', pokrocile: true, klic: 'roztecKrokvi', nazev: 'Rozteč krokví', typ: 'cislo', min: 300, max: 1000, krok: 10, vychozi: 600 },
      { pokrocile: true, klic: 'roztecLati', nazev: 'Rozteč latí', napoveda: 'podle krytiny', typ: 'cislo', min: 200, max: 1000, krok: 10, vychozi: 500 },
      { pokrocile: true, klic: 'presahPredni', nazev: 'Přesah vpředu', typ: 'cislo', min: 0, max: 800, krok: 10, vychozi: 300 },
      { pokrocile: true, klic: 'presahZadni', nazev: 'Přesah vzadu', typ: 'cislo', min: 0, max: 600, krok: 10, vychozi: 150 },
      { pokrocile: true, klic: 'presahBoky', nazev: 'Přesah na bocích', typ: 'cislo', min: 0, max: 600, krok: 10, vychozi: 150 },

      { skupina: 'Podlaha', klic: 'podlaha', nazev: 'Podlaha', napoveda: 'na rámu', typ: 'prepinac', vychozi: true },
      { pokrocile: true, klic: 'roztecTramku', nazev: 'Rozteč příčných trámků', typ: 'cislo', min: 300, max: 1200, krok: 10, vychozi: 600, kdyz: p => p.podlaha },
      { pokrocile: true, klic: 'mezeraPodlaha', nazev: 'Mezera mezi prkny podlahy', typ: 'cislo', min: 0, max: 50, krok: 1, vychozi: 10, kdyz: p => p.podlaha },

      { skupina: 'Obklad', klic: 'obklad', nazev: 'Obklad', typ: 'volba', vychozi: 'zada',
        moznosti: [['zada', 'Jen zadní stěnu'], ['zadaBoky', 'Zadní stěnu a boky'], ['zadny', 'Bez obkladu']] },
      { pokrocile: true, klic: 'mezeraObklad', nazev: 'Mezera mezi prkny', typ: 'cislo', min: 0, max: 80, krok: 1, vychozi: 20, kdyz: p => p.obklad !== 'zadny' },
      { pokrocile: true, klic: 'obkladStit', nazev: 'Obložit i štít', napoveda: 'svislá prkna až pod střechu', sekce: 'provedeni', typ: 'prepinac', vychozi: true, kdyz: p => p.obklad === 'zadaBoky' },

      { skupina: 'Pásky', klic: 'pasky', nazev: 'Pásky', napoveda: 'šikmé vzpěry 45°', typ: 'prepinac', vychozi: true },
      { pokrocile: true, klic: 'paskyZadni', nazev: 'Pásky i v zadní řadě', sekce: 'provedeni', typ: 'prepinac', vychozi: true, kdyz: p => p.pasky },
      { pokrocile: true, klic: 'paskyBoky', nazev: 'Pásky i na bocích', sekce: 'provedeni', typ: 'prepinac', vychozi: true, kdyz: p => p.pasky },
      { pokrocile: true, klic: 'paskaRameno', nazev: 'Rameno pásku', typ: 'cislo', min: 200, max: 1000, krok: 10, vychozi: 400, kdyz: p => p.pasky },
    ],

    generuj(p, M) {
      const varovani = [];
      const mat = (id, co) => {
        const m = M.najdi(id);
        if (m) return m;
        varovani.push(`Materiál pro ${co} nenalezen – použit „${M.vse()[0].nazev}“.`);
        return M.vse()[0];
      };
      const mS = mat(p.matSloupek, 'sloupky'), mP = mat(p.matPozednice, 'pozednice');
      const mK = mat(p.matKrokev, 'krokve'), mO = mat(p.matObklad, 'obklad');
      const mL = mat(p.matLat || 'demos-262642', 'latě'), mC = mat(p.matCelo || p.matObklad, 'čelní prkna');
      const mR = p.podlaha ? mat(p.matRam, 'podlahový rám') : null;
      const mF = p.podlaha ? mat(p.matPodlaha, 'podlahu') : null;
      const mA = p.pasky ? mat(p.matPaska, 'pásky') : null;
      // průřez řeziva: tloustka × sirka; u desky z knihovny se šířka nahradí tloušťkou
      const sir = m => m.sirka || m.tloustka;
      const maxDelka = m => m.typ === 'rezivo' ? m.delka - M.nastaveni().pridavekDelka : Infinity;

      const L = p.delka, D = p.hloubka, Hp = p.vyskaPredni, Hz = p.vyskaZadni;
      const H1 = Math.min(Hp, Hz);                  // nižší pozednice
      const sx = mS.tloustka, sz = sir(mS);       // sloupek
      const pw = mP.tloustka, ph = sir(mP);       // pozednice a příčle: šířka × výška (na stojato)
      const kb = mK.tloustka, kh = sir(mK);       // krokev na stojato
      const lt = mL.tloustka, lw = sir(mL);       // lať na plocho
      const ct = mC.tloustka, cb = sir(mC);       // čelní a závětrné prkno nastojato
      const ot = mO.tloustka, ob = sir(mO);       // prkno obkladu
      const cep = Math.max(20, Math.min(40, Math.round(Math.min(sx, sz, ph) * 0.4)));   // délka čepu
      const tcS = Math.round(sx / 3);                           // tloušťka čepu sloupku
      const tcP = Math.round(Math.min(pw, sx) / 3);             // tloušťka čepu příčle
      const zC = Math.min(pw, sz);                              // na tuto hloubku sloupek dosedá pod pozednici

      const dily = [];
      const skupiny = new Map();
      // jeden fyzický kus; stejné kusy se v kusovníku sečtou
      function kus(nazev, m, delka, box, extra) {
        const k = [nazev, m.id, zaokr(delka)].join('|');
        let d = skupiny.get(k);
        if (!d) {
          d = Object.assign({ nazev, material: m.id, delka: zaokr(delka), sirka: sir(m), tloustka: m.tloustka, pocet: 0, boxy: [] }, extra || {});
          skupiny.set(k, d);
          dily.push(d);
        }
        d.pocet++;
        d.boxy.push(box);
      }

      // --- Rozvržení polí: sloupky rovnoměrně ---
      const nP = Math.max(1, Math.ceil((L - sx) / p.rozponMax));
      const sloupkyX = Array.from({ length: nP + 1 }, (_, i) => i * (L - sx) / nP);
      const osySloupku = sloupkyX.map(x => x + sx / 2);
      const napojene = new Map();
      // podélný prvek od x0 délky celkem; spoje jen v místech `spoje` (absolutní x), kde má prvek podporu
      function podelny(nazev, m, x0, celkem, box, extra, spoje, kde, posun = 0) {
        const max = maxDelka(m);
        let kusy = rozdel(celkem, spoje.map(s => s - x0), max, posun);
        if (!kusy) {
          const n = Math.ceil(celkem / max);
          kusy = Array(n).fill(celkem / n);
          varovani.push(`${nazev}: ${zaokr(celkem)} mm je delší než obchodní délka řeziva a spoj nejde dát na ${kde} – zvol delší materiál (teď spoj mimo podporu).`);
        } else if (kusy.length > 1) napojene.set(nazev, kde);
        let x = x0;
        kusy.forEach(l => { kus(nazev, m, l, box(x, l), extra); x += l; });
      }

      // --- Podlahový rám a podlaha ---
      let yF = 0, patka = 0;
      if (mR) {
        const rw = mR.tloustka, rh = sir(mR);
        const fb = sir(mF), ft = mF.tloustka, mez = p.mezeraPodlaha;
        patka = rh;
        yF = rh + ft;
        if (rw < sz) varovani.push(`Podélný trám rámu (${rw} mm) je užší než sloupek (${sz} mm) – sloupek by přečníval o ${zaokr(sz - rw)} mm; zvol trám aspoň tak široký jako sloupek.`);
        for (const z of [0, D - rw]) {
          podelny('Rám – podélný trám', mR, 0, L, (x, l) => ({ pos: [x, 0, z], size: [l, rh, rw] }),
            { poznamka: 'přední + zadní, na tom stojí sloupky (dlaby pro čepy sloupků)' }, osySloupku, 'sloupek');
        }
        const nJ = Math.max(2, Math.ceil((L - rw) / p.roztecTramku) + 1);
        const tramkyX = Array.from({ length: nJ }, (_, j) => j * (L - rw) / (nJ - 1));
        tramkyX.forEach(x => kus('Rám – příčný trámek', mR, D - 2 * rw, { pos: [x, 0, rw], size: [rw, rh, D - 2 * rw] },
          { poznamka: `rozteč ${zaokr((L - rw) / (nJ - 1))} mm, mezi podélné trámy` }));
        // celá prkna, mezera se rozpočítá (nejméně zadaná); spoje na trámcích, ob prkno vystřídané
        const nB = Math.max(1, Math.floor((D + mez) / (fb + mez)));
        const mezera = nB > 1 ? (D - nB * fb) / (nB - 1) : 0;
        for (let k = 0; k < nB; k++) {
          const z = k * (fb + mezera);
          podelny('Podlaha – prkno', mF, 0, L, (x, l) => ({ pos: [x, rh, z], size: [l, ft, fb] }),
            { poznamka: `mezera ${zaokr(mezera)} mm; spoje na trámcích střídat; u sloupků vyříznout zářez` },
            tramkyX.map(x => x + rw / 2), 'příčný trámek', k % 2);
        }
      }

      // --- Sloupky: pozednice leží na nich, nahoře čep do pozednice, dole do rámu ---
      const hPp = Hp - ph - patka, hPz = Hz - ph - patka;
      const pridCep = cep + (mR ? cep : 0);
      const zCR = mR ? Math.min(mR.tloustka, sz) : 0;            // šířka dolního čepu (do podélného trámu rámu)
      if (sz > pw) varovani.push(`Sloupek (${sz} mm) je hlubší než pozednice (${pw} mm) – přečnívá pod ní dovnitř o ${zaokr(sz - pw)} mm a čep jde jen na šířku pozednice; zvol pozednici aspoň tak širokou jako sloupek.`);
      const hMin = Math.min(hPp, hPz);
      if (hMin < 600) varovani.push(`${hPp < hPz ? 'Přední' : 'Zadní'} sloupky vychází jen ${zaokr(hMin)} mm – zvyš výšku ${hPp < hPz ? 'vpředu' : 'vzadu'}.`);
      const svetlaVpredu = Hp - ph - yF;
      if (svetlaVpredu < 1100) varovani.push(`Vpředu je pod pozednicí jen ${zaokr(svetlaVpredu)} mm – dříví se tam bude skládat špatně.`);
      const poznS = `včetně čepů ${cep} mm (nahoře do pozednice${mR ? ', dole do rámu' : ''})${mR ? '' : ', patu kotvit do patky'}`;
      sloupkyX.forEach(x => {
        kus('Sloupek přední', mS, hPp + pridCep, { pos: [x, patka, D - sz], size: [sx, hPp, sz] }, { poznamka: poznS });
        kus('Sloupek zadní', mS, hPz + pridCep, { pos: [x, patka, 0], size: [sx, hPz, sz] }, { poznamka: poznS });
      });

      // --- Krokve: rozmístění. Krajní krokve nad bočními stěnami (x = 0 a L − kb), při přesahu i na krajích střechy ---
      const pb = p.presahBoky;
      const kraj = pb >= kb + Math.max(50, ot);     // samostatná krajní krokev na přesahu (pozednice se prodlouží)
      const pp = kraj ? pb : 0;                     // přesah pozednic přes krajní sloupky
      if (pb > 0 && !kraj) varovani.push(`Přesah na bocích ${pb} mm je menší než ${kb + Math.max(50, ot)} mm – nedává se krajní krokev, přesah tvoří latě vyložené za krokev nad stěnou.`);
      if (pp > 400) varovani.push(`Pozednice přečnívá přes krajní sloupek o ${pp} mm – zvaž menší přesah na bocích nebo silnější pozednici.`);
      const krokveX = [];
      const rozmisti = (a, b) => {
        const n = Math.max(1, Math.ceil((b - a) / p.roztecKrokvi));
        for (let i = 0; i <= n; i++) {
          const x = a + i * (b - a) / n;
          if (!krokveX.some(k => Math.abs(k - x) < 1)) krokveX.push(x);
        }
      };
      if (kraj) rozmisti(-pb, 0);
      rozmisti(0, L - kb);
      if (kraj) rozmisti(L - kb, L + pb - kb);
      krokveX.sort((a, b) => a - b);
      const osyKrokvi = krokveX.map(x => x + kb / 2);
      const roztecK = Math.max(...krokveX.slice(1).map((x, i) => x - krokveX[i]));

      // --- Pozednice (přes krajní sloupky o přesah) a boční příčle pod nižší pozednicí ---
      podelny('Pozednice přední', mP, -pp, L + 2 * pp, (x, l) => ({ pos: [x, Hp - ph, D - pw], size: [l, ph, pw] }),
        { poznamka: `dlaby pro čepy sloupků${pp ? `; přesah ${pp} mm přes krajní sloupek nese krajní krokev` : ''}` }, osySloupku, 'sloupek');
      podelny('Pozednice zadní', mP, -pp, L + 2 * pp, (x, l) => ({ pos: [x, Hz - ph, 0], size: [l, ph, pw] }),
        { poznamka: `dlaby pro čepy sloupků${pp ? `; přesah ${pp} mm přes krajní sloupek nese krajní krokev` : ''}` }, osySloupku, 'sloupek');
      const yR1 = H1 - ph, yR0 = yR1 - ph;          // příčle: horní hrana = vršek nižšího sloupku
      const svetlostD = D - 2 * sz;
      const wR = Math.min(pw, sx);
      if (pw > sx) varovani.push(`Pozednice/příčle (${pw} mm) je širší než sloupek (${sx} mm) – příčle bude přečnívat.`);
      sloupkyX.forEach((x, i) => {
        // krajní příčle lícují s vnějškem sloupku (na ně se přibíjí obklad boku), vnitřní na střed
        const xr = i === 0 ? x : i === nP ? x + sx - pw : x + (sx - pw) / 2;
        kus('Boční příčle', mP, svetlostD + 2 * cep, { pos: [xr, yR0, sz], size: [pw, ph, svetlostD] },
          { poznamka: `mezi předním a zadním sloupkem pod nižší pozednicí, čepy ${cep} mm do obou sloupků` });
      });

      // --- Pásky 45°: konce navzájem kolmé (jeden svisle na líc sloupku, druhý vodorovně pod pozednici či příčli),
      // díl je rovnoramenný lichoběžník. Kvádr delší o rezervu, seříznutý rovinou líce sloupku a spodní plochy nosníku.
      const zkracene = [];
      const paskyA = new Map();                     // rameno → {ks, nazvy} pro výkresy (stejné rameno = stejný kus)
      let vynechane = false, at = 0;
      if (mA) {
        // at = tloušťka v rovině pásku, aw = šířka napříč; širší stranou do roviny, když by napříč přečníval sloupek
        let aw = sir(mA);
        at = mA.tloustka;
        if (aw > Math.min(sx, sz) && at < aw) [at, aw] = [aw, at];
        if (aw > Math.min(sx, sz)) varovani.push(`Pásek (${aw} mm) je širší než sloupek (${Math.min(sx, sz)} mm) – bude přečnívat přes líc.`);
        const svetlostPole = (L - sx) / nP - sx;
        const rameno = (svetlost, yHorni, co) => {
          const a = Math.floor(Math.min(p.paskaRameno, (svetlost - at * S45 - 20) / 2, (yHorni - yF - 20) / 2));
          if (a < p.paskaRameno) zkracene.push(`${co} ${Math.max(0, a)} mm`);
          return a;
        };
        // rameno a = od rohu (líc sloupku × spodní plocha nosníku) k ose pásku; rez = roviny líce sloupku a spodní plochy
        const pasek = (nazev, a, stred, rot, sizeOsa, rez) => {
          if (a < 100) { vynechane = true; return; }
          const delka = a * S45 + at;                 // na dlouhé hraně
          const g = paskyA.get(a) || { ks: 0, nazvy: new Set() };
          g.ks++; g.nazvy.add(nazev); paskyA.set(a, g);
          kus(nazev, mA, delka, Object.assign(sikmy(stred, sizeOsa(delka + at), rot), { rez }),
            { poznamka: `rameno ${a} mm, konce pod 45° navzájem kolmé (lichoběžník, krátká hrana ${zaokr(delka - 2 * at)} mm), přišroubovat do sloupku a do ${nazev === 'Pásek boční' ? 'příčle' : 'pozednice'}` });
        };
        const podelnePasky = (nazev, yT, zc) => {
          const a = rameno(svetlostPole, yT, nazev.toLowerCase());
          sloupkyX.forEach((x, i) => {
            if (i < nP) pasek(nazev, a, [x + sx + a / 2, yT - a / 2, zc], [0, 0, Math.PI / 4], l => [l, at, aw], [[-1, 0, 0, -(x + sx)], [0, 1, 0, yT]]);
            if (i > 0) pasek(nazev, a, [x - a / 2, yT - a / 2, zc], [0, 0, -Math.PI / 4], l => [l, at, aw], [[1, 0, 0, x], [0, 1, 0, yT]]);
          });
        };
        podelnePasky('Pásek přední', Hp - ph, D - sz / 2);
        if (p.paskyZadni) podelnePasky('Pásek zadní', Hz - ph, sz / 2);
        if (p.paskyBoky) {
          const a = rameno(svetlostD, yR0, 'boční');
          [sloupkyX[0], sloupkyX[nP]].forEach(x => {
            const xc = x + sx / 2;
            pasek('Pásek boční', a, [xc, yR0 - a / 2, sz + a / 2], [-Math.PI / 4, 0, 0], l => [aw, at, l], [[0, 0, -1, -sz], [0, 1, 0, yR0]]);
            pasek('Pásek boční', a, [xc, yR0 - a / 2, D - sz - a / 2], [Math.PI / 4, 0, 0], l => [aw, at, l], [[0, 0, 1, D - sz], [0, 1, 0, yR0]]);
          });
        }
        if (zkracene.length) varovani.push(`Rameno pásku zkráceno, aby se pásky v poli nesrazily a nesahaly k podlaze: ${zkracene.join(', ')}.`);
        if (vynechane) varovani.push('Některé pásky se do pole nevejdou (rameno pod 100 mm) – vynechány.');
      }

      // --- Krokve: spodní hrana prochází horním rohem pozednic na straně do kopce, osedlání nejvýš třetina krokve ---
      const tg = (Hp - Hz) / (D - pw), alfa = Math.atan(tg), cos = Math.cos(alfa), sin = Math.sin(alfa);
      const stupne = Math.abs(alfa) * 180 / Math.PI;
      const smer = Math.abs(tg) < 1e-9 ? 'rovná' : tg > 0 ? 'spád dozadu' : 'spád dopředu';
      // šířka sedla na pozednici: osedlání nejvýš třetina krokve a svislý řez nejvýš půl pozednice
      // sloupek hlubší než pozednice: krokev na vyšší straně nesmí sáhnout pod vršek přečnívajícího sloupku (o ph níž)
      const bSloup = Math.abs(tg) > 1e-9 ? ph / Math.abs(tg) - Math.max(0, sz - pw) - 1 : pw;
      const b = Math.abs(sin) > 1e-9 ? Math.max(0, Math.min(bSloup, Math.max(10, Math.min(pw, kh / 3 / Math.abs(sin), ph / 2 / Math.abs(tg) - Math.max(0, sz - pw))))) : pw;
      const zKriz = tg >= 0 ? b : pw - b;           // kde spodní hrana protíná vršek zadní pozednice
      const spod = z => Hz + (z - zKriz) * tg;      // spodní hrana krokve nad bodem z
      // sloupek přečnívá za pozednici dovnitř: kde je jeho vršek nad spodní hranou krokve, srazit ho rovnoběžně s krokví
      if (sz > pw && smer !== 'rovná') {
        for (const [kde, nazev, yTop, zVnitr, zLic] of [['předních', 'Sloupek přední', Hp - ph, D - sz, D - pw], ['zadních', 'Sloupek zadní', Hz - ph, sz, pw]]) {
          const d1 = yTop - spod(zVnitr), d0 = yTop - spod(zLic);   // o kolik je vršek nad krokví: vnitřní hrana, líc pozednice
          if (d1 < 0.5) continue;
          varovani.push(`Krokev zasahuje do vršku ${kde} sloupků přečnívajících za pozednici o ${sz - pw} mm – vršek srazit rovnoběžně s krokví (pod ${zaokr(stupne)}° od vodorovné): na vnitřní hraně o ${zaokr(d1)} mm, `
            + (d0 > 0.5 ? `u líce pozednice o ${zaokr(d0)} mm.` : `šikmina končí ${zaokr(d1 / Math.abs(tg))} mm od vnitřní hrany.`) + ' Nebo zvol pozednici aspoň tak širokou jako sloupek.');
          // ve 3D: rovina spodní hrany krokví (y − tg·z ≤ spod(0)); pod pozednicí je krokev výš, tam nic neubere
          dily.filter(d => d.nazev === nazev).forEach(d => d.boxy.forEach(bx => { bx.rez = [[0, 1, -tg, spod(0)]]; }));
        }
      }
      if (stupne < 5) varovani.push(`Sklon střechy jen ${zaokr(stupne)}° – vlnitá krytina potřebuje aspoň cca 5–8°, rovná střecha jen s fólií nebo lepenkou na bednění.`);
      if (stupne > 35) varovani.push(`Sklon ${zaokr(stupne)}° je na pultovou střechu dřevníku zbytečně strmý – zmenši rozdíl výšek nebo zvětši hloubku.`);
      if (b < pw - 0.5) varovani.push(`Osedlání krokve omezeno (nejvýš třetina krokve) – na pozednici dosedá jen ${zaokr(b)} mm z ${pw} mm; zmenši sklon.`);
      const zA = -p.presahZadni, zB = D + p.presahPredni;
      const delkaK = (zB - zA) / cos;
      const okap = Math.min(spod(zA), spod(zB));
      if (okap < 1000) varovani.push(`Okap (spodní hrana krokví na konci) je jen ${zaokr(okap)} mm nad zemí – zmenši přesah na nižší straně nebo zvyš nižší stranu.`);
      if (delkaK > maxDelka(mK)) varovani.push(`Krokev ${zaokr(delkaK)} mm je delší než obchodní délka materiálu (${mK.delka} mm) – zvol delší materiál krokví nebo zmenši přesahy či hloubku.`);
      // bod v rovině krokví → [y, z]
      const P = (u, v) => [spod(zA) + u * sin + v * cos, zA + u * cos - v * sin];
      const strecha = (x0, x1, u0, u1, v0, v1) => {
        const [y, z] = P((u0 + u1) / 2, (v0 + v1) / 2);
        return sikmy([(x0 + x1) / 2, y, z], [x1 - x0, v1 - v0, u1 - u0], [-alfa, 0, 0]);
      };
      krokveX.forEach(x => kus('Krokev', mK, delkaK, strecha(x, x + kb, 0, delkaK, 0, kh),
        { poznamka: `${smer === 'rovná' ? 'rovná střecha' : `sklon ${zaokr(stupne)}°`}, konce řezat kolmo na krokev${smer === 'rovná' ? '' : `, osedlat na pozednicích (sedlo ${zaokr(b)} mm)`}; rozteč nejvýš ${zaokr(roztecK)} mm` }));

      // --- Latě na plocho přes všechny krokve, první a poslední na koncích krokví, spoje na krokvi ---
      const nL = Math.max(2, Math.ceil((delkaK - lw) / p.roztecLati) + 1);
      const roztecL = (delkaK - lw) / (nL - 1);
      for (let i = 0; i < nL; i++) {
        const u = i * roztecL;
        podelny('Střešní lať', mL, -pb, L + 2 * pb, (x, l) => strecha(x, x + l, u, u + lw, kh, kh + lt),
          { poznamka: `rozteč ${zaokr(roztecL)} mm, přibít na každou krokev, spoje na krokvi střídat` }, osyKrokvi, 'krokev', i % 2);
      }

      // --- Čelní prkna na kolmá čela krokví (oba konce), závětrná prkna z boku na krajní krokve ---
      const v1 = kh + lt, v0 = v1 - cb;             // horní hrana lícuje s vrškem latí
      if (cb < lt + 30) varovani.push(`Čelní a závětrné prkno (${cb} mm) je na krokev ${kh} mm s latí ${lt} mm úzké – zvol širší prkno.`);
      const celo = smer === 'rovná' ? ['přední', 'zadní'] : tg > 0 ? ['přední – horní hrana', 'zadní – okap'] : ['přední – okap', 'zadní – horní hrana'];
      const poznC = 'přibít na čela krokví a na lať, spoje na krokvi';
      podelny(`Čelní prkno ${celo[1]}`, mC, -pb, L + 2 * pb, (x, l) => strecha(x, x + l, -ct, 0, v0, v1), { poznamka: poznC }, osyKrokvi, 'čelo krokve');
      podelny(`Čelní prkno ${celo[0]}`, mC, -pb, L + 2 * pb, (x, l) => strecha(x, x + l, delkaK, delkaK + ct, v0, v1), { poznamka: poznC }, osyKrokvi, 'čelo krokve');
      const delkaZ = delkaK + 2 * ct;
      const nZ = Math.ceil(delkaZ / maxDelka(mC));
      // nastavení závětrného prkna: šikmý sraz (úkos listu 45° přes tloušťku) místo přeplátování – stejné nastavení pily
      // jako kolmý řez, jen naklopený list; dláto netřeba. Sraz leží celý na boku krajní krokve, takže je podepřený,
      // a při sesychání se spára neotevře skrz (voda z šikmé plochy steče ven). Kraje mají dlouhou hranu o ct/2 delší,
      // prostřední kusy (rovnoběžné konce) mají obě hrany stejné.
      const poznZ = `nastojato, ${kraj || !pb ? 'přibít z boku na krajní krokev' : 'přibít na čela latí'} a přes roh na čelní prkna${nZ > 1 ? '; nastavit šikmým srazem (úkos listu 45°, viz výkres)' : ''}`;
      for (const [x0, x1] of [[-pb - ct, -pb], [L + pb, L + pb + ct]]) {
        for (let i = 0; i < nZ; i++) {
          const kraje = (i === 0) + (i === nZ - 1);   // počet kolmých konců (u nZ = 1 oba)
          kus('Závětrné prkno', mC, delkaZ / nZ + (nZ > 1 && kraje ? ct / 2 : 0), strecha(x0, x1, -ct + i * delkaZ / nZ, -ct + (i + 1) * delkaZ / nZ, v0, v1), { poznamka: poznZ });
        }
      }

      // --- Obklad z prken s mezerou ---
      const stitPrkna = [];                         // šikmá svislá prkna boku: [z0, kratší hrana, delší hrana] (jedna strana)
      if (p.obklad !== 'zadny') {
        const mez = p.mezeraObklad;
        // záda: nejvýš po spodní hranu krokví nad obkladem (a po vršek zadní pozednice)
        const yZ = Math.min(Hz, spod(-ot) - 5, spod(0) - 5);
        const nO = Math.max(0, Math.floor((yZ - yF + mez) / (ob + mez)));
        for (let k = 0; k < nO; k++) {
          const y = yF + k * (ob + mez);
          podelny('Obklad zadní stěny', mO, 0, L, (x, l) => ({ pos: [x, y, -ot], size: [l, ob, ot] }),
            { poznamka: `mezera ${mez} mm, přibít na zadní sloupky` }, osySloupku, 'sloupek', k % 2);
        }
        if (p.obklad === 'zadaBoky') {
          // boky vodorovně po spodní hranu příčle
          const nS = Math.max(0, Math.floor((yR0 - yF + mez) / (ob + mez)));
          for (let k = 0; k < nS; k++) {
            const y = yF + k * (ob + mez);
            for (const x of [-ot, L]) kus('Obklad boku', mO, D + ot, { pos: [x, y, -ot], size: [ot, ob, D + ot] },
              { poznamka: `mezera ${mez} mm, přibít na krajní sloupky` });
          }
          if (p.obkladStit) {
            // nad tím svislá prkna od příčle pod střechu: pod pozednicemi jen po pozednici, jinak po krokev nad stěnou
            const zKr = Math.max(sz, pw);
            const presahZ = (pb < ot && !kraj) ? Math.min(kh / 2, v0) : kh / 2;   // jak vysoko lícují s krajní krokví
            const strop = zz => spod(zz) + presahZ / cos;
            const nK = Math.max(1, Math.ceil(zKr / (ob + mez)));
            const prkna = [];
            for (let k = 0; k < nK; k++) {
              prkna.push([k * (ob + mez), Hz - ph, 'pod pozednici']);
              prkna.push([D - ob - k * (ob + mez), Hp - ph, 'pod pozednici']);
            }
            const a0 = nK * (ob + mez), a1 = D - nK * (ob + mez);
            const n = Math.max(0, Math.floor((a1 - a0 + mez) / (ob + mez)));
            const g = n > 1 ? (a1 - a0 - n * ob) / (n - 1) : 0;
            for (let k = 0; k < n; k++) {
              const z0 = n > 1 ? a0 + k * (ob + g) : (a0 + a1 - ob) / 2;
              prkna.push([z0, Math.min(strop(z0), strop(z0 + ob)), 'sikmo']);
            }
            prkna.forEach(([z0, yT, typ]) => {
              const h = yT - yR0;
              if (h < 50) return;
              const sik = typ === 'sikmo' && smer !== 'rovná';
              const hDl = typ === 'sikmo' ? Math.max(strop(z0), strop(z0 + ob)) - yR0 : h;
              if (sik) stitPrkna.push([z0, h, hDl]);
              // šikmé: kvádr na delší hranu, seříznutý rovinou rovnoběžnou se střechou (y − tg·z ≤ strop(0))
              for (const x of [-ot, L]) kus('Obklad boku – svislé prkno', mO, hDl,
                sik ? { pos: [x, yR0, z0], size: [ot, hDl, ob], rez: [[0, 1, -tg, strop(0)]] } : { pos: [x, yR0, z0], size: [ot, h, ob] },
                { poznamka: sik ? `horní konec šikmo pod ${zaokr(stupne)}° (posun rysky ${zaokr(ob * Math.abs(tg))} mm), kratší hrana ${zaokr(h)} mm; přibít na příčli a na krokev nad stěnou`
                  : typ === 'sikmo' ? 'horní konec kolmo, přibít na příčli a na krokev nad stěnou' : 'přibít na příčli a na sloupek, končí pod pozednicí (nad ní větrací mezera)' });
            });
          }
        }
      }

      napojene.forEach((kde, n) => varovani.push(`${n}: délka přesahuje obchodní délku řeziva – rozděleno na víc kusů se spojem na ${kde}.`));
      // díly, které se nastavovat nedají
      dily.forEach(d => {
        const m = M.najdi(d.material);
        if (m && d.delka > maxDelka(m) && !varovani.some(w => w.includes(d.nazev)))
          varovani.push(`${d.nazev} ${d.delka} mm je delší než obchodní délka materiálu (${m.delka} mm) a nastavit se nedá – zvol delší materiál${/boku/.test(d.nazev) ? ' nebo menší hloubku' : ''}.`);
      });

      // --- Výkresy čepů, dlabů a osedlání ---
      const vykresy = [];
      const cs = x => zaokr(x).toLocaleString('cs-CZ');
      // sloupek: pohled na vnitřní bok (šířka sx), čep nahoře (a dole), dlab pro čep příčle
      const vykresSloupek = (nazev, h, ks, yP, kde) => {
        const W = h + pridCep, H = sx;
        const odpad = [{ x: W - cep, y: 0, w: cep, h: (sx - tcS) / 2 }, { x: W - cep, y: (sx + tcS) / 2, w: cep, h: (sx - tcS) / 2 }];
        if (mR) odpad.push({ x: 0, y: 0, w: cep, h: (sx - tcS) / 2 }, { x: 0, y: (sx + tcS) / 2, w: cep, h: (sx - tcS) / 2 });
        const xD = (mR ? cep : 0) + (yR0 - patka) + RAMENO;
        const yD = yP - tcP / 2;                       // dlab měřen od vnějšího líce (u krajních sloupků)
        const dlaby = [{ x: xD, y: yD, w: ph - 2 * RAMENO, h: tcP }];
        vykresy.push({
          nazev, ks, W, H, barva: mS.barva, odpad, dlaby, vyrezu: odpad.length, dlabu: 1,
          detail: { w: Math.min(W, mR ? cep * 4 : W), h: H },
          kotyX: [0, mR ? cep : 0, xD, xD + ph - 2 * RAMENO, W - cep, W], kotyY: [0, (sx - tcS) / 2, (sx + tcS) / 2, yD, yD + tcP, sx],
          popis: [
            `Délka ${cs(W)} mm včetně čepů ${cep} mm; horní čep tloušťky ${tcS} mm, šířka ${cs(zC - 2 * RAMENO)} mm (od vnějšího líce ${RAMENO} mm${sz > zC ? `, na šířku pozednice ${pw} mm, ne na celou hloubku sloupku ${sz} mm` : ''}).`
              + (mR ? ` Dolní čep tloušťky ${tcS} mm, šířka ${cs(zCR - 2 * RAMENO)} mm (od vnějšího líce ${RAMENO} mm).` : ''),
            `Dlab pro čep boční příčle na vnitřní straně sloupku: ${cs(ph - 2 * RAMENO)} × ${tcP} mm, hloubka ${cep} mm, od spodního konce ${cs(xD)} mm, ${kde}.`,
            `Pohled na vnitřní bok sloupku (kolmo na hloubku dřevníku)${Math.abs(yP - sx / 2) > 0.5 ? '; kóta 0 napříč = vnější líc boční stěny' : ''}.`,
          ],
        });
      };
      // krajní příčle lícují s vnějškem sloupku → dlab v ose příčle (překrytí příčle a sloupku), vnitřní v ose sloupku
      const yKraj = Math.min(pw, sx) / 2;
      const ruzne = Math.abs(yKraj - sx / 2) > 0.5 && nP > 1;
      for (const [k, h] of [['přední', hPp], ['zadní', hPz]]) {
        if (ruzne) {
          vykresSloupek(`Sloupek ${k} – krajní`, h, 2, yKraj, `osa dlabu ${cs(yKraj)} mm od vnějšího líce (krajní příčle lícuje s vnějškem)`);
          vykresSloupek(`Sloupek ${k} – vnitřní`, h, nP - 1, sx / 2, 'v ose sloupku');
        } else vykresSloupek(`Sloupek ${k}`, h, nP + 1, yKraj, Math.abs(yKraj - sx / 2) > 0.5 ? `osa dlabu ${cs(yKraj)} mm od vnějšího líce (krajní příčle lícuje s vnějškem)` : 'v ose sloupku');
      }
      // pozednice: pohled zespodu, dlaby pro čepy sloupků
      ['přední', 'zadní'].forEach(k => {
        const W = L + 2 * pp, H = pw;
        const dlaby = sloupkyX.map(x => ({ x: pp + x + (sx - tcS) / 2, y: RAMENO, w: tcS, h: zC - 2 * RAMENO }));
        vykresy.push({
          nazev: `Pozednice ${k} (pohled zespodu)`, ks: 1, W, H, barva: mP.barva, odpad: [], dlaby, vyrezu: 0, dlabu: dlaby.length,
          detail: { w: Math.min(W, pp + sx + 60), h: H },
          kotyX: [0].concat(dlaby.flatMap(d => [d.x, d.x + d.w]), [W]), kotyY: [0, RAMENO, zC - RAMENO, H],
          tabulky: [{ nazev: `Dlaby – pozednice ${k}`, sloupce: ['Dlab', 'Od (mm)', 'Do (mm)', 'Šířka', 'Hloubka'],
            radky: dlaby.map((d, i) => [i + 1, cs(d.x), cs(d.x + d.w), cs(d.w), cep]) }],
          popis: [
            `Délka celkem ${cs(W)} mm (od levého konce${pp ? `, přesah ${pp} mm přes krajní sloupek` : ''}); při nastavení řezat spoj nad sloupkem.`,
            `Dlaby ${tcS} × ${cs(zC - 2 * RAMENO)} mm, hloubka ${cep} mm, od vnějšího líce ${RAMENO} mm.`,
          ],
        });
      });
      // boční příčle: pohled z boku, čepy na obou koncích
      {
        const W = svetlostD + 2 * cep, H = ph, r = RAMENO;
        const odpad = [{ x: 0, y: 0, w: cep, h: r }, { x: 0, y: H - r, w: cep, h: r }, { x: W - cep, y: 0, w: cep, h: r }, { x: W - cep, y: H - r, w: cep, h: r }];
        vykresy.push({
          nazev: 'Boční příčle', ks: nP + 1, W, H, barva: mP.barva, odpad, dlaby: [], vyrezu: 4, dlabu: 0,
          detail: { w: Math.min(W, cep * 4), h: H }, kotyX: [0, cep, W - cep, W], kotyY: [0, r, H - r, H],
          popis: [`Délka ${cs(W)} mm = světlost ${cs(svetlostD)} mm + 2 čepy ${cep} mm.`,
            `Čep výšky ${cs(H - 2 * r)} mm a tloušťky ${tcP} mm (třetina šířky), osazení ${r} mm nahoře a dole.`]
            .concat(pw > sx ? [`Příčle je širší než sloupek: čep v ose sloupku – u krajních příčlí ${cs(sx / 2)} mm od vnějšího líce, ne v ose příčle.`] : []),
        });
      }
      const st = x => `${cs(x)}°`;
      // pásky: rovnoramenný lichoběžník, dlouhá (vnější) hrana dole; výkres pro každé rozdílné rameno
      paskyA.forEach((g, a) => {
        const W = a * S45 + at, kdo = [...g.nazvy].map(n => n.replace('Pásek ', ''));
        const kam = kdo.every(k => k === 'boční') ? 'příčli' : kdo.includes('boční') ? 'pozednici či příčli' : 'pozednici';
        const naKraj = a + at / S45;                 // od rohu po konec dlouhé hrany (na sloupku i na nosníku)
        vykresy.push({
          nazev: `Pásek ${kdo.join(', ')}${paskyA.size > 1 ? ` – rameno ${a} mm` : ''}`, ks: g.ks, W, H: at, barva: mA.barva,
          odpad: [{ pts: [[0, 0], [at, at], [0, at]] }, { pts: [[W, 0], [W, at], [W - at, at]] }], dlaby: [], vyrezu: 0, dlabu: 0, sikmych: 2,
          uhly: [{ x: 0, y: 0, od: 45, do: 90, text: '45°' }, { x: W, y: 0, od: 90, do: 135, text: '45°' }],
          detail: { w: Math.min(W, 4 * at), h: at }, kotyX: [0, at, W - at, W], kotyY: [0, at],
          postup: [
            `Na dlouhé hraně odměř ${cs(W)} mm (rameno ${a} mm × √2 + ${at} mm).`,
            `Nastav pokos 45° (úkos listu 0°), pásek polož na stůl pily plochou širokou ${at} mm (ta, která bude vidět). První konec řízni pokosem 45° vlevo, druhý 45° vpravo – konce se sbíhají (lichoběžník), nejsou rovnoběžné.`,
            `Bez pokosové pily: z obou konců dlouhé hrany přenes rysku kolmo na protější hranu a posuň ji o ${at} mm dovnitř, body spoj – krátká hrana vyjde ${cs(W - 2 * at)} mm.`,
            'Kontrola: oba řezy jsou navzájem kolmé – pásek přiložený do úhelníku sedne oběma konci.',
            `Osazení: na sloupku i na ${kam} narýsuj od rohu ${cs(naKraj)} mm – sem sahá dlouhá hrana (osa pásku je ${a} mm od rohu). Na každém konci 2 vruty, předvrtat.`,
          ],
          popis: [`Délka ${cs(W)} mm na dlouhé (vnější) hraně, ${cs(W - 2 * at)} mm na krátké; průřez ${at} mm v rovině pásku. Jeden konec dosedá svisle na líc sloupku, druhý vodorovně pod ${kam}.`],
          tabulky: [{ nazev: 'Nastavení řezu', sloupce: SLOUPCE_REZU, radky: [
            ['Konec ke sloupku (svislý)', '45° vlevo', '0°', `${at} mm přes šířku ${at} mm`],
            ['Konec k nosníku (vodorovný)', '45° vpravo', '0°', `${at} mm přes šířku ${at} mm`]] }],
        });
      });
      // krokev: osedlání na obou pozednicích v rovině krokve (u po spodní hraně od zadního konce, v kolmo nahoru);
      // výřez je trojúhelník: vodorovné sedlo + svislý řez
      if (smer !== 'rovná') {
        const UV = (z, y) => { const dz = z - zA, dy = y - spod(zA); return [dz * cos + dy * sin, -dz * sin + dy * cos]; };
        const odpad = [], uhly = [], radky = [], kx = [0, delkaK], ky = [0, kh], pop = [];
        // oblouk mezi vztažným směrem (spodní hrana nebo kolmice na ni) a řeznou čarou z [x, y] do [x1, y1]
        const oblouk = (x, y, ref, x1, y1) => {
          const r = Math.atan2(y1 - y, x1 - x) * 180 / Math.PI;
          uhly.push({ x, y, od: Math.min(ref, r), do: Math.max(ref, r), text: st(stupne) });
        };
        const osedlani = (nazev, zPlate0, H) => {
          // část pozednice nad spodní hranou krokve: sedlo na vršku, svislý řez na straně z kopce
          const zK = zKriz + (H - Hz) / tg;
          // svislý řez na té hraně pozednice, kde je spodní hrana krokve níž (tam pozednice vystupuje nad ni)
          const zH = spod(zPlate0) < spod(zPlate0 + pw) ? zPlate0 : zPlate0 + pw;
          const [uK] = UV(zK, H), [uHb] = UV(zH, spod(zH)), [uC, vC] = UV(zH, H);
          odpad.push({ pts: [[uK, 0], [uHb, 0], [uC, vC]] });
          // sedlo je vodorovné → se spodní hranou svírá sklon α; svislý řez se od kolmice na krokev odchyluje taky o α
          oblouk(uK, 0, uC < uK ? 180 : 0, uC, vC);
          oblouk(uHb, 0, 90, uC, vC);
          kx.push(uK, uHb, uC); ky.push(vC);
          const kam = uC > uHb ? 'k přednímu' : 'k zadnímu';
          pop.push(`Osedlání na ${nazev} pozednici: vodorovné sedlo ${cs(Math.abs(zK - zH))} mm, svislý řez hloubky ${cs(Math.abs(H - spod(zH)))} mm; svislý řez ${cs(uHb)} mm od zadního konce (měřeno po spodní hraně).`);
          radky.push([`${nazev[0].toUpperCase() + nazev.slice(1)} pozednice – svislý řez`, `ručně, ${st(stupne)} od kolmice`, '0°',
            `na spodní hraně ${cs(uHb)} mm od zadního konce; ve výšce ${cs(vC)} mm posun rysky ${cs(Math.abs(uC - uHb))} mm ${kam} konci`]);
          radky.push([`${nazev[0].toUpperCase() + nazev.slice(1)} pozednice – sedlo`, `ručně, ${st(stupne)} od spodní hrany`, '0°',
            `na spodní hraně ${cs(uK)} mm od zadního konce, spojit s koncem svislého řezu (posun ${cs(Math.abs(uK - uC))} mm na výšku ${cs(vC)} mm)`]);
        };
        osedlani('zadní', 0, Hz);
        osedlani('přední', D - pw, Hp);
        vykresy.push({
          nazev: 'Krokev', ks: krokveX.length, W: delkaK, H: kh, barva: mK.barva, odpad, dlaby: [], vyrezu: 2, dlabu: 0, uhly,
          detail: { w: Math.min(delkaK, Math.max(...kx.slice(2, 5)) + 80), h: kh }, kotyX: kx, kotyY: ky,
          postup: [
            'Na boku krokve odměř po spodní hraně od zadního konce oba body každého osedlání (tabulka níže).',
            'Vrchol trojúhelníku: v bodě posunutém o posun rysky narýsuj kolmo od spodní hrany výšku podle tabulky; vrchol spoj s oběma body na spodní hraně.',
            'Narýsuj stejně i na druhém boku krokve (přenes úhelníkem přes spodní plochu), ať řez nevybíhá.',
            'Ruční pilou nařízni svislý řez i sedlo až do vrcholu, řezat v odpadu těsně vedle rysky; zbytek dočisti dlátem.',
            'První krokev vyzkoušej na pozednicích, další rýsuj podle ní jako podle šablony.',
          ],
          popis: [`Délka ${cs(delkaK)} mm po spodní hraně, oba konce řezat kolmo na krokev (čelní prkno je kolmo ke krokvi).`].concat(pop),
          tabulky: [{ nazev: 'Osedlání – rýsování', sloupce: SLOUPCE_REZU, radky }],
        });
      }
      // šikmá svislá prkna obkladu boku: vzor = první prkno, horní konec rovnoběžně se střechou
      if (stitPrkna.length) {
        const [, h, W] = stitPrkna[0], o = W - h;
        vykresy.push({
          nazev: 'Obklad boku – šikmé svislé prkno (vzor)', ks: 2 * stitPrkna.length, W, H: ob, barva: mO.barva,
          odpad: [{ pts: [[h, 0], [W, 0], [W, ob]] }], dlaby: [], vyrezu: 0, dlabu: 0, sikmych: 1,
          uhly: [{ x: h, y: 0, od: 90 - stupne, do: 90, text: st(stupne) }],
          detail: { w: W, h: ob }, detailPopis: 'Celé prkno s kótami (šikmý horní konec vpravo)', kotyX: [0, h, W], kotyY: [0, ob],
          postup: [
            `Pokos ${st(stupne)} (úkos listu 0°), prkno na plocho. Spodní konec kolmo, horní šikmo – délky každého prkna v tabulce.`,
            `Bez pokosové pily: na jedné hraně odměř kratší délku, na druhé delší (o ${cs(o)} mm víc) a body spoj.`,
            `Kratší hrana patří ${tg > 0 ? 'k zadní' : 'k přední'} stěně. Prkna levého a pravého boku jsou stejná, jen otočená rubem ven.`,
          ],
          popis: [`Kresleno prkno č. 1: ${cs(h)} / ${cs(W)} mm. Šikmina rovnoběžně se střechou, sklon ${st(stupne)}; prkno přibít na příčli a nahoře na krokev nad stěnou.`],
          tabulky: [
            { nazev: 'Nastavení řezu', sloupce: SLOUPCE_REZU, radky: [['Horní konec všech šikmých prken', st(stupne), '0°', `${cs(o)} mm přes šířku ${ob} mm`]] },
            { nazev: 'Délky šikmých prken (na každém boku stejně)', sloupce: ['Prkno', 'Poloha od zadního líce (mm)', 'Kratší hrana', 'Delší hrana', 'Ks'],
              radky: stitPrkna.map(([z0, hh, hd], i) => [i + 1, cs(z0), cs(hh), cs(hd), 2]) },
          ],
        });
      }
      // závětrné prkno nastavené šikmým srazem: pohled na horní hranu krajního kusu, sraz vlevo
      if (nZ > 1) {
        const W = delkaZ / nZ + ct / 2;
        vykresy.push({
          nazev: 'Závětrné prkno – šikmý sraz (pohled na horní hranu)', ks: 4, W, H: ct, barva: mC.barva,
          odpad: [{ pts: [[0, 0], [ct, 0], [0, ct]] }], dlaby: [], vyrezu: 0, dlabu: 0, sikmych: 1,
          uhly: [{ x: ct, y: 0, od: 90, do: 135, text: '45°' }],
          detail: { w: Math.min(W, 8 * ct), h: ct }, detailPopis: 'Detail šikmého konce (spodní hrana obrázku = líc ke krokvi)', kotyX: [0, ct, W], kotyY: [0, ct],
          postup: [
            'Pilu nastav na úkos listu 45° (pokos 0°), prkno polož na plocho vnějším lícem nahoru.',
            'Oba kusy srazu řež stejným nastavením a stejnou plochou nahoru – u jednoho ponech kus vlevo od listu, u druhého vpravo; šikmé plochy pak do sebe zapadnou.',
            `Bez pokosové pily: na horní hraně posuň rysku o ${ct} mm přes tloušťku, na obou lících narýsuj kolmé čáry a řež podle nich.`,
            'Sraz leží na boku krajní krokve – obě strany přibít do krokve, předvrtat, ať prkno u konce nepraskne.',
          ],
          popis: [`Krajní kus: ${cs(W)} mm na delší hraně (kolmý konec + šikmý sraz).`
            + (nZ > 2 ? ` Prostřední kusy (${2 * (nZ - 2)} ks) mají šikmé oba konce rovnoběžně, ${cs(delkaZ / nZ)} mm na obou hranách.` : '')],
          tabulky: [{ nazev: 'Nastavení řezu', sloupce: SLOUPCE_REZU, radky: [['Šikmý sraz', '0°', '45°', `${ct} mm přes tloušťku ${ct} mm (na horní hraně)`]] }],
        });
      }

      const sirkaS = L + 2 * pb + 2 * ct, delkaS = delkaK + 2 * ct;
      const krytina = sirkaS * delkaS / 1e6;
      const prostor = L * D * ((Hp + Hz) / 2 - ph - yF) / 1e9;
      const souhrn = `${zaokr(L)} × ${zaokr(D)} mm, výška ${zaokr(Hp)} / ${zaokr(Hz)} mm · ${smer === 'rovná' ? 'rovná střecha' : `sklon ${zaokr(stupne)}° (${smer})`} · ${nP} ${nP <= 4 ? 'pole' : 'polí'} · ${krokveX.length} krokví, ${nL} latí · krytina ${zaokr(sirkaS)} × ${zaokr(delkaS)} mm ≈ ${zaokr(krytina)} m² · prostor ≈ ${zaokr(prostor)} m³`;

      return { dily, varovani, souhrn, vykresy };
    },
  };
})(window.Truhla);
