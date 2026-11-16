window.Truhla = window.Truhla || {};

// Výkresy čepů a šikmých řezů: celkový pohled na díl + zvětšený roh s kótami. Odpad šrafovaně, dlaby tmavě,
// drážky světle. Odpad je obdélník {x, y, w, h}, nebo mnohoúhelník {pts: [[x, y], …]} (šikmý řez).
// uhly = [{x, y, od, do, text}]: oblouk ve vrcholu [x, y] od směru `od` do `do` (° proti směru hodinek od osy x).
// pohledy = další pohledy na tentýž díl (stejná stavba: W, H, odpad, dlaby, drazky, uhly, kotyX, kotyY, nazev).
(function (T) {
  'use strict';
  let idSvg = 0;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = x => (Math.round(x * 10) / 10).toLocaleString('cs-CZ');

  // v = výkres, oblast = výřez dílu {w, h} od levého dolního rohu, koty = kreslit kóty
  function svg(v, oblast, koty) {
    const id = 'c' + (++idSvg);
    const { w, h } = oblast;
    const f = Math.max(w, h) / (koty ? 24 : 45);      // základní velikost písma v mm
    const pad = koty ? f * 4.2 : f * 0.6;
    const Y = y => h - y;                               // y odspodu → SVG shora
    const r = (o, cls) => o.pts
      ? `<polygon points="${o.pts.map(([x, y]) => `${x},${Y(y)}`).join(' ')}" class="${cls}" vector-effect="non-scaling-stroke"/>`
      : `<rect x="${o.x}" y="${Y(o.y + o.h)}" width="${o.w}" height="${o.h}" class="${cls}" vector-effect="non-scaling-stroke"/>`;

    let s = `<svg viewBox="${-pad} ${-pad} ${w + 2 * pad} ${h + 2 * pad}" class="svg-cep" role="img" aria-label="${esc(v.nazev)}">`
      + `<defs><pattern id="${id}s" width="${f * 0.6}" height="${f * 0.6}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">`
      + `<line x1="0" y1="0" x2="0" y2="${f * 0.6}" class="srafa" vector-effect="non-scaling-stroke"/></pattern>`
      + `<clipPath id="${id}k"><rect x="0" y="0" width="${w}" height="${h}"/></clipPath></defs>`;

    s += `<g clip-path="url(#${id}k)">`;
    s += `<rect x="0" y="${Y(v.H)}" width="${v.W}" height="${v.H}" fill="${esc(v.barva)}" class="cep-dil" vector-effect="non-scaling-stroke"/>`;
    v.odpad.forEach(o => { s += r(o, 'cep-odpad-pozadi') + r(o, 'cep-odpad').replace('class="cep-odpad"', `class="cep-odpad" fill="url(#${id}s)"`); });
    (v.drazky || []).forEach(o => { s += r(o, 'cep-drazka'); });
    v.dlaby.forEach(o => { s += r(o, 'cep-dlab'); });   // dlab je hlubší než drážka – kreslit navrch
    s += '</g>';
    if (w < v.W || h < v.H) {
      // naznačení, že díl pokračuje
      if (w < v.W) s += `<line x1="${w}" y1="0" x2="${w}" y2="${h}" class="cep-lom" vector-effect="non-scaling-stroke"/>`;
      if (h < v.H) s += `<line x1="0" y1="0" x2="${w}" y2="0" class="cep-lom" vector-effect="non-scaling-stroke"/>`;
    }

    if (koty) s += popiskyOdpadu(v, w, h, f, Y);
    if (koty) s += uhlySvg(v, w, h, f, Y);           // v celkovém pohledu by byly přerostlé
    if (koty) s += kotySvg(v, w, h, f, Y);
    return s + '</svg>';
  }

  // v detailu: „ŘEŽ“ do každého vyřezávaného dílku, který je ve výřezu vidět a vejde se do něj
  function popiskyOdpadu(v, w, h, f, Y) {
    let s = '';
    v.odpad.forEach(o => {
      if (o.pts) {
        // mnohoúhelník: nápis do těžiště, velikost podle menšího rozměru obálky
        const xs = o.pts.map(p => p[0]), ys = o.pts.map(p => p[1]);
        const cx = xs.reduce((a, b) => a + b) / xs.length, cy = ys.reduce((a, b) => a + b) / ys.length;
        const fs = Math.min(f * 0.8, (Math.min(Math.max(...xs), w) - Math.min(...xs)) / 3, (Math.min(Math.max(...ys), h) - Math.min(...ys)) / 2.2);
        if (cx > w || cy > h || fs < f * 0.3) return;
        s += `<text x="${cx}" y="${Y(cy)}" font-size="${fs}" text-anchor="middle" dominant-baseline="central" stroke-width="${fs * 0.18}" class="cep-rez-text">ŘEŽ</text>`;
        return;
      }
      const ow = Math.min(o.w, w - o.x), oh = Math.min(o.h, h - o.y);
      if (ow <= 0 || oh <= 0) return;
      const svisle = oh > ow * 1.3;
      const delka = svisle ? oh : ow, napric = svisle ? ow : oh;
      const fs = Math.min(f * 0.8, delka / 2.6, napric * 0.75);
      if (fs < f * 0.3) return;
      const cx = o.x + ow / 2, cy = Y(o.y + oh / 2);
      s += `<text x="${cx}" y="${cy}" font-size="${fs}" text-anchor="middle" dominant-baseline="central" stroke-width="${fs * 0.18}" class="cep-rez-text"`
        + (svisle ? ` transform="rotate(-90 ${cx} ${cy})"` : '') + '>ŘEŽ</text>';
    });
    return s;
  }

  // úhly šikmých řezů: oblouk + hodnota (jen vrcholy ve výřezu)
  function uhlySvg(v, w, h, f, Y) {
    let s = '';
    (v.uhly || []).forEach(u => {
      if (u.x > w + 0.5 || u.y > h + 0.5) return;
      const rad = a => a * Math.PI / 180, r = u.r || Math.min(f * 4, h * 0.7);
      const bod = (a, rr) => [u.x + rr * Math.cos(rad(a)), Y(u.y + rr * Math.sin(rad(a)))];
      const [x0, y0] = bod(u.od, r), [x1, y1] = bod(u.do, r);
      const velky = Math.abs(u.do - u.od) > 180 ? 1 : 0;
      const [tx, ty] = bod((u.od + u.do) / 2, r + f * 1.1);
      s += `<path d="M${x0} ${y0} A${r} ${r} 0 ${velky} 0 ${x1} ${y1}" class="cep-uhel" vector-effect="non-scaling-stroke"/>`
        + `<text x="${tx}" y="${ty}" font-size="${f * 0.85}" text-anchor="middle" dominant-baseline="central" stroke-width="${f * 0.2}" class="cep-uhel-text">${esc(u.text)}</text>`;
    });
    return s;
  }

  function kotySvg(v, w, h, f, Y) {
    let s = '';
    const vyber = (hodnoty, max) => [...new Set(hodnoty.map(x => Math.round(x * 10) / 10))].filter(x => x >= 0 && x <= max).sort((a, b) => a - b);
    const ys = vyber(v.kotyY, h), xs = vyber(v.kotyX, w);
    const pismo = f * 0.8;
    // popisky blíž než výška písma se vynechají (pomocná čára zůstane)
    // přednost mají kóty v pořadí, jak je výrobek uvedl (nejdřív hranice čepů, pak drážky a dlaby)
    const citelne = (arr, poradi) => {
      const prijato = [];
      poradi.map(x => Math.round(x * 10) / 10).forEach(x => {
        if (arr.includes(x) && !prijato.includes(x) && prijato.every(p => Math.abs(p - x) >= pismo * 1.05)) prijato.push(x);
      });
      return arr.map(x => prijato.includes(x));
    };
    const ukY = citelne(ys, v.kotyY), ukX = citelne(xs, v.kotyX);

    // svislé kóty vlevo
    const xl = -f * 0.9;
    s += `<line x1="${xl}" y1="${Y(ys[0])}" x2="${xl}" y2="${Y(ys[ys.length - 1])}" class="kota" vector-effect="non-scaling-stroke"/>`;
    ys.forEach((y, i) => {
      s += `<line x1="${xl - f * 0.25}" y1="${Y(y)}" x2="${w}" y2="${Y(y)}" class="kota-pomocna" vector-effect="non-scaling-stroke"/>`;
      if (ukY[i]) s += `<text x="${xl - f * 0.4}" y="${Y(y)}" font-size="${pismo}" text-anchor="end" dominant-baseline="middle" class="kota-text">${fmt(y)}</text>`;
    });
    // vodorovné kóty nahoře (text svisle, ať se vejde)
    const yt = -f * 0.9;
    s += `<line x1="${xs[0]}" y1="${yt}" x2="${xs[xs.length - 1]}" y2="${yt}" class="kota" vector-effect="non-scaling-stroke"/>`;
    xs.forEach((x, i) => {
      s += `<line x1="${x}" y1="${yt - f * 0.25}" x2="${x}" y2="${h}" class="kota-pomocna" vector-effect="non-scaling-stroke"/>`;
      if (ukX[i]) s += `<text x="${x}" y="${yt - f * 0.4}" font-size="${pismo}" text-anchor="start" dominant-baseline="middle" transform="rotate(-90 ${x} ${yt - f * 0.4})" class="kota-text">${fmt(x)}</text>`;
    });
    return s;
  }

  const tvar = (n, jeden, dva, pet) => `${fmt(n)} ${n === 1 ? jeden : n >= 2 && n <= 4 ? dva : pet}`;

  function tabulka(t) {
    let h = `<h4>${esc(t.nazev)}</h4><div class="posuv"><table class="tabulka rezny-list"><thead><tr>`
      + t.sloupce.map((c, i) => `<th${i ? ' class="c"' : ''}>${esc(c)}</th>`).join('') + '</tr></thead><tbody>';
    t.radky.forEach(r => {
      const vyrez = t.zvyraznit != null && r[t.zvyraznit] === 'VYŘEZAT';
      h += `<tr${vyrez ? ' class="vyrez"' : ''}>` + r.map((c, i) => `<td${i ? ' class="c"' : ''}>${esc(c)}</td>`).join('') + '</tr>';
    });
    return h + '</tbody></table></div>';
  }

  // pocet = počet výrobků; kusy dílů a operací se násobí
  function vykresli(el, vykresy, pocet = 1) {
    if (!vykresy || !vykresy.length) { el.innerHTML = '<p class="pozn">Tento výrobek nemá čepy ani šikmé řezy – všechny díly se řežou kolmo.</p>'; return; }
    const drazky = vykresy.some(v => v.drazky && v.drazky.length);
    const sikme = vykresy.some(v => v.sikmych);
    let h = '<p class="pozn">Šrafovaně s nápisem ŘEŽ = odpad k vyřezání, tmavě = průchozí dlab' + (drazky ? ', světle čárkovaně = drážka (neprůchozí)' : '')
      + (sikme ? ', modrý oblouk = úhel šikmého řezu' : '') + '. Kóty v mm od levé a spodní hrany (u dna od levé a přední). Vlevo celý díl, vpravo zvětšený levý dolní roh. Pod obrázky je postup krok za krokem a tabulka značek.</p>';

    // souhrn všech operací
    let celkemVyrezu = 0, celkemDlabu = 0, celkemDrazek = 0, celkemSikmych = 0;
    h += '<table class="tabulka"><thead><tr><th>Díl</th><th class="c">Ks</th><th class="c">Výřezů</th><th class="c">Dlabů</th>' + (drazky ? '<th class="c">Drážek</th>' : '')
      + (sikme ? '<th class="c">Šikmých řezů</th>' : '') + '</tr></thead><tbody>';
    vykresy.forEach(v => {
      const ks = v.ks * pocet, vy = v.vyrezu * ks, dl = v.dlabu * ks;
      const nd = (v.drazky || []).length, dr = nd * ks;
      const sk = (v.sikmych || 0) * ks;
      celkemVyrezu += vy; celkemDlabu += dl; celkemDrazek += dr; celkemSikmych += sk;
      h += `<tr><td>${esc(v.nazev)}</td><td class="c"><strong>${ks}</strong></td><td class="c">${v.vyrezu ? `${v.vyrezu} × ${ks} = <strong>${vy}</strong>` : '—'}</td><td class="c">${v.dlabu ? `${v.dlabu} × ${ks} = <strong>${dl}</strong>` : '—'}</td>`
        + (drazky ? `<td class="c">${nd ? `${nd} × ${ks} = <strong>${dr}</strong>` : '—'}</td>` : '')
        + (sikme ? `<td class="c">${v.sikmych ? `${v.sikmych} × ${ks} = <strong>${sk}</strong>` : '—'}</td>` : '') + '</tr>';
    });
    h += `</tbody><tfoot><tr><td>Celkem${pocet > 1 ? ` pro ${tvar(pocet, 'výrobek', 'výrobky', 'výrobků')}` : ''}</td><td></td><td class="c">${celkemVyrezu}</td><td class="c">${celkemDlabu}</td>${drazky ? `<td class="c">${celkemDrazek}</td>` : ''}${sikme ? `<td class="c">${celkemSikmych}</td>` : ''}</tr></tfoot></table>`;

    vykresy.forEach(v => {
      const ks = v.ks * pocet;
      // dlab mimo zvětšený detail by neměl kóty → doplnit celý díl okótovaný na dlaby (pokud ho výrobek nedal sám)
      const mimo = v.dlaby.filter(o => o.x + o.w > v.detail.w + 0.5 || o.y + o.h > v.detail.h + 0.5);
      if (mimo.length && !(v.pohledy || []).some(p => (p.dlaby || []).length)) {
        const kx = [0, ...v.dlaby.flatMap(o => [o.x, o.x + o.w]), v.W], ky = [0, ...v.dlaby.flatMap(o => [o.y, o.y + o.h]), v.H];
        v = Object.assign({}, v, { pohledy: [{ nazev: 'Umístění dlabů – celý díl, kóty od levého dolního rohu', W: v.W, H: v.H,
          odpad: v.odpad, dlaby: v.dlaby, drazky: v.drazky, kotyX: kx, kotyY: ky }].concat(v.pohledy || []) });
      }
      const nasob = pocet > 1 ? ` <span class="pozn">(${v.ks} × ${tvar(pocet, 'výrobek', 'výrobky', 'výrobků')})</span>` : '';
      h += `<section class="cep-vykres"><h3>${esc(v.nazev)} – ${ks} ks${nasob} <span class="pozn">· ${fmt(v.W)} × ${fmt(v.H)} mm</span></h3>`
        + `<div class="cep-pohledy"><figure class="cep-celek">${svg(v, { w: v.W, h: v.H }, false)}<figcaption>Celý díl ${fmt(v.W)} × ${fmt(v.H)} mm</figcaption></figure>`
        + `<figure class="cep-detail">${svg(v, v.detail, true)}<figcaption>${esc(v.detailPopis || 'Detail levého dolního rohu')}</figcaption></figure></div>`
        + ((v.pohledy || []).length ? `<div class="cep-dalsi">${v.pohledy.map(p => `<figure>${svg(Object.assign({ odpad: [], dlaby: [] }, p, { barva: v.barva }), { w: p.W, h: p.H }, true)}<figcaption>${esc(p.nazev)}</figcaption></figure>`).join('')}</div>` : '')
        + (v.postup ? `<h4>Postup</h4><ol class="cep-postup">${v.postup.map(t => `<li>${esc(t)}</li>`).join('')}</ol>` : '')
        + `<ul class="cep-popis">${v.popis.map(t => `<li>${esc(t)}</li>`).join('')}</ul>`
        + (v.tabulky || []).map(tabulka).join('')
        + (v.vyrezu || v.dlabu ? `<p class="pozn">Na 1 kus: ${tvar(v.vyrezu, 'výřez', 'výřezy', 'výřezů')}${v.dlabu ? `, ${tvar(v.dlabu, 'dlab', 'dlaby', 'dlabů')}` : ''} → pro ${ks} ks celkem ${tvar(v.vyrezu * ks, 'výřez', 'výřezy', 'výřezů')}${v.dlabu ? ` a ${tvar(v.dlabu * ks, 'dlab', 'dlaby', 'dlabů')}` : ''}.</p>` : '')
        + '</section>';
    });
    el.innerHTML = h;
  }

  T.cepy = { vykresli };
})(window.Truhla);
