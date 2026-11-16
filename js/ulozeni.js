window.Truhla = window.Truhla || {};

// Projekty v localStorage + export/import JSON.
(function (T) {
  'use strict';
  const KLIC = 'truhla.projekty.v1';
  const KLIC_AKT = 'truhla.aktualni.v1';

  function cti(klic, vychozi) {
    try { const s = localStorage.getItem(klic); if (s) return JSON.parse(s); } catch (e) { /* bez úložiště */ }
    return vychozi;
  }
  function pis(klic, h) {
    try { localStorage.setItem(klic, JSON.stringify(h)); } catch (e) { /* bez úložiště */ }
  }

  T.ulozeni = {
    seznam: () => Object.keys(cti(KLIC, {})).sort((a, b) => a.localeCompare(b, 'cs')),
    uloz(stav) {
      const vse = cti(KLIC, {});
      vse[stav.nazev] = Object.assign({}, stav, { ulozeno: new Date().toISOString() });
      pis(KLIC, vse);
    },
    nacti: nazev => cti(KLIC, {})[nazev] || null,
    smaz(nazev) {
      const vse = cti(KLIC, {});
      delete vse[nazev];
      pis(KLIC, vse);
    },
    ulozAktualni: stav => pis(KLIC_AKT, stav),
    nactiAktualni: () => cti(KLIC_AKT, null),

    exportuj(stav, M) {
      const pouzite = new Set(Object.values(stav.params));
      const data = {
        format: 'truhla-projekt', verze: 1, exportovano: new Date().toISOString(),
        projekt: stav,
        materialy: M.vse().filter(m => pouzite.has(m.id)),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = (stav.nazev || 'projekt').replace(/[\\/:*?"<>|]/g, '_') + '.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    },
    async importuj(soubor) {
      const data = JSON.parse(await soubor.text());
      if (!data || data.format !== 'truhla-projekt' || !data.projekt) throw new Error('Soubor není projekt truhlářského plánovače.');
      return data;
    },
  };
})(window.Truhla);
