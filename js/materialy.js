window.Truhla = window.Truhla || {};

// Knihovna materiálů a globální nastavení výpočtu.
// Vlastní materiály jsou v localStorage, katalog dodavatele (katalog-demos.js) jen pro čtení.
(function (T) {
  'use strict';
  const KLIC = 'truhla.materialy.v1';
  const KLIC_NAST = 'truhla.nastaveni.v1';

  // deska: formát formatD × formatS (vlákno vede po formatD), orez = okrajový ořez na každé straně
  // rezivo: průřez tloustka × sirka, obchodní délka
  const VYCHOZI = [
    { id: 'sparovka-buk-18', typ: 'deska', nazev: 'Spárovka buk 18 mm', tloustka: 18, formatD: 2000, formatS: 1200, vlakno: true, orez: 10, barva: '#d6ae84' },
    { id: 'sparovka-dub-20', typ: 'deska', nazev: 'Spárovka dub 20 mm', tloustka: 20, formatD: 2000, formatS: 1200, vlakno: true, orez: 10, barva: '#c49a6c' },
    { id: 'preklizka-18', typ: 'deska', nazev: 'Překližka bříza 18 mm', tloustka: 18, formatD: 2500, formatS: 1250, vlakno: true, orez: 10, barva: '#e9d5ac' },
    { id: 'preklizka-12', typ: 'deska', nazev: 'Překližka bříza 12 mm', tloustka: 12, formatD: 2500, formatS: 1250, vlakno: true, orez: 10, barva: '#eedcb8' },
    { id: 'lamino-18', typ: 'deska', nazev: 'Lamino bílé 18 mm', tloustka: 18, formatD: 2800, formatS: 2070, vlakno: false, orez: 10, barva: '#f1f0ec' },
    { id: 'prkno-smrk-24x120', typ: 'rezivo', nazev: 'Prkno smrk 24×120', tloustka: 24, sirka: 120, delka: 4000, barva: '#e8c99b' },
    { id: 'hranol-smrk-40x40', typ: 'rezivo', nazev: 'Hranol smrk 40×40', tloustka: 40, sirka: 40, delka: 3000, barva: '#cfa874' },
  ];
  const NAST_VYCHOZI = { prorez: 4, pridavekDelka: 20, pridavekSirka: 10 };

  const kopie = x => JSON.parse(JSON.stringify(x));
  function nacti(klic, vychozi) {
    try { const s = localStorage.getItem(klic); if (s) return JSON.parse(s); } catch (e) { /* bez úložiště */ }
    return kopie(vychozi);
  }
  function zapis(klic, hodnota) {
    try { localStorage.setItem(klic, JSON.stringify(hodnota)); } catch (e) { /* bez úložiště */ }
  }

  const KATALOG = (T.katalogDemos && T.katalogDemos.materialy) || [];
  const zKatalogu = id => KATALOG.find(m => m.id === id) || null;

  // Skupiny katalogu: stejný materiál, kvalita a tloušťka v různých formátech (délkách).
  // Uživatel volí skupinu, nářez z ní sám vybere nejlevnější kombinaci formátů.
  const klicSkupiny = m => m.nazev.replace(/ \(na obj\.\)$/, '').replace(/ · [^·]*$/, '');
  const SKUPINY = new Map();
  KATALOG.forEach(m => {
    const id = 'skupina:' + klicSkupiny(m);
    if (!SKUPINY.has(id)) SKUPINY.set(id, { id, typ: m.typ, skupina: true, kategorie: m.kategorie, nazev: klicSkupiny(m), dodavatel: m.dodavatel, formaty: [] });
    SKUPINY.get(id).formaty.push(m);
  });
  // Vlastnosti pro kontroly ve výrobcích: tloušťka, barva a největší dostupný rozměr
  SKUPINY.forEach(s => {
    const f = s.formaty, max = k => Math.max(...f.map(m => m[k]));
    Object.assign(s, { tloustka: f[0].tloustka, barva: f[0].barva });
    if (s.typ === 'deska') Object.assign(s, { vlakno: f[0].vlakno, orez: f[0].orez, formatD: max('formatD'), formatS: max('formatS') });
    else Object.assign(s, { sirka: f[0].sirka, delka: max('delka') });
    const sCenou = f.filter(m => m.cena);
    if (sCenou.length) s.cenaOd = Math.min(...sCenou.map(m => m.cena / (m.typ === 'deska' ? m.formatD * m.formatS / 1e6 : m.delka / 1000)));
  });
  const skupinaPro = id => { const m = zKatalogu(id); return m ? SKUPINY.get('skupina:' + klicSkupiny(m)) : null; };

  let seznam = nacti(KLIC, VYCHOZI); // vlastní materiály
  let nastaveni = Object.assign({}, NAST_VYCHOZI, nacti(KLIC_NAST, {}));
  const uloz = () => zapis(KLIC, seznam);

  T.materialy = {
    vse: () => seznam.concat(KATALOG, [...SKUPINY.values()]),
    vlastni: () => seznam,
    katalog: () => KATALOG,
    skupiny: () => [...SKUPINY.values()],
    katalogStazeno: () => (T.katalogDemos && T.katalogDemos.stazeno) || null,
    zdroj: () => KATALOG.length ? { nazev: 'Démos trade', web: 'demos-trade.cz', url: 'https://www.demos-trade.cz/', stazeno: T.katalogDemos.stazeno } : null,
    jeKatalog: id => !!zKatalogu(id) || SKUPINY.has(id),
    najdi: id => seznam.find(m => m.id === id) || zKatalogu(id) || SKUPINY.get(id),
    // starší projekty ukládaly konkrétní katalogový formát – převést na jeho skupinu
    normalizuj: id => { const s = skupinaPro(id); return s ? s.id : id; },
    pridej(m) {
      m.id = m.id || (m.typ + '-' + Date.now().toString(36));
      seznam.push(m);
      uloz();
      return m;
    },
    // kopie katalogové položky do vlastních, aby šla upravit
    zkopiruj(id) {
      const k = zKatalogu(id);
      if (!k) return null;
      return this.pridej(Object.assign(kopie(k), { id: undefined, nazev: k.nazev + ' (upraveno)' }));
    },
    zmen(id, zmeny) {
      const m = seznam.find(x => x.id === id);
      if (m) { Object.assign(m, zmeny); uloz(); }
    },
    odeber(id) {
      seznam = seznam.filter(m => m.id !== id);
      uloz();
    },
    obnovVychozi() {
      seznam = kopie(VYCHOZI);
      nastaveni = Object.assign({}, NAST_VYCHOZI);
      uloz();
      zapis(KLIC_NAST, nastaveni);
    },
    // přidá materiály, které v knihovně chybí (při importu projektu)
    sluc(list) {
      (list || []).forEach(m => { if (m && m.id && !this.najdi(m.id)) seznam.push(m); });
      uloz();
    },
    nastaveni: () => nastaveni,
    nastav(klic, hodnota) {
      nastaveni[klic] = hodnota;
      zapis(KLIC_NAST, nastaveni);
    },
  };
})(window.Truhla);
