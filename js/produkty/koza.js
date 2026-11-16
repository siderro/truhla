window.Truhla = window.Truhla || {};

// Skládací koza: dva shodné rámy, každý = horní trám (na hranu) + 2 nohy přiložené zvenku + dolní příčka na čep
// a dlab. Horní hrana kozy je ze dvou trámů spojených panty na horní ploše přes spáru: složená koza má trámy lícem
// na sebe, při rozevření se rámy otočí kolem osy pantu o ±α (horní plocha trámů tvoří mělké V, pant se přivírá).
// Rozevření drží 2 řetízky mezi dolními příčkami.
// Nohy mají oba konce vodorovně (horní ve výšce vnější horní hrany trámu) – složený řez: pokos β, úkos listu α.
// Souřadnice v mm: x = délka (zleva), y = výška (od země), z = hloubka (0 = zadní líce nohou dole, roste dopředu).
// V rovině rámu: u = nahoru po rámu, n = kolmo ven z rámu; počátek A = osa pantu (vnitřní horní hrana trámu).
(function (T) {
  'use strict';
  const zaokr = x => Math.round(x * 10) / 10;
  const stupne = r => zaokr(r * 180 / Math.PI);
  const RAMENO = 8;                                // osazení čepu příčky nahoře a dole
  const SLOUPCE_REZU = ['Řez', 'Pila – pokos', 'Pila – úkos listu', 'Rýsování bez úhloměru (posun rysky)'];

  const plus = (a, b) => a.map((c, i) => c + b[i]);
  const krat = (a, k) => a.map(c => c * k);
  const skal = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  // natočený kvádr zadaný středem; rez = roviny [nx, ny, nz, d] (ponechá n·p ≤ d)
  const sikmy = (stred, size, rot, rez) => ({ pos: stred.map((c, i) => c - size[i] / 2), size, rot, rez });

  T.produkty.koza = {
    id: 'koza',
    nazev: 'Koza skládací – dva rámy na pantech',
    predvolby: [{ skupina: 'Materiál a cena', moznosti: [
      { nazev: 'Hrubé řezivo', popis: 'trámy z omítané fošny, nohy a příčky z latí – nejlevnější, nehoblované',
        params: { matNosnik: 'demos-308043', matNoha: 'demos-262642', matPricka: 'demos-262646' } },
      { nazev: 'KVH', popis: 'trámy a nohy z KVH – hoblované, sušené, rovné; příčky z latě',
        params: { matNosnik: 'demos-459805', matNoha: 'demos-361760', matPricka: 'demos-262646' } },
    ] }],
    parametry: [
      { skupina: 'Rozměry', klic: 'delka', nazev: 'Délka trámů', typ: 'cislo', min: 400, max: 2000, krok: 5, vychozi: 800 },
      { klic: 'vyska', nazev: 'Výška (pracovní hrana nahoře)', typ: 'cislo', min: 400, max: 1100, krok: 5, vychozi: 750 },
      { klic: 'rozkrok', nazev: 'Rozkročení dole (vnější líce nohou)', typ: 'cislo', min: 250, max: 900, krok: 5, vychozi: 560 },
      { pokrocile: true, klic: 'presahNosniku', nazev: 'Přesah trámu přes nohy', typ: 'cislo', min: 0, max: 300, krok: 5, vychozi: 70 },
      { pokrocile: true, klic: 'rozevreni', nazev: 'Rozevření nohou do strany (dole, každá)', typ: 'cislo', min: 0, max: 200, krok: 5, vychozi: 0 },
      { pokrocile: true, klic: 'vyskaPricky', nazev: 'Dolní příčka od země', typ: 'cislo', min: 50, max: 400, krok: 5, vychozi: 150 },

      { skupina: 'Materiál', pokrocile: true, klic: 'matNosnik', nazev: 'Horní trámy (na hranu)', typ: 'material', vychozi: 'demos-308043' },
      { pokrocile: true, klic: 'matNoha', nazev: 'Nohy', typ: 'material', vychozi: 'demos-262642' },
      { pokrocile: true, klic: 'matPricka', nazev: 'Dolní příčky', typ: 'material', vychozi: 'demos-262646' },
    ],

    generuj(p, M) {
      const varovani = [];
      const mat = (id, co) => {
        const m = M.najdi(id);
        if (m) return m;
        varovani.push(`Materiál pro ${co} nenalezen – použit „${M.vse()[0].nazev}“.`);
        return M.vse()[0];
      };
      const mN = mat(p.matNosnik, 'trámy'), mL = mat(p.matNoha, 'nohy'), mP = mat(p.matPricka, 'příčky');
      const sir = m => m.sirka || m.tloustka;

      const dily = [];
      const skupiny = new Map();
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

      const L = p.delka, H = p.vyska, R = p.rozkrok;
      const tR = mN.tloustka, hR = sir(mN);         // trám na hranu: tloušťka kolmo k rámu, výška v rovině rámu
      const t = mL.tloustka, a = sir(mL);           // noha: tloušťka kolmo k rámu, šířka v rovině rámu
      const pt = mP.tloustka, ph = sir(mP);          // příčka: tloušťka kolmo k rámu, výška v rovině rámu
      const d = tR + t;                              // vnější líc nohy od vnitřního líce trámu

      // sklon rámu α: vnější líc nohy dole na R/2 od osy pantu → (H + t·sin α)·tg α + d·cos α = R/2
      const dosah = al => (H + t * Math.sin(al)) * Math.tan(al) + d * Math.cos(al);
      let alfa = 0;
      if (R / 2 <= d) varovani.push(`Rozkročení ${R} mm je menší než dva složené rámy (2 × ${d} mm) – koza by nestála; zvětši rozkročení.`);
      else {
        let lo = 0, hi = Math.PI / 4;
        for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (dosah(m) < R / 2) lo = m; else hi = m; }
        alfa = (lo + hi) / 2;
      }
      const sa = Math.sin(alfa), ca = Math.cos(alfa), ta = Math.tan(alfa);
      if (stupne(alfa) < 8) varovani.push(`Rámy jsou skloněné jen ${stupne(alfa)}° – koza se bude snadno převracet; zvětši rozkročení dole.`);
      if (stupne(alfa) > 22) varovani.push(`Rámy jsou skloněné ${stupne(alfa)}° – nohy budou ujíždět a řetízky ponesou velkou sílu; zmenši rozkročení.`);

      // rovina rámu: u nahoru po rámu, n ven; přední rám (z > osa) a zadní (zrcadlově)
      const yA = H - tR * sa, zA = R / 2;
      const ramy = [
        { nazev: 'přední', zn: 1 },
        { nazev: 'zadní', zn: -1 },
      ].map(r => {
        const u = [0, ca, -r.zn * sa], n = [0, sa, r.zn * ca];
        // bod rámu: x po délce, uu po rovině rámu od osy pantu, nn kolmo ven
        const bod = (x, uu, nn) => plus(plus([x, yA, zA], krat(u, uu)), krat(n, nn));
        return Object.assign(r, { u, n, bod, pant: { y: yA, z: zA, uhel: -r.zn * stupne(alfa) } });
      });

      // --- Horní trámy ---
      const pozTram = `na hranu, vnitřní líce obou trámů se ve složené koze dotýkají`;
      ramy.forEach(r => kus('Horní trám', mN, L, Object.assign(sikmy(r.bod(L / 2, -hR / 2, tR / 2), [L, hR, tR], [-r.zn * alfa, 0, 0]), { pant: r.pant }),
        { poznamka: pozTram }));

      // --- Nohy: přiložené zvenku na trám, oba konce vodorovně ---
      const pn = p.presahNosniku, s = p.rozevreni;
      const Hs = H / ca;                             // výška rámu po rovině (vnitřní líc nohy: od u = −Hs do u = 0)
      const beta = Math.atan(s / Hs), cb = Math.cos(beta), tb = Math.tan(beta);
      const Le = H / (ca * cb);                      // všechny čtyři podélné hrany nohy
      const odmA = t * ta / cb, odmB = a * tb;       // posun řezu přes tloušťku / přes šířku nohy
      const sirkaVodor = a / cb;                     // vodorovný řez nohou v rovině rámu
      const xVnejsi = uu => pn + s * uu / Hs;        // vnější hrana levé nohy (k čelu kozy) ve výšce u
      if (2 * (pn + sirkaVodor) + 40 > L) varovani.push(`Přesah trámu ${pn} mm je na délku ${L} mm moc – nohy by se uprostřed srazily.`);
      if (xVnejsi(-Hs) < -0.5) varovani.push(`Nohy se rozevírají víc, než je přesah trámu – dole vyčnívají ${zaokr(-xVnejsi(-Hs))} mm za konec trámu (to nevadí, jen to vezmi v úvahu).`);
      if (hR < 80) varovani.push(`Trám ${hR} mm je nízký – noha k němu přiléhá jen na ${hR} mm; zvol trám aspoň 80 mm vysoký.`);
      if (tR < 50 && L > 1000) varovani.push(`Trám ${tR} × ${hR} mm je na délku ${L} mm slabý – bude se prohýbat; zvol fošnu nebo hranol.`);
      const vrut = Math.floor((t + tR - 8) / 10) * 10;
      const pozNoha = `zvenku na trám (horní konec v rovině s vnější horní hranou trámu), lepit (D3) + 2 vruty ${vrut <= 100 ? 6 : 8} × ${vrut} z vnější strany, předvrtat; oba konce vodorovně – pokos ${stupne(beta)}°, úkos ${stupne(alfa)}°`;
      ramy.forEach(r => [false, true].forEach(prava => {
        const zn = prava ? -1 : 1;                   // levá noha se nahoru stáčí k +x
        const xOsa = pn + sirkaVodor / 2;            // osa nohy na vnitřním líci nahoře (u = 0)
        const uc = -Hs / 2, xc = xOsa + s * uc / Hs;
        const stred = r.bod(prava ? L - xc : xc, uc, tR + t / 2);
        const box = sikmy(stred, [a, Le + 2 * (a + t), t], [-r.zn * alfa, 0, -zn * beta], [[0, -1, 0, 0], [0, 1, 0, H]]);
        kus('Noha', mL, Le, Object.assign(box, { pant: r.pant }), { poznamka: pozNoha });
      }));

      // --- Dolní příčka: v rovině nohou (uprostřed jejich tloušťky), čep a dlab ---
      const nm = tR + t / 2;
      const uPodlaha = -(yA + nm * sa) / ca;         // podlaha na střední rovině nohou
      const uP = uPodlaha + p.vyskaPricky / ca;       // spodní hrana příčky
      const svetlost = uu => L - 2 * (xVnejsi(uu) + sirkaVodor);
      const cep = Math.max(15, Math.min(30, Math.round(a * 0.5)));
      const tc = Math.max(6, Math.round(pt / 3));    // jednoduchý čep = třetina tloušťky
      const Wp = svetlost(uP) + 2 * cep;             // po spodní (delší) hraně
      if (p.vyskaPricky + ph > H / 2) varovani.push(`Dolní příčka ve výšce ${p.vyskaPricky} mm je nad polovinou výšky – rám bude měkký; dej ji níž.`);
      if (pt > t) varovani.push(`Příčka (${pt} mm) je tlustší než noha (${t} mm) – bude přečnívat přes líc nohou.`);
      if (cep > a - 15) varovani.push(`Čep příčky ${cep} mm je na nohu širokou ${a} mm moc dlouhý – za dlabem zbude jen ${a - cep} mm.`);
      ramy.forEach(r => {
        const uc = uP + ph / 2;
        const box = sikmy(r.bod(L / 2, uc, nm), [svetlost(uc) + 2 * a, ph, pt], [-r.zn * alfa, 0, 0]);
        // konce příčky po vnitřních hranách nohou (ve 3D bez čepů)
        const e2L = plus(krat([1, 0, 0], cb), krat(r.u, -Math.sin(beta)));
        const e2R = plus(krat([1, 0, 0], cb), krat(r.u, Math.sin(beta)));
        const PL = r.bod(xVnejsi(0) + sirkaVodor, 0, 0), PR = r.bod(L - xVnejsi(0) - sirkaVodor, 0, 0);
        box.rez = [[-e2L[0], -e2L[1], -e2L[2], -skal(e2L, PL)], [...e2R, skal(e2R, PR)]];
        kus('Dolní příčka', mP, Wp, Object.assign(box, { pant: r.pant }),
          { poznamka: `světlost ${zaokr(svetlost(uP))} mm (dole) + 2 čepy ${cep} mm${s ? `; ramena čepů pod ${stupne(beta)}° rovnoběžně s nohou` : ''}` });
      });

      // --- Řetízky: mezi vnitřními líci dolních příček, kousek od nohou ---
      const yRet = p.vyskaPricky + ph / 2;
      const bodRet = r => r.bod(0, uPodlaha + yRet / ca, nm - pt / 2);
      const retez = Math.abs(bodRet(ramy[0])[2] - bodRet(ramy[1])[2]);
      dily[0].poznamka += `; kování: ${L > 1000 ? 3 : 2} panty ${hR >= 80 ? 60 : 50} mm na horní plochu přes spáru (listy zapustit, osa kloubu v rovině horní plochy na spáře; vnitřní horní hrany trámů pod kloubem srazit asi 3 mm, ať se při skládání nezadřou), 2 řetízky mezi dolními příčkami ≈ ${Math.round(retez)} mm mezi oky (vruty s okem, délku doladit karabinou)`;

      // --- Výkresy ---
      const cs = x => zaokr(x).toLocaleString('cs-CZ');
      const st = x => `${cs(x * 180 / Math.PI)}°`;
      const uhelA = Math.atan2(odmA, t), uhelB = Math.atan2(odmB, a);
      // pohled na úzký bok nohy (k příčce): x po noze od nejnižšího bodu, y přes tloušťku (0 = vnější líc)
      const Wn = Le + odmA;
      const dlab0 = (p.vyskaPricky / ca + RAMENO) / cb + odmA / 2;
      const dlabD = (ph - 2 * RAMENO) / cb + cep * tb;   // při rozevření dlab kolmo, o čep·tg β delší
      const rezNohy = [
        { pts: [[0, 0], [odmA, t], [0, t]] },
        { pts: [[Le, 0], [Wn, 0], [Wn, t]] },
      ];
      // celá noha s kótami – dlab leží mimo detail spodního konce
      const pohledy = [{
        nazev: `Umístění dlabu – úzký bok k příčce, dlab ${cs(dlab0)} mm od nejnižšího bodu, ${cs((t - tc) / 2)} mm od líce`,
        W: Wn, H: t, odpad: rezNohy, dlaby: [{ x: dlab0, y: (t - tc) / 2, w: dlabD, h: tc }],
        kotyX: [0, dlab0, dlab0 + dlabD, Wn], kotyY: [0, (t - tc) / 2, (t + tc) / 2, t],
      }];
      if (s > 0) {
        const Wb = Le + odmB;
        pohledy.push({
          nazev: `Široká plocha (vnější líc) – rozevření β = ${st(beta)}, posun rysky ${cs(odmB)} mm`,
          W: Wb, H: a, odpad: [{ pts: [[0, 0], [odmB, a], [0, a]] }, { pts: [[Le, 0], [Wb, 0], [Wb, a]] }],
          uhly: [{ x: 0, y: 0, od: 90 - uhelB * 180 / Math.PI, do: 90, text: st(uhelB) }],
          kotyX: [0, odmB, Le, Wb], kotyY: [0, a],
        });
      }
      const vykresy = [
        {
          nazev: 'Noha (pohled na úzký bok k příčce)', ks: 4, W: Wn, H: t, barva: mL.barva, odpad: rezNohy,
          dlaby: [{ x: dlab0, y: (t - tc) / 2, w: dlabD, h: tc }], vyrezu: 0, dlabu: 1, sikmych: 2,
          uhly: [{ x: 0, y: 0, od: 90 - uhelA * 180 / Math.PI, do: 90, text: st(uhelA) }],
          detail: { w: Math.min(Wn, odmA + 2.5 * t), h: t }, detailPopis: 'Detail spodního konce – šikmý řez (horní konec stejně, rovnoběžně)',
          kotyX: [0, odmA, dlab0, dlab0 + dlabD, Le, Wn], kotyY: [0, (t - tc) / 2, (t + tc) / 2, t],
          pohledy,
          postup: [
            `Nastav pilu: ${s ? `pokos ${st(beta)}, ` : ''}úkos listu ${st(alfa)}. Nohu polož širokou plochou na stůl pily, úzkým bokem k pravítku.`,
            `Seřízni první konec. Odměř ${cs(Le)} mm po hraně a stejným nastavením seřízni druhý konec – řezy jsou rovnoběžné, další noha navazuje bez odpadu.`,
            `Bez pokosové pily: na úzkém boku posuň rysku přes tloušťku o ${cs(odmA)} mm${s ? `, na široké ploše přes šířku o ${cs(odmB)} mm` : ''}, rysky spoj kolem dokola a řež ruční pilou v odpadu těsně vedle rysky.`,
            `Levá a pravá noha jsou zrcadlové${s ? ' (pokos na opačnou stranu)' : ''} – nohy předního a zadního rámu jsou stejné.`,
            `Dlab pro čep příčky na úzkém boku: ${cs(dlabD)} × ${tc} mm, hloubka ${cep + 2} mm, ${cs(dlab0)} mm od nejnižšího bodu nohy${s ? ` (dlab kolmo do nohy, o ${cs(cep * tb)} mm delší kvůli šikmému čepu)` : ''}.`,
          ],
          popis: [
            `Všechny 4 podélné hrany jsou dlouhé ${cs(Le)} mm; přířez aspoň ${cs(Wn)} mm. Dole stojí noha celou plochou na zemi, nahoře lícuje s vnější horní hranou trámu.`,
            `Nohu přilož zvenku na trám tak, aby vnější hrana (k čelu kozy) byla nahoře ${pn} mm od konce trámu; lepit (D3) a 2 vruty ${vrut <= 100 ? 6 : 8} × ${vrut} z vnější strany, předvrtat. Pevnější varianta: 2 svorníky M8 s podložkami.`,
          ],
          tabulky: [{ nazev: 'Nastavení řezu', sloupce: SLOUPCE_REZU, radky: [
            ['Oba konce nohy (rovnoběžně)', s ? st(beta) : '0° (kolmo)', st(alfa),
              `úzký bok: ${cs(odmA)} mm přes ${t} mm${s ? `; široká plocha: ${cs(odmB)} mm přes ${a} mm` : ''}`],
          ] }],
        },
      ];
      // příčka: ramena rovnoběžně s nohou (β); y = 0 spodní hrana
      {
        const W = Wp, o = ph * tb, r = RAMENO * tb;
        const odpad = [
          { pts: [[0, 0], [cep, 0], [cep + r, RAMENO], [r, RAMENO]] },
          { pts: [[(ph - RAMENO) * tb, ph - RAMENO], [cep + (ph - RAMENO) * tb, ph - RAMENO], [cep + o, ph], [o, ph]] },
          { pts: [[W, 0], [W - cep, 0], [W - cep - r, RAMENO], [W - r, RAMENO]] },
          { pts: [[W - (ph - RAMENO) * tb, ph - RAMENO], [W - cep - (ph - RAMENO) * tb, ph - RAMENO], [W - cep - o, ph], [W - o, ph]] },
        ];
        if (o > 0.5) odpad.push({ pts: [[0, 0], [o, ph], [0, ph]] }, { pts: [[W, 0], [W, ph], [W - o, ph]] });
        vykresy.push({
          nazev: 'Dolní příčka', ks: 2, W, H: ph, barva: mP.barva, odpad, dlaby: [], vyrezu: 4, dlabu: 0, sikmych: s ? 2 : 0,
          uhly: s ? [{ x: cep, y: 0, od: 90 - stupne(beta), do: 90, text: st(beta) }] : [],
          detail: { w: Math.min(W, cep * 4), h: ph },
          kotyX: [0, cep, cep + o, W - cep, W], kotyY: [0, RAMENO, ph - RAMENO, ph],
          popis: [
            `Délka ${cs(W)} mm po spodní hraně = světlost ${cs(svetlost(uP))} mm + 2 čepy ${cep} mm.`,
            `Čep výšky ${cs(ph - 2 * RAMENO)} mm a tloušťky ${tc} mm (třetina), osazení ${RAMENO} mm` + (s
              ? `; ramena a konec čepu řezat pod ${st(beta)} (rovnoběžně s nohou) – posun rysky ${cs(o)} mm na výšku příčky.`
              : '; ramena kolmo.'),
            'Čepy lepit, rám stáhnout a zkontrolovat úhlopříčky.',
          ],
          tabulky: s ? [{ nazev: 'Nastavení řezu', sloupce: SLOUPCE_REZU, radky: [
            ['Ramena a konce čepů', st(beta), '0°', `${cs(o)} mm přes výšku ${ph} mm`]] }] : [],
        });
      }

      const slozena = `${zaokr(L)} × ${zaokr(2 * d)} × ${zaokr(Hs)} mm`;
      const souhrn = `${zaokr(L)} × ${zaokr(R)} × ${zaokr(H)} mm (D × H × V) · složená ≈ ${slozena} · rámy ${stupne(alfa)}° od svislice · nohy: úkos ${stupne(alfa)}°${s ? `, pokos ${stupne(beta)}°` : ''} · kování: ${L > 1000 ? 3 : 2} panty, 2 řetízky ≈ ${Math.round(retez)} mm`;
      return { dily, varovani, souhrn, vykresy, kloub: ['Složit kozu', 'Rozložit kozu'] };
    },
  };
})(window.Truhla);
