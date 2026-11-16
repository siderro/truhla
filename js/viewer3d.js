window.Truhla = window.Truhla || {};

// Zjednodušený 3D model: každý díl = kvádr (volitelně natočený kolem středu o rot = [x, y, z] v radiánech,
// volitelně seříznutý rovinami rez – šikmé konce). Three.js se načítá z CDN (viz index.html).
(function (T) {
  'use strict';
  const MM = 0.001;
  let THREE, renderer, scene, camera, controls, model, klouby = [], el;
  let vikoUhel = 0, vikoCil = 0, data = null, posledni = null;
  let postavy = null, postavyVidet = true;
  const KLIC_POSTAVY = 'truhla.postavy.v1';
  try { postavyVidet = localStorage.getItem(KLIC_POSTAVY) !== '0'; } catch (e) { /* bez úložiště */ }
  // postavičky pro měřítko (kreslené, výška k temeni přesně): stojí vlevo od výrobku
  const POSTAVY = [
    { nazev: 'muž', jmeno: 'Franta', vyska: 1800, styl: 'muz' },
    { nazev: 'žena', jmeno: 'Jarka', vyska: 1650, styl: 'zena' },
  ];

  const css = (nazev, vychozi) => getComputedStyle(document.documentElement).getPropertyValue(nazev).trim() || vychozi;

  function init() {
    el = document.getElementById('scena');
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(css('--scena', '#eef0f2'));
    camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100);
    controls = new T.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI * 0.95;

    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8070, 1.5));
    const s1 = new THREE.DirectionalLight(0xffffff, 1.6);
    s1.position.set(2, 4, 3);
    scene.add(s1);
    const s2 = new THREE.DirectionalLight(0xffffff, 0.5);
    s2.position.set(-3, 2, -2);
    scene.add(s2);
    const mrizka = new THREE.GridHelper(6, 60, 0x888888, 0xaaaaaa);
    mrizka.material.transparent = true;
    mrizka.material.opacity = 0.3;
    scene.add(mrizka);

    new ResizeObserver(velikost).observe(el);
    velikost();
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => scene.background.set(css('--scena', '#eef0f2')));
    renderer.setAnimationLoop(snimek);
  }

  function velikost() {
    const w = el.clientWidth, h = el.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function snimek() {
    vikoUhel += (vikoCil - vikoUhel) * 0.12;
    klouby.forEach(k => { k.rotation.x = -vikoUhel * k.userData.maxUhel; });
    controls.update();
    renderer.render(scene, camera);
  }

  function uvolni(obj) {
    obj.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
  }

  // natočený kvádr seříznutý rovinami b.rez = [[nx, ny, nz, d], …] (ponechá body n·p ≤ d, světové mm):
  // vrcholy průniku poloprostorů, relativně ke středu kvádru, bez natočení (je už v nich)
  function seriznuty(b, stred) {
    const R = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...(b.rot || [0, 0, 0])));
    const osy = [0, 1, 2].map(i => new THREE.Vector3().setFromMatrixColumn(R, i));
    const c = new THREE.Vector3(...stred);
    const roviny = [];
    osy.forEach((o, i) => {
      roviny.push([o, o.dot(c) + b.size[i] / 2]);
      roviny.push([o.clone().negate(), -o.dot(c) + b.size[i] / 2]);
    });
    b.rez.forEach(r => {
      const n = new THREE.Vector3(r[0], r[1], r[2]), l = n.length();
      roviny.push([n.divideScalar(l), r[3] / l]);
    });
    const body = [];
    for (let i = 0; i < roviny.length; i++) for (let j = i + 1; j < roviny.length; j++) for (let k = j + 1; k < roviny.length; k++) {
      const m = new THREE.Matrix3().set(...roviny[i][0].toArray(), ...roviny[j][0].toArray(), ...roviny[k][0].toArray());
      if (Math.abs(m.determinant()) < 1e-9) continue;
      const p = new THREE.Vector3(roviny[i][1], roviny[j][1], roviny[k][1]).applyMatrix3(m.invert());
      if (roviny.every(([n, d]) => n.dot(p) <= d + 1e-6)) body.push(p.sub(c).multiplyScalar(MM));
    }
    return body.length >= 4 ? new T.ConvexGeometry(body) : null;
  }

  function postav() {
    if (model) { scene.remove(model); uvolni(model); }
    model = new THREE.Group();
    klouby = [];
    const { dily, M } = data;

    // střed půdorysu, aby se model točil kolem svého středu
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    dily.forEach(d => d.boxy.forEach(b => {
      minX = Math.min(minX, b.pos[0]); maxX = Math.max(maxX, b.pos[0] + b.size[0]);
      minZ = Math.min(minZ, b.pos[2]); maxZ = Math.max(maxZ, b.pos[2] + b.size[2]);
    }));
    const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
    const barvaHran = new THREE.Color(css('--hrany3d', '#3a3226'));

    // kloub = skupina dílů otáčená kolem osy x (víko na pantech, rám skládací kozy); pant {y, z, uhel°}
    const kloubPro = pant => {
      let k = klouby.find(g => g.userData.pant === pant || JSON.stringify(g.userData.pant) === JSON.stringify(pant));
      if (!k) {
        k = new THREE.Group();
        k.position.set(0, pant.y * MM, (pant.z - cz) * MM);
        k.userData.pant = pant;
        k.userData.maxUhel = pant.uhel * Math.PI / 180;
        k.rotation.x = -vikoUhel * k.userData.maxUhel;
        model.add(k);
        klouby.push(k);
      }
      return k;
    };

    for (const d of dily) {
      const mat = M.najdi(d.material);
      for (const b of d.boxy) {
        if (b.size.some(v => v <= 0)) continue;
        const stred = [b.pos[0] + b.size[0] / 2, b.pos[1] + b.size[1] / 2, b.pos[2] + b.size[2] / 2];
        const geo = b.rez && b.rez.length ? seriznuty(b, stred) : new THREE.BoxGeometry(b.size[0] * MM, b.size[1] * MM, b.size[2] * MM);
        if (!geo) continue;
        const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: mat ? mat.barva : '#cccccc', roughness: 0.8 }));
        mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo),
          new THREE.LineBasicMaterial({ color: barvaHran, transparent: true, opacity: 0.6 })));
        const px = (stred[0] - cx) * MM, py = stred[1] * MM, pz = (stred[2] - cz) * MM;
        if (b.rot && !b.rez) mesh.rotation.set(b.rot[0], b.rot[1], b.rot[2]);

        const pant = b.pant || (d.skupina === 'viko' && d.pant);
        if (pant) {
          const k = kloubPro(pant);
          mesh.position.set(px, py - k.position.y, pz - k.position.z);
          k.add(mesh);
        } else {
          mesh.position.set(px, py, pz);
          model.add(mesh);
        }
      }
    }
    scene.add(model);
    postavPostavy((minX - cx) * MM);
    // nový výrobek = jiná velikost, kamera se přenastaví
    if (data.klic !== posledni) { vychoziPohled(); posledni = data.klic; }
  }

  // Kreslená postavička z koulí, kapslí a kvádrů: chodidla na zemi, čelem dopředu (+z), pravá ruka na −x.
  // Rozměry jako podíl výšky H (k temeni hlavy, bez čepice a drdolu); vrací skupinu v metrech.
  function figurina(f) {
    const H = f.vyska * MM, g = new THREE.Group(), u = k => k * H;
    const barvy = new Map();
    const mat = (c, opt) => {
      const k = c + JSON.stringify(opt || {});
      if (!barvy.has(k)) barvy.set(k, new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.75 }, opt)));
      return barvy.get(k);
    };
    const pridej = (geo, c, p, s, rot, opt) => {
      const m = new THREE.Mesh(geo, mat(c, opt));
      m.position.set(...p.map(u));
      if (s) m.scale.set(...s);
      if (rot) m.rotation.set(...rot);
      g.add(m);
      return m;
    };
    const koule = (p, r, c, s, rot) => pridej(new THREE.SphereGeometry(u(r), 24, 16), c, p, s, rot);
    const kvadr = (p, size, c, rot) => pridej(new THREE.BoxGeometry(...size.map(u)), c, p, null, rot);
    const kapsle = (a, b, r, c, sz = 1) => {
      const A = new THREE.Vector3(...a.map(u)), B = new THREE.Vector3(...b.map(u)), smer = B.clone().sub(A);
      const m = new THREE.Mesh(new THREE.CapsuleGeometry(u(r), Math.max(0.001, smer.length()), 6, 16), mat(c));
      m.position.copy(A).add(B).multiplyScalar(0.5);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), smer.normalize());
      m.scale.z = sz;
      g.add(m);
      return m;
    };
    const valec = (a, b, r, c, opt) => {
      const A = new THREE.Vector3(...a.map(u)), B = new THREE.Vector3(...b.map(u)), smer = B.clone().sub(A);
      const m = new THREE.Mesh(new THREE.CylinderGeometry(u(r), u(r), smer.length(), 20), mat(c, opt));
      m.position.copy(A).add(B).multiplyScalar(0.5);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), smer.normalize());
      g.add(m);
      return m;
    };

    const KUZE = '#f1c6a0', TMAVA = '#2a211b', BILA = '#ffffff';
    const muz = f.styl === 'muz';
    // hlava: velká (kreslená), temeno přesně ve výšce H
    const hr = 0.078, hy = 1 - hr * 1.12, hz = 0.005;
    const hlava = (p, r, c, s) => koule([p[0], hy + p[1], hz + p[2]], r, c, s);
    hlava([0, 0, 0], hr, KUZE, [1, 1.12, 1]);
    [-1, 1].forEach(s => {
      hlava([s * hr * 0.97, -0.005, -0.005], 0.017, KUZE, [0.6, 1, 1]);                      // uši
      hlava([s * 0.028, 0.016, hr * 0.84], 0.016, BILA, [1, 1.25, 0.6]);                    // oči
      hlava([s * 0.028 + s * 0.002, 0.012, hr * 0.84 + 0.009], 0.0075, TMAVA);               // panenky
      hlava([s * 0.004 + s * 0.028, 0.019, hr * 0.84 + 0.013], 0.0022, BILA);                // odlesk
    });
    // úsměv: půlkruh dole
    const smich = pridej(new THREE.TorusGeometry(u(0.024), u(0.0035), 8, 20, Math.PI), muz ? '#7a2a20' : '#c2414b',
      [0, hy - 0.033, hz + hr * 0.86], null, [-0.35, 0, Math.PI]);
    smich.scale.y = 0.8;

    const kycel = 0.47, rameno = 0.755, nohaX = muz ? 0.055 : 0.047, rn = muz ? 0.036 : 0.031, ra = muz ? 0.024 : 0.02;
    const sx = muz ? 0.118 : 0.1;                                       // osa ramene od středu
    if (muz) {
      // --- Franta: kšiltovka, plnovous, červený nos, bříško v kostkované košili, montérky, kladivo ---
      const KOSILE = '#c8372d', KOSTKA = '#7d1d17', DZINY = '#36507a', BOTY = '#6b4423', VOUSY = '#7a4a26';
      hlava([0, -0.008, hr * 0.95], 0.017, '#e2735f');                                     // nos
      hlava([0, -0.048, hr * 0.38], 0.064, VOUSY, [1.12, 0.78, 0.82]);                      // plnovous
      [-1, 1].forEach(s => kapsle([s * 0.006, hy - 0.024, hz + hr * 0.9], [s * 0.04, hy - 0.034, hz + hr * 0.8], 0.0085, VOUSY));  // knír
      [-1, 1].forEach(s => kvadr([s * 0.028, hy + 0.04, hz + hr * 0.86], [0.03, 0.008, 0.01], VOUSY, [0.25, 0, -s * 0.18]));   // obočí
      // kšiltovka: polokoule + kšilt
      pridej(new THREE.SphereGeometry(u(hr * 1.05), 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), '#2f6b3a', [0, hy + 0.022, hz], [1, 0.8, 1]);
      pridej(new THREE.CylinderGeometry(u(0.06), u(0.06), u(0.006), 24, 1, false, -Math.PI / 2, Math.PI), '#2f6b3a',
        [0, hy + 0.024, hz + hr * 0.82], [1, 1, 0.9], [0.12, 0, 0]);
      koule([0, hy + 0.022 + hr * 0.84, hz], 0.008, '#f2d24b');                             // knoflík na čepici
      valec([-hr * 1.02, hy + 0.035, hz - 0.02], [-hr * 1.02, hy - 0.02, hz + 0.04], 0.004, '#f2c230');  // tužka za uchem
      // trup, bříško, kostky na košili, opasek
      kapsle([0, kycel + 0.06, 0], [0, rameno - 0.05, 0], 0.1, KOSILE, 0.66);
      koule([0, 0.575, 0.04], 0.1, KOSILE, [1.05, 0.95, 0.85]);
      // knoflíky přes bříško (po povrchu koule)
      for (const y of [0.52, 0.57, 0.62, 0.67]) {
        const dy = (y - 0.575) / (0.1 * 0.95);
        koule([0, y, 0.04 + 0.1 * 0.85 * Math.sqrt(Math.max(0, 1 - dy * dy))], 0.007, KOSTKA);
      }
      kvadr([-0.055, 0.7, 0.062], [0.045, 0.004, 0.02], KOSTKA, [0.3, 0, 0]);                // kapsička na prsou
      kvadr([-0.055, 0.68, 0.064], [0.045, 0.04, 0.004], KOSILE);
      valec([0, kycel + 0.01, 0], [0, kycel + 0.045, 0], 0.104, TMAVA).scale.z = 0.72;      // opasek
      kvadr([0, kycel + 0.028, 0.076], [0.04, 0.03, 0.012], '#d4a73a');                    // přezka
      kvadr([0.085, kycel - 0.02, 0.055], [0.06, 0.07, 0.03], '#8a5a30', [0, 0.5, 0]);     // kapsa na nářadí
      kapsle([0, rameno, 0], [0, 0.81, 0], 0.03, KUZE);                                       // krk
      kapsle([-sx, rameno - 0.01, 0], [sx, rameno - 0.01, 0], 0.035, KOSILE, 0.8);           // ramena
      // nohy, boty
      [-1, 1].forEach(s => {
        kapsle([s * nohaX, 0.06, 0], [s * nohaX, kycel, 0], rn, DZINY);
        kapsle([s * nohaX, 0.025, -0.01], [s * nohaX, 0.025, 0.06], 0.026, BOTY);
      });
      koule([0, kycel, 0], 0.095, DZINY, [1.05, 0.55, 0.7]);
      // levá ruka volně, pravá drží kladivo před sebou
      kapsle([sx, rameno - 0.01, 0], [sx + 0.03, 0.6, 0], ra, KOSILE);
      kapsle([sx + 0.03, 0.6, 0], [sx + 0.035, 0.47, 0.03], ra * 0.9, KUZE);
      koule([sx + 0.035, 0.455, 0.035], 0.026, KUZE);
      kapsle([-sx, rameno - 0.01, 0], [-sx - 0.03, 0.6, 0.02], ra, KOSILE);
      kapsle([-sx - 0.03, 0.6, 0.02], [-sx - 0.03, 0.55, 0.13], ra * 0.9, KUZE);
      koule([-sx - 0.03, 0.55, 0.15], 0.026, KUZE);
      valec([-sx - 0.03, 0.51, 0.15], [-sx - 0.03, 0.65, 0.16], 0.009, '#b07a43');           // topůrko
      kvadr([-sx - 0.03, 0.655, 0.16], [0.03, 0.03, 0.09], '#6f7680');                       // hlava kladiva
    } else {
      // --- Jarka: drdol, brýle na čele, tváře, lacl, tenisky, ruka v bok, skládací metr ---
      const VLASY = '#6b3b1f', TRICKO = '#f2c94c', LACL = '#2f8c8a', BOTY = '#f4f4f4', METR = '#f4d03f';
      hlava([0, -0.004, hr * 0.97], 0.011, '#e7a98a');                                      // nosík
      [-1, 1].forEach(s => hlava([s * 0.048, -0.02, hr * 0.74], 0.014, '#f19a9a', [1, 0.7, 0.5]));  // tváře
      [-1, 1].forEach(s => kvadr([s * 0.028, hy + 0.038, hz + hr * 0.88], [0.026, 0.005, 0.008], VLASY, [0.25, 0, s * 0.15]));  // obočí
      // vlasy: čepička vzadu a nahoře, ofina, drdol
      koule([0, hy + 0.012, hz - 0.026], hr * 1.02, VLASY, [1.05, 1.12, 1]);
      koule([0, hy + 0.06, hz + 0.04], 0.052, VLASY, [1.25, 0.42, 0.75], [0.35, 0, 0]);
      koule([0, 1.01, hz - 0.035], 0.04, VLASY);
      valec([0, 0.985, hz - 0.03], [0, 0.995, hz - 0.03], 0.03, '#e2557a');                  // gumička
      // ochranné brýle vytažené na čele
      [-1, 1].forEach(s => valec([s * 0.028, hy + 0.068, hz + hr * 0.78], [s * 0.028, hy + 0.074, hz + hr * 0.9], 0.019, '#7fd3ff',
        { transparent: true, opacity: 0.55, roughness: 0.1 }));
      kvadr([0, hy + 0.072, hz + hr * 0.84], [0.026, 0.006, 0.006], TMAVA);
      // trup: tričko, lacl s kapsou a šlemi
      kapsle([0, kycel + 0.06, 0], [0, rameno - 0.045, 0], 0.085, TRICKO, 0.66);
      valec([0, kycel - 0.01, 0], [0, 0.6, 0], 0.088, LACL).scale.z = 0.7;
      kvadr([0, 0.65, 0.05], [0.12, 0.12, 0.02], LACL);
      kvadr([0, 0.65, 0.062], [0.05, 0.04, 0.006], '#25706e');
      [-1, 1].forEach(s => {
        kvadr([s * 0.055, 0.69, 0.0], [0.022, 0.006, 0.13], LACL, [0, 0, 0]);
        kvadr([s * 0.055, 0.72, 0.056], [0.02, 0.08, 0.006], LACL);
        koule([s * 0.05, 0.705, 0.062], 0.007, '#d4a73a');                                   // knoflíky
      });
      kapsle([0, rameno, 0], [0, 0.81, 0], 0.025, KUZE);                                       // krk
      kapsle([-sx, rameno - 0.01, 0], [sx, rameno - 0.01, 0], 0.03, TRICKO, 0.8);            // ramena
      koule([0, kycel, 0], 0.092, LACL, [1.1, 0.55, 0.62]);
      [-1, 1].forEach(s => {
        kapsle([s * nohaX, 0.065, 0], [s * nohaX, kycel, 0], rn, LACL);
        kapsle([s * nohaX, 0.04, 0], [s * nohaX, 0.06, 0], rn * 0.75, KUZE);                  // kotník
        kapsle([s * nohaX, 0.022, -0.01], [s * nohaX, 0.022, 0.055], 0.023, BOTY);
        kvadr([s * nohaX, 0.006, 0.02], [0.05, 0.012, 0.1], '#e2557a');                      // podrážka
      });
      // levá ruka v bok
      kapsle([sx, rameno - 0.01, 0], [sx + 0.085, 0.6, -0.01], ra, TRICKO);
      kapsle([sx + 0.085, 0.6, -0.01], [sx - 0.005, 0.5, 0.01], ra * 0.9, KUZE);
      koule([sx - 0.01, 0.495, 0.012], 0.022, KUZE);
      // pravá drží rozložený skládací metr (cikcak)
      kapsle([-sx, rameno - 0.01, 0], [-sx - 0.025, 0.6, 0.02], ra, TRICKO);
      kapsle([-sx - 0.025, 0.6, 0.02], [-sx - 0.025, 0.56, 0.12], ra * 0.9, KUZE);
      koule([-sx - 0.025, 0.56, 0.14], 0.022, KUZE);
      // metr trčí z ruky dopředu a nahoru, články cikcak s černými dílky
      for (let i = 0; i < 4; i++) {
        const y = 0.6 + i * 0.07, z = 0.17 + i * 0.03, x = -sx - 0.025 + (i % 2 ? 0.022 : -0.022);
        kvadr([x, y, z], [0.022, 0.085, 0.006], METR, [-0.4, 0, i % 2 ? 0.55 : -0.55]);
        for (const d of [-0.025, 0, 0.025]) kvadr([x, y + d, z + 0.004], [0.012, 0.003, 0.002], TMAVA, [-0.4, 0, i % 2 ? 0.55 : -0.55]);
      }
    }
    g.userData.sirka = u(muz ? 0.36 : 0.36);
    return g;
  }

  // vlevo od výrobku (xLevy = levý okraj modelu v m): žena blíž, muž za ní
  function postavPostavy(xLevy) {
    if (postavy) { scene.remove(postavy); uvolni(postavy); }
    postavy = new THREE.Group();
    let x = xLevy - 0.35;
    POSTAVY.slice().reverse().forEach(f => {
      const fig = figurina(f);
      fig.rotation.y = 0.25;                       // natočení k výrobku
      fig.position.x = x - fig.userData.sirka / 2;
      x -= fig.userData.sirka + 0.25;
      postavy.add(fig);
    });
    postavy.visible = postavyVidet;
    scene.add(postavy);
  }

  function vychoziPohled() {
    if (!model) return;
    const box = new THREE.Box3().setFromObject(model);
    if (postavy && postavy.visible) box.union(new THREE.Box3().setFromObject(postavy));
    const stred = box.getCenter(new THREE.Vector3());
    const vel = box.getSize(new THREE.Vector3());
    const dist = Math.max(vel.x, vel.y, vel.z) * 2.4 + 0.3;
    camera.position.set(stred.x + dist * 0.55, stred.y + dist * 0.45, stred.z + dist * 0.75);
    controls.target.copy(stred);
    controls.update();
  }

  T.viewer = {
    start() {
      THREE = T.THREE;
      init();
      if (data) postav();
    },
    update(d) {
      data = d;
      if (THREE) postav();
    },
    prepniViko() {
      vikoCil = vikoCil ? 0 : 1;
      return vikoCil === 1;
    },
    kloubOtevren: () => vikoCil === 1,
    prepniPostavy() {
      postavyVidet = !postavyVidet;
      try { localStorage.setItem(KLIC_POSTAVY, postavyVidet ? '1' : '0'); } catch (e) { /* bez úložiště */ }
      if (postavy) postavy.visible = postavyVidet;
      vychoziPohled();
      return postavyVidet;
    },
    postavyVidet: () => postavyVidet,
    popisPostav: () => POSTAVY.map(f => `${f.nazev} ${f.vyska / 10} cm`).join(', '),
    vychoziPohled,
    pripraven: () => !!THREE,
  };
})(window.Truhla);
