window.Truhla = window.Truhla || {};

(function (T) {
  'use strict';

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const cislo = (x, des = 0) => x.toLocaleString('cs-CZ', { minimumFractionDigits: des, maximumFractionDigits: des });
  const lamelySklon = n => (n >= 2 && n <= 4 ? 'lamely' : 'lamel');

  function vykresli(el, dily, M, pocetVyrobku = 1) {
    const nast = M.nastaveni();
    let ks = 0, plocha = 0; // na jeden výrobek
    let h = '<table class="tabulka"><thead><tr><th>#</th><th>Díl</th><th>Materiál</th>'
      + '<th class="c">Délka</th><th class="c">Šířka</th><th class="c">Tl.</th><th class="c">Ks</th>' + (pocetVyrobku > 1 ? `<th class="c">Ks × ${pocetVyrobku}</th>` : '') + '<th class="c">m²</th><th>Poznámka</th></tr></thead><tbody>';
    dily.forEach((d, i) => {
      const mat = M.najdi(d.material);
      const m2 = d.delka * d.sirka * d.pocet * pocetVyrobku / 1e6;
      ks += d.pocet; plocha += m2 / pocetVyrobku;
      const pozn = [];
      if (mat && mat.typ === 'rezivo') {
        const l = T.narez.lamely(d, mat, nast);
        pozn.push(l.n > 1 ? `slepit z ${l.n} ${lamelySklon(l.n)} × ${l.delka} mm` : `přířez ${l.delka} mm`);
      } else if (mat && mat.vlakno) {
        pozn.push('vlákno po délce');
      }
      if (d.poznamka) pozn.push(d.poznamka);
      h += `<tr><td>${i + 1}</td><td>${esc(d.nazev)}</td><td><span class="vzorek" style="background:${esc(mat ? mat.barva : '#ccc')}"></span>${esc(mat ? mat.nazev : '?')}</td>`
        + `<td class="c">${d.delka}</td><td class="c">${d.sirka}</td><td class="c">${d.tloustka}</td><td class="c">${d.pocet}</td>${pocetVyrobku > 1 ? `<td class="c"><strong>${d.pocet * pocetVyrobku}</strong></td>` : ''}`
        + `<td class="c">${cislo(m2, 2)}</td><td>${esc(pozn.join(' · '))}</td></tr>`;
    });
    h += `</tbody><tfoot><tr><td></td><td colspan="5">Celkem</td><td class="c">${ks}</td>${pocetVyrobku > 1 ? `<td class="c">${ks * pocetVyrobku}</td>` : ''}<td class="c">${cislo(plocha * pocetVyrobku, 2)}</td><td></td></tr></tfoot></table>`;
    h += '<p class="pozn">Rozměry v mm, délka = směr vlákna. Rozměry jsou čisté (bez přídavků).</p>';
    el.innerHTML = h;
  }

  T.kusovnik = { vykresli };
})(window.Truhla);
