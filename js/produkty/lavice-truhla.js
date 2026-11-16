window.Truhla = window.Truhla || {};

// Lavice = úložná truhla: čepovaný korpus (čela, boky, dno), víko ze 2 dílů (zadní pevný, přední sklopný),
// volitelně sokl a opěradlo.
// Souřadnice v mm: x = délka (zleva), y = výška (od podlahy), z = hloubka (0 = záda, roste dopředu).
// Každý díl: delka = rozměr po vlákně, sirka = druhý rozměr (přířez vč. čepů), boxy = tvar ve 3D.
(function (T) {
  'use strict';
  T.produkty = T.produkty || {};

  const zaokr = x => Math.round(x * 10) / 10;
  const SPARA_VIKA = 2; // mezera mezi pevnou a sklopnou částí víka
  const cepu = n => `${n} ${n === 1 ? 'čep' : n >= 2 && n <= 4 ? 'čepy' : 'čepů'}`;
  const dilku = n => `${n} ${n === 1 ? 'dílek' : n >= 2 && n <= 4 ? 'dílky' : 'dílků'}`;
  // masiv pracuje napříč vláknem (spárovka, řezivo); překližka, MDF, DTD… ne
  const masiv = m => m.typ === 'rezivo' || /spárovk/i.test(`${m.kategorie || ''} ${m.nazev}`);

  // Rozdělí hranu délky E na n čepů šířky w rozmístěných rovnoměrně; vrací začátky čepů (celé mm).
  function rozmisti(E, w) {
    const n = Math.max(1, Math.round(E / (2 * w)));
    const krok = E / n;
    const sirka = Math.round(Math.min(w, krok * 0.7));
    return { n, sirka, krok, zacatky: Array.from({ length: n }, (_, i) => Math.round(i * krok + (krok - sirka) / 2)) };
  }

  // Rozdělí výšku H na n dílků po celých mm, zbytek dostane horní dílek; vrací hranice [0, …, H].
  function deleni(H, n) {
    const k = Math.floor(H / n);
    return Array.from({ length: n + 1 }, (_, i) => (i === n ? zaokr(H) : i * k));
  }
  const popisDilku = b => {
    const n = b.length - 1, k = b[1], horni = zaokr(b[n] - b[n - 1]);
    return `${dilku(n)} po ${k} mm` + (horni !== k ? ` (horní ${horni.toLocaleString('cs-CZ')} mm)` : '');
  };

  // Postup ručního řezání ozubů na konci stěny (W × H, hloubka Tp = tloušťka protikusu).
  // b = hranice dílků odspodu, sude = vyřezávají se sudé dílky, konce = popis, kde ozuby jsou.
  function postupOzubu({ W, H, Tw, Tp, b, sude, konce, protikus, prvni, navic = [] }) {
    const prorez = T.materialy.nastaveni().prorez;
    const cs = x => zaokr(x).toLocaleString('cs-CZ');
    const n = b.length - 1, vyrezu = Math.ceil((sude ? n - 1 : n) / 2);
    return [
      `Uřízni přířez ${cs(W)} × ${cs(H)} × ${Tw} mm, konce přesně do úhlu.`,
      `${konce}: narýsuj dokola (obě plochy + hrany) rysku ${Tp} mm od konce desky – ryskovačkou, nebo tužkou podle úhelníku; to je dno ozubů (= tloušťka ${protikus}).`,
      `Od spodní hrany naměř a přenes na čelní plochu konce i obě plochy značky: ${b.map(cs).join(' · ')} mm.`,
      `Křížkem označ odpad: ${sude ? 'sudé dílky (2., 4., …)' : 'liché dílky (1., 3., …)'} odspodu – na každém konci ${vyrezu} ${vyrezu === 1 ? 'výřez' : vyrezu <= 4 ? 'výřezy' : 'výřezů'}.`,
      `Řež pilkou čepovkou podél značek až k rysce, vždy v odpadu těsně vedle čáry (prořez ${prorez} mm nesmí ujít do čepu).`,
      'Odpad vyřízni vykružovací pilkou (nebo nařízni víckrát a vylom) a vydlabej dlátem: ostří postav do rysky a ber z obou stran do poloviny tloušťky.',
      ...navic,
      prvni
        ? `Tip: tenhle díl udělej první, pak ho přilož ke konci ${protikus} a čepy přímo obkresli ostrou tužkou/nožem – přesnější než měřit.`
        : `Tip: přesnější než měřit je přiložit hotový protikus a jeho čepy obkreslit nožem; tabulka níže slouží ke kontrole.`,
    ];
  }

  // Úseky hrany délky E od 0: střídavě odpad a čep (čepy z rozmisti() posunuté o okraj T)
  function useky(E, T, cepy) {
    const r = [];
    let x = 0;
    cepy.zacatky.forEach(s => {
      if (T + s - x > 0.01) r.push({ od: x, do: T + s, cep: false });
      r.push({ od: T + s, do: T + s + cepy.sirka, cep: true });
      x = T + s + cepy.sirka;
    });
    if (E - x > 0.01) r.push({ od: x, do: E, cep: false });
    return r;
  }

  // Výkresy pro záložku Čepy (souřadnice dílu v mm, y odspodu / zepředu).
  // ks = kusů na jeden výrobek; tabulky = řezné listy; vyrezu/dlabu = počty operací na 1 kus dílu.
  function vykresy(o) {
    const { L, D, Hk, Tc, Tb, Td, n, b, cx, cz, dnoOdspodu, vule, mc, mb, md } = o;
    const cs = x => zaokr(x).toLocaleString('cs-CZ');
    const rysky = b;
    const vyskaDetailu = Math.min(Hk, b[Math.min(n, 5)]);
    const Tmax = Math.max(Tc, Tb);
    const okraj = Tmax + Math.max(2.5 * Tmax, 50);

    // Tw = tloušťka stěny, Tp = tloušťka protikusu (hloubka ozubů i odsazení dlabů od hrany)
    // plus = prodloužení dlabů směrem dopředu (vůle na pohyb masivního dna)
    const stena = (nazev, W, Tw, Tp, cepy, sude, barva, plus) => {
      const odpad = [];
      for (let i = sude ? 1 : 0; i < n; i += 2) {
        const h = b[i + 1] - b[i];
        odpad.push({ x: 0, y: b[i], w: Tp, h }, { x: W - Tp, y: b[i], w: Tp, h });
      }
      const dlaby = cepy.zacatky.map((s, i) => ({ x: Tp + s, y: dnoOdspodu, w: cepy.sirka + (plus ? plus[i] : 0), h: Td }));
      const hranyDlabu = dlaby.flatMap(d => [d.x, d.x + d.w]);
      const ozuby = Array.from({ length: n }, (_, i) => {
        const vyrez = sude ? i % 2 === 1 : i % 2 === 0;
        return [i + 1, cs(b[i]), cs(b[i + 1]), cs(b[i + 1] - b[i]), Tp, vyrez ? 'VYŘEZAT' : 'čep – ponechat'];
      });
      return {
        nazev, ks: 2, W, H: Hk, barva, odpad, dlaby,
        vyrezu: odpad.length, dlabu: dlaby.length,
        detail: { w: Math.min(W, Math.max(okraj, hranyDlabu[1] + 10 || 0)), h: vyskaDetailu },
        kotyY: rysky.concat([dnoOdspodu, dnoOdspodu + Td]),
        kotyX: [0, Tp].concat(hranyDlabu),
        postup: postupOzubu({ W, H: Hk, Tw, Tp, b, sude, konce: 'Na obou koncích', protikus: sude ? 'boku' : 'čela', prvni: sude,
          navic: dlaby.length ? [`Dlaby pro čepy dna (${dlaby.length} ks, ${cs(Td)} mm vysoké, ${cs(dnoOdspodu)} mm od spodní hrany, pozice v tabulce níže): vrtákem o 1–2 mm menším než výška dlabu navrtej řadu děr skrz, pak dočisti dlátem z obou stran do půlky.`] : [] }),
        popis: [
          `Na každém konci ${popisDilku(b)} – vyřezávají se ${sude ? 'sudé (2., 4., …)' : 'liché (1., 3., …)'} odspodu. Levý i pravý konec jsou stejné.`,
        ].concat(dnoOdspodu > 0 ? [] : ['Dno je zarovnané se spodní hranou – dlaby jsou otevřené zářezy ve spodní hraně.'])
          .concat(plus ? [`Dlaby se dopředu prodlužují o vůli na pohyb masivního dna (až ${cs(vule)} mm u předního čela). Na obrázku je zadní hrana vlevo, měřeno od ní; levý i pravý bok stejně – čepy dna do boků nelepit.`] : []),
        tabulky: [
          { nazev: 'Ozuby – oba konce stejně (měřeno od spodní hrany)', zvyraznit: 5,
            sloupce: ['#', 'Od', 'Do', 'Šířka', 'Hloubka', 'Co udělat'], radky: ozuby },
          { nazev: `${dnoOdspodu > 0 ? 'Dlaby pro čepy dna – průchozí' : 'Zářezy pro čepy dna – otevřené ve spodní hraně'}, výška ${cs(dnoOdspodu)}–${cs(dnoOdspodu + Td)} mm od spodní hrany`,
            sloupce: ['#', plus ? 'Od zadní hrany' : 'Od levé hrany', 'Do', 'Šířka', 'Výška'],
            radky: dlaby.map((d, i) => [i + 1, cs(d.x), cs(d.x + d.w), cs(d.w), cs(d.h)]) },
        ],
      };
    };

    // dno kreslené shora, y = 0 u zadní hrany; vpředu je rameno čepů posunuté o vůli
    const ux = useky(L, Tb, cx), uz = useky(D, Tc, cz);
    const odpadDna = [];
    ux.filter(u => !u.cep).forEach(u => odpadDna.push({ x: u.od, y: 0, w: u.do - u.od, h: Tc }, { x: u.od, y: D - Tc - vule, w: u.do - u.od, h: Tc + vule }));
    uz.filter(u => !u.cep).forEach(u => odpadDna.push({ x: 0, y: u.od, w: Tb, h: u.do - u.od }, { x: L - Tb, y: u.od, w: Tb, h: u.do - u.od }));
    const hranyX = cx.zacatky.flatMap(s => [Tb + s, Tb + s + cx.sirka]);
    const hranyZ = cz.zacatky.flatMap(s => [Tc + s, Tc + s + cz.sirka]);
    const detDno = Math.min(Math.max(L, D), Math.max(okraj, Tb + 1.2 * cx.krok));
    const radkyHrany = (us, hl) => us.map((u, i) => [i + 1, cs(u.od), cs(u.do), cs(u.do - u.od), hl, u.cep ? 'čep – ponechat' : 'VYŘEZAT']);

    return [
      stena('Čelo (přední + zadní)', L, Tc, Tb, cx, true, mc.barva),
      stena('Bok', D, Tb, Tc, cz, false, mb.barva, o.plusBok),
      {
        nazev: 'Dno (pohled shora)', ks: 1, W: L, H: D, barva: md.barva, odpad: odpadDna, dlaby: [],
        vyrezu: odpadDna.length - 4, dlabu: 0, // rohový výřez sdílí dvě hrany
        detail: { w: Math.min(L, detDno), h: Math.min(D, detDno) },
        kotyX: [0, Tb].concat(hranyX), kotyY: [0, Tc].concat(hranyZ, vule > 0 ? [D - Tc - vule] : []),
        postup: [
          `Uřízni přířez ${cs(L)} × ${cs(D)} × ${Td} mm.`,
          `Narýsuj dokola rysku délky čepů: ${Tb} mm od levé a pravé hrany, ${Tc} mm od zadní${vule > 0 ? ` a ${cs(Tc + vule)} mm od přední` : ' a přední'} hrany.`,
          'Dno dělej až po stěnách: přilož stěnu s hotovými dlaby k hraně dna (zarovnat konce) a polohu čepů obkresli přímo z dlabů. Dno se vkládá při lepení korpusu – na sucho vyzkoušej předem.',
          'Mezi čepy odpad nařízni pilkou čepovkou až k rysce a vylom/dočisti dlátem; rohy uřízni celé.',
        ],
        popis: [
          `Přířez ${cs(L)} × ${cs(D)} × ${Td} mm, čisté dno ${cs(L - 2 * Tb)} × ${cs(D - 2 * Tc - vule)} mm. `
            + (Tc === Tb && !vule ? `Rysku délky čepů veď ${Tc} mm od všech hran.`
              : `Rysku délky čepů veď ${Tc} mm od zadní, ${cs(Tc + vule)} mm od přední a ${Tb} mm od levé a pravé hrany.`),
          `Rohy se odříznou celé (jsou součástí prvního a posledního výřezu). Na obrázku je zadní hrana dole, přední nahoře.`,
        ].concat(vule > 0 ? [`Masivní dno pracuje napříč vláknem (dopředu/dozadu): čepy do zadního čela lepit, do předního čela a do boků nelepit. Vpředu je mezi dnem a čelem vůle ${cs(vule)} mm (čepy jsou o ni delší), dlaby v bocích jsou dopředu prodloužené.`] : []),
        tabulky: [
          { nazev: `Přední a zadní hrana (do čel) – ${cepu(cx.n)}, měřeno od levé hrany`, zvyraznit: 5,
            sloupce: ['#', 'Od', 'Do', 'Šířka', 'Hloubka', 'Co udělat'], radky: radkyHrany(ux, vule > 0 ? `${Tc} / ${cs(Tc + vule)} vpředu` : Tc) },
          { nazev: `Levá a pravá hrana (do boků) – ${cepu(cz.n)}, měřeno od zadní hrany`, zvyraznit: 5,
            sloupce: ['#', 'Od', 'Do', 'Šířka', 'Hloubka', 'Co udělat'], radky: radkyHrany(uz, Tb) },
        ],
      },
    ];
  }

  // Sokl pod korpusem L × D, viditelná výška p.soklVyska; vrací pole varování.
  // opts: Tc, Tb = tloušťka čel a boků, dnoOdspodu = spodek dna nad spodní hranou stěn,
  // masivDno = dno pracuje do hloubky (napevno jen vzadu, vpředu přes oválné otvory).
  // Sokl odsazený o méně než tloušťku stěn nese spodní hrany stěn (ke dnu ho drží lišty),
  // odsazený víc leží celý pod dutinou – pak sahá skrytou horní částí až ke dnu a nese dno.
  // Bez opts (starší volání) jen rám soklu pod korpusem.
  function sokl(dil, p, ms, L, D, opts = {}) {
    const v = [];
    const Ts = ms.tloustka, hS = p.soklVyska;
    const oMax = Math.max(0, Math.floor((Math.min(L, D) - 2 * Ts - 50) / 2));
    const o = Math.max(0, Math.min(p.soklOdsazeni, oMax));
    if (o < p.soklOdsazeni) v.push(`Odsazení soklu zmenšeno na ${o} mm, aby boční díly soklu vyšly aspoň 50 mm dlouhé.`);

    const znam = opts.Tc != null && opts.Tb != null;
    const Tc = opts.Tc || 0, Tb = opts.Tb || 0, dO = Math.max(0, opts.dnoOdspodu || 0);
    const Tmin = Math.min(Tc, Tb), Tmax = Math.max(Tc, Tb);
    const podDnem = znam && o >= Tmax;          // sokl celý pod dutinou → nese dno
    const hT = podDnem ? hS + dO : hS;          // výška dílů vč. skryté části
    const Ls = L - 2 * o, Ds = D - 2 * o - 2 * Ts;
    // stěny stojí na soklu, dno je výš → nosné lišty uvnitř soklu (přišroubované k soklu i ke dnu)
    const prekryv = Math.min(hS, 40);
    const xL = Math.max(o + Ts, Tb), lL = L - 2 * xL;
    const lisSoklu = znam && o < Tmin && dO > 0 && o + Ts >= Tc && lL > 0;
    const dnoNaSoklu = znam && dO === 0 && o + Ts > Tmax;
    // masivní dno je vzadu lepené do čela – pevně jen tam, jinak by ho šrouby vpředu sevřely a dno praskne
    const md = !!opts.masivDno;
    const sroubDna = co => md
      ? `dno přišroubovat shora do ${co} jen vzadu napevno, vpředu přes oválné otvory ve směru hloubky (masiv pracuje), do bočních dílů nešroubovat`
      : `dno přišroubovat shora do ${co} (vrut po 200 mm)`;
    let spoj = 'přišroubovat ke korpusu';
    if (podDnem) {
      spoj = (dO > 0 ? `horních ${zaokr(dO)} mm je skryto za stěnami až ke dnu; ` : '') + sroubDna('soklu');
    } else if (znam && o < Tmin) {
      spoj = lisSoklu ? 'korpus stojí spodními hranami stěn na soklu, ke dnu ho drží lišty'
        : dnoNaSoklu ? `korpus stojí stěnami na soklu, ${sroubDna('soklu')}`
        : 'korpus stojí stěnami na soklu, spojit kovovými úhelníky zevnitř';
      if (!lisSoklu && !dnoNaSoklu) v.push('Sokl leží jen pod stěnami a s dnem nemá společnou plochu – připevni ho ke stěnám zevnitř kovovými úhelníky.');
      if (Tmin - o < 8) v.push(`Stěny stojí na soklu jen ${zaokr(Tmin - o)} mm – zmenši odsazení soklu.`);
    } else if (znam) {
      v.push(`Odsazení soklu ${o} mm leží mezi tloušťkami stěn (${Tmin} a ${Tmax} mm) – sokl by nesl jen část stěn. Nastav odsazení pod ${Tmin} mm (sokl nese stěny), nebo aspoň ${Tmax} mm (sokl nese dno).`);
      spoj = 'spojit s korpusem kovovými úhelníky';
    }
    const rohy = 'rohy na tupo: boční díly mezi předním a zadním, lepit + 2 kolíky';
    dil('Sokl přední + zadní', ms, Ls, hT, 2, [
      { pos: [o, 0, D - o - Ts], size: [Ls, hT, Ts] },
      { pos: [o, 0, o], size: [Ls, hT, Ts] },
    ], { poznamka: `${rohy}; ${spoj}` });
    dil('Sokl boční', ms, Ds, hT, 2, [
      { pos: [o, 0, o + Ts], size: [Ts, hT, Ds] },
      { pos: [L - o - Ts, 0, o + Ts], size: [Ts, hT, Ds] },
    ], { poznamka: rohy });

    if (lisSoklu) {
      const hL = dO + prekryv;
      dil('Lišta soklu (k dnu)', ms, lL, hL, 2, [
        { pos: [xL, hS - prekryv, D - o - 2 * Ts], size: [lL, hL, Ts] },
        { pos: [xL, hS - prekryv, o + Ts], size: [lL, hL, Ts] },
      ], { poznamka: `na vnitřní líc předního a zadního soklu, ${prekryv} mm přes sokl a ${zaokr(dO)} mm nahoru ke dnu; lepit + vruty do soklu, ${md
        ? 'dno přišroubovat shora do zadní lišty napevno, do přední přes oválné otvory ve směru hloubky (masiv pracuje)'
        : 'dno přišroubovat shora do lišt'}` });
    }
    v.odsazeni = o; // skutečně použité odsazení (po omezení)
    v.vyska = hT;
    return v;
  }

  // Víko: zadní pevná část + přední sklopná (panty mezi nimi); yV = horní hrana korpusu, To = co zabírá vzadu opěradlo.
  // opts.Tc = tloušťka předního čela (aby sklopná část otevírala úložný prostor, ne jen přesah).
  // Úhel otevření je omezený tak, aby horní hrana víka nepřešla za záda (z = 0 – opěradlo, stěna místnosti).
  function viko(dil, varovani, p, mv, L, D, yV, To, opts = {}) {
    const Tv = mv.tloustka;
    const Tc = opts.Tc || 0;
    const pb = p.presahBoky, pp = p.presahPredni;
    const vD = L + 2 * pb, vS = D - To + pp;
    const otvorMin = Math.max(0, Math.min(150, (D - 2 * Tc - To) / 2));
    const zadMax = Math.max(20, D - Tc - To - SPARA_VIKA - otvorMin);
    const zad = Math.min(p.vikoPevna, zadMax);
    const pred = vS - zad - SPARA_VIKA;
    const zPant = To + zad + SPARA_VIKA;
    const otvor = D - Tc - zPant;
    if (zad < p.vikoPevna) varovani.push(`Pevná část víka zkrácena na ${zaokr(zad)} mm – sklopná část otevře ${zaokr(otvor)} mm hloubky úložného prostoru.`);
    const uhel = zPant >= pred ? 100 : Math.min(100, Math.floor(Math.acos(-zPant / pred) * 180 / Math.PI));
    dil('Víko – zadní pevná část', mv, vD, zad, 1, [
      { pos: [-pb, yV, To], size: [vD, Tv, zad] },
    ], { poznamka: 'přišroubovat zespodu k zadní stěně a bokům' });
    dil('Víko – přední sklopná část', mv, vD, pred, 1, [
      { pos: [-pb, yV, zPant], size: [vD, Tv, pred] },
    ], { skupina: 'viko', pant: { y: yV + Tv, z: zPant, uhel },
      poznamka: `panty na zadní hraně, spára ${SPARA_VIKA} mm; omezovač otevření (nůžkový výklopník nebo řetízek) na ${uhel}°` });
    return { vD, pp, pred, zad, uhel, otvor };
  }

  // Díly z desky, které se nevejdou na formát (nářez by je odmítl)
  function kontrolaFormatu(dily, M, varovani) {
    dily.forEach(d => {
      const m = M.najdi(d.material);
      if (!m || m.typ !== 'deska' || !m.formatD) return;
      const W = m.formatD - 2 * (m.orez || 0), H = m.formatS - 2 * (m.orez || 0);
      const vejde = (d.delka <= W && d.sirka <= H) || (!m.vlakno && d.delka <= H && d.sirka <= W);
      if (!vejde) varovani.push(`Díl „${d.nazev}“ ${zaokr(d.delka)} × ${zaokr(d.sirka)} mm se nevejde na desku ${m.nazev} (využitelně ${W} × ${H}) – slep ho ze dvou dílů na pero a drážku, nebo zvol větší desku.`);
    });
  }

  // Dřevo na pohledové díly (spárovky 18 mm skladem) – předvolba nastaví všechny dané materiály najednou
  const SMRK = 'demos-71349';
  const DREVA = [
    ['Smrk', 'spárovka smrk AB 18 mm – nejlevnější, měkčí (otlačí se)', SMRK],
    ['Borovice', 'spárovka borovice B/B 18 mm – levná, víc suků', 'demos-02822'],
    ['Buk', 'spárovka buk A/B 18 mm – tvrdý a odolný, asi 1,7× dražší', 'demos-76252'],
    ['Dub', 'spárovka dub A/B 18 mm – nejodolnější, asi 2,7× dražší', 'demos-76255'],
  ];
  // osb = parametry nejlevnější varianty: pohledové díly ze smrku, ostatní z OSB
  const OSB18 = 'demos-00310', OSB12 = 'demos-00314';
  // překližková varianta = OSB nahrazená vodovzdornou obalovou překližkou stejné tloušťky
  const PREKLIZKA = { [OSB18]: 'demos-161042', [OSB12]: 'demos-161040' };
  const sadaDreva = (klice, osb) => ({
    skupina: 'Materiál a cena',
    moznosti: (osb ? [
      { nazev: 'OSB + smrk', popis: 'čelo a víko smrková spárovka, ostatní OSB – levné; OSB se při řezání čepů drolí, řež ostrou pilou a hrany přelep páskou', params: osb },
      { nazev: 'Překližka + smrk', popis: 'čelo a víko smrková spárovka, ostatní vodovzdorná obalová překližka – o málo dražší než OSB, ale čepy se nedrolí, drží pevně a snese vlhko; povrch C/C před natřením přebrus',
        params: Object.fromEntries(Object.entries(osb).map(([k, v]) => [k, PREKLIZKA[v] || v])) },
    ] : [])
      .concat(DREVA.map(([nazev, popis, id]) => ({ nazev, popis, params: Object.fromEntries(klice.map(k => [k, id])) }))),
  });
  // sdíleno s dalšími truhlami
  T.truhla = { zaokr, cepu, dilku, masiv, rozmisti, deleni, popisDilku, postupOzubu, sokl, viko, kontrolaFormatu, SMRK, OSB18, OSB12, sadaDreva };

  T.produkty['lavice-truhla'] = {
    id: 'lavice-truhla',
    nazev: 'Lavice-truhla na přímé ozuby – náročné',
    tipNarocnost: 'Průchozí dlaby pro dno jsou ručně nejpracnější část (každý navrtat a vydlabat z obou stran). Méně práce: větší šířka čepu v Dalším nastavení, nebo výrobek „Lavice-truhla s luby“, kde je dno v drážce.',
    predvolby: [
      sadaDreva(['matCelo', 'matBok', 'matDno', 'matViko', 'matSokl', 'matOperadlo'],
        { matCelo: SMRK, matViko: SMRK, matBok: OSB18, matDno: OSB18, matSokl: OSB18, matOperadlo: OSB18 }),
    ],
    parametry: [
      { skupina: 'Rozměry', klic: 'delka', nazev: 'Délka', typ: 'cislo', min: 400, max: 2500, krok: 10, vychozi: 1340 },
      { klic: 'hloubka', nazev: 'Hloubka', typ: 'cislo', min: 250, max: 800, krok: 10, vychozi: 400 },
      { klic: 'vyska', nazev: 'Výška sedáku (vč. víka)', typ: 'cislo', min: 250, max: 700, krok: 5, vychozi: 480 },

      { skupina: 'Sokl a opěradlo', klic: 'sokl', nazev: 'Sokl', typ: 'prepinac', vychozi: true },
      { klic: 'operadlo', nazev: 'Opěradlo', typ: 'prepinac', vychozi: false },
      { klic: 'operadloVyska', nazev: 'Výška opěradla nad víkem', typ: 'cislo', min: 100, max: 700, krok: 10, vychozi: 350, kdyz: p => p.operadlo },

      { skupina: 'Materiál', pokrocile: true, klic: 'matCelo', nazev: 'Čela (přední, zadní)', typ: 'material', vychozi: SMRK },
      { pokrocile: true, klic: 'matBok', nazev: 'Boky', typ: 'material', vychozi: SMRK },
      { pokrocile: true, klic: 'matDno', nazev: 'Dno', typ: 'material', vychozi: SMRK },
      { pokrocile: true, klic: 'matViko', nazev: 'Víko', typ: 'material', vychozi: SMRK },
      { pokrocile: true, klic: 'matSokl', nazev: 'Sokl', typ: 'material', vychozi: SMRK, kdyz: p => p.sokl },
      { pokrocile: true, klic: 'matOperadlo', nazev: 'Opěradlo', typ: 'material', vychozi: SMRK, kdyz: p => p.operadlo },

      { skupina: 'Ozuby', pokrocile: true, klic: 'cepSirka', nazev: 'Šířka čepu', typ: 'cislo', min: 15, max: 150, krok: 1, vychozi: 40 },
      { pokrocile: true, klic: 'dnoOdspodu', nazev: 'Dno od spodní hrany', typ: 'cislo', min: 0, max: 100, krok: 1, vychozi: 20 },

      { skupina: 'Víko', pokrocile: true, klic: 'vikoPevna', nazev: 'Hloubka pevné zadní části', typ: 'cislo', min: 40, max: 400, krok: 5, vychozi: 120 },
      { klic: 'presahPredni', nazev: 'Přesah vpředu', typ: 'cislo', min: 0, max: 60, krok: 1, vychozi: 50 },
      { klic: 'presahBoky', nazev: 'Přesah na bocích', typ: 'cislo', min: 0, max: 60, krok: 1, vychozi: 0 },

      { skupina: 'Sokl', pokrocile: true, klic: 'soklVyska', nazev: 'Výška soklu', typ: 'cislo', min: 30, max: 200, krok: 5, vychozi: 80, kdyz: p => p.sokl },
      { pokrocile: true, klic: 'soklOdsazeni', nazev: 'Odsazení soklu', typ: 'cislo', min: 0, max: 100, krok: 1, vychozi: 30, kdyz: p => p.sokl },
    ],

    // starší projekty měly jeden materiál pro celý korpus
    migruj(p) {
      if (p.matKorpus && !p.matCelo) { p.matCelo = p.matKorpus; p.matBok = p.matKorpus; }
      delete p.matKorpus;
    },

    generuj(p, M) {
      const varovani = [];
      const mat = (id, co) => {
        const m = M.najdi(id);
        if (m) return m;
        varovani.push(`Materiál pro ${co} nenalezen – použit „${M.vse()[0].nazev}“.`);
        return M.vse()[0];
      };
      const mc = mat(p.matCelo, 'čela');
      const mb = mat(p.matBok, 'boky');
      const md = mat(p.matDno, 'dno');
      const mv = mat(p.matViko, 'víko');
      const ms = p.sokl ? mat(p.matSokl, 'sokl') : null;
      const mo = p.operadlo ? mat(p.matOperadlo, 'opěradlo') : null;

      const L = p.delka, D = p.hloubka;
      const Tc = mc.tloustka, Tb = mb.tloustka, Td = md.tloustka, Tv = mv.tloustka;
      const hS = p.sokl ? p.soklVyska : 0;
      const Hk = p.vyska - Tv - hS;          // výška stěn korpusu
      const y0 = hS;                          // spodek korpusu
      const Li = L - 2 * Tb, Di = D - 2 * Tc; // vnitřní rozměry (boky na koncích délky, čela na koncích hloubky)

      if (Hk < 80) varovani.push(`Stěny korpusu vychází jen ${zaokr(Hk)} mm vysoké – zvyš výšku sedáku nebo sniž sokl.`);
      if (Li <= 0 || Di <= 0) varovani.push('Délka nebo hloubka je menší než dvojnásobek tloušťky stěny.');
      if (Tc !== Tb) varovani.push(`Čela (${Tc} mm) a boky (${Tb} mm) mají různou tloušťku – hloubka ozubů se řídí tloušťkou protikusu.`);

      const dily = [];
      const dil = (nazev, m, delka, sirka, pocet, boxy, extra) => dily.push(Object.assign({
        nazev, material: m.id, delka: zaokr(delka), sirka: zaokr(sirka), tloustka: m.tloustka, pocet, boxy,
      }, extra || {}));

      // --- Rohové čepy: výška stěny rozdělená na lichý počet dílků (aspoň 3), sudé patří čelům, liché bokům ---
      let n = Math.round(Hk / p.cepSirka);
      if (n % 2 === 0) n += Hk / n > p.cepSirka ? 1 : -1;
      n = Math.max(3, n);
      const b = deleni(Hk, n), hc = b[1];
      if (hc < p.cepSirka * 0.7) varovani.push(`Na rohu musí být aspoň 3 dílky – čepy vychází jen ${zaokr(hc)} mm široké.`);

      const celoBoxy = [], bokBoxy = [];
      for (const z of [0, D - Tc]) {
        celoBoxy.push({ pos: [Tb, y0, z], size: [Li, Hk, Tc] });
        for (let i = 0; i < n; i += 2) {
          celoBoxy.push({ pos: [0, y0 + b[i], z], size: [Tb, b[i + 1] - b[i], Tc] });
          celoBoxy.push({ pos: [L - Tb, y0 + b[i], z], size: [Tb, b[i + 1] - b[i], Tc] });
        }
      }
      for (const x of [0, L - Tb]) {
        bokBoxy.push({ pos: [x, y0, Tc], size: [Tb, Hk, Di] });
        for (let i = 1; i < n; i += 2) {
          bokBoxy.push({ pos: [x, y0 + b[i], 0], size: [Tb, b[i + 1] - b[i], Tc] });
          bokBoxy.push({ pos: [x, y0 + b[i], D - Tc], size: [Tb, b[i + 1] - b[i], Tc] });
        }
      }
      const cepyCelo = (n + 1) / 2, cepyBok = (n - 1) / 2;
      dil('Čelo (přední + zadní)', mc, L, Hk, 2, celoBoxy,
        { poznamka: `${cepu(cepyCelo)} na každém konci, ${popisDilku(b)}, hloubka ${Tb} mm` });
      dil('Bok', mb, D, Hk, 2, bokBoxy,
        { poznamka: `${cepu(cepyBok)} na každém konci, ${popisDilku(b)}, hloubka ${Tc} mm` });

      // --- Dno: průběžné čepy do všech čtyř stěn ---
      // Masivní dno (vlákno po délce) pracuje do hloubky: vzadu lepené do čela, vpředu vůle za ramenem,
      // čepy do předního čela a do boků volně, dlaby v bocích dopředu prodloužené.
      const dO = Math.max(0, Math.min(p.dnoOdspodu, Hk - Td));
      if (dO < p.dnoOdspodu) varovani.push(`Dno posunuto na ${zaokr(dO)} mm od spodní hrany, aby nebylo nad horní hranou stěn.`);
      if (Td > Hk) varovani.push('Dno je silnější než výška stěn.');
      if (dO > 0 && dO < 15) varovani.push(`Pod dlaby pro dno zůstane jen ${zaokr(dO)} mm dřeva – při zatížení se vylomí. Dej dno aspoň 15 mm od spodní hrany, nebo 0 (otevřené zářezy).`);
      const yD = y0 + dO;
      const vule = masiv(md) && Di > 0 ? Math.ceil(Di * 0.01) : 0;
      const cx = rozmisti(Li, p.cepSirka), cz = rozmisti(Di - vule, p.cepSirka);
      const plusBok = vule ? cz.zacatky.map(s => Math.max(0.5, Math.ceil(2 * vule * (s + cz.sirka) / Di) / 2)) : null;
      const dnoBoxy = [{ pos: [Tb, yD, Tc], size: [Li, Td, Di - vule] }];
      const PR = 0.5; // čep o kousek přečnívá líc, aby byl v modelu vidět
      cx.zacatky.forEach(s => {
        dnoBoxy.push({ pos: [Tb + s, yD, -PR], size: [cx.sirka, Td, Tc + PR] });
        dnoBoxy.push({ pos: [Tb + s, yD, D - Tc - vule], size: [cx.sirka, Td, Tc + vule + PR] });
      });
      cz.zacatky.forEach(s => {
        dnoBoxy.push({ pos: [-PR, yD, Tc + s], size: [Tb + PR, Td, cz.sirka] });
        dnoBoxy.push({ pos: [L - Tb, yD, Tc + s], size: [Tb + PR, Td, cz.sirka] });
      });
      dil('Dno', md, L, D, 1, dnoBoxy, {
        poznamka: `průběžné čepy: ${cx.n}× do čel, ${cz.n}× do boků, šířka ${zaokr(cx.sirka)}/${zaokr(cz.sirka)} mm; čisté ${zaokr(Li)} × ${zaokr(Di - vule)}`
          + (vule ? `; masiv pracuje – lepit jen čepy do zadního čela, vpředu vůle ${vule} mm, do předního čela a boků nelepit` : ''),
      });

      if (ms) varovani.push(...sokl(dil, p, ms, L, D, { Tc, Tb, dnoOdspodu: dO, masivDno: vule > 0 }));

      // --- Opěradlo: přeplátuje zadní čelo zezadu a je k němu přišroubované zevnitř (dlouhé rameno proti páce) ---
      const To = mo ? mo.tloustka : 0;
      if (mo) {
        const hOp = p.operadloVyska + Tv;
        // přes celou výšku čela; kratší jen když se tím vejde na šířku desky a zůstane aspoň polovina
        let prs = Hk;
        if (mo.typ === 'deska' && mo.formatS) {
          const vejde = mo.formatS - 2 * (mo.orez || 0) - hOp;
          if (vejde >= Hk / 2) prs = Math.min(Hk, vejde);
        }
        prs = Math.floor(prs);
        const vrutu = Math.max(3, Math.ceil(L / 250) + 1);
        const dVrut = Math.max(20, Math.floor((Tc + To - 4) / 5) * 5);
        dil('Opěradlo', mo, L, hOp + prs, 1, [
          { pos: [0, y0 + Hk - prs, -To], size: [L, hOp + prs, To] },
        ], { poznamka: `zezadu přes zadní čelo (přeplátování ${prs} mm), přišroubovat zevnitř skrz čelo: 2 řady po ${vrutu} vrutech 5 × ${dVrut} + lepit` });
      }

      // víko začíná na zadní hraně korpusu, opěradlo je za ní
      const { vD, pp } = viko(dil, varovani, p, mv, L, D, y0 + Hk, 0, { Tc });

      kontrolaFormatu(dily, M, varovani);

      const vnitrniV = Hk - dO - Td;
      const objem = Li > 0 && Di > 0 && vnitrniV > 0 ? (Li * (Di - vule) * vnitrniV) / 1e6 : 0;
      const celkV = p.vyska + (mo ? p.operadloVyska : 0);
      const souhrn = `${zaokr(vD)} × ${zaokr(D + pp + To)} × ${zaokr(celkV)} mm (D × H × V) · úložný prostor ${zaokr(Li)} × ${zaokr(Di)} × ${zaokr(vnitrniV)} mm ≈ ${Math.round(objem)} l · na rohu ${popisDilku(b)}`;

      return {
        dily, varovani, souhrn,
        vykresy: vykresy({ L, D, Hk, Tc, Tb, Td, n, b, cx, cz, dnoOdspodu: dO, vule, plusBok, mc, mb, md }),
      };
    },
  };
})(window.Truhla);
