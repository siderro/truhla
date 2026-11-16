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
  // figuríny pro měřítko: výška v mm, šířka ramen a boků (podíl výšky), stojí vlevo od výrobku
  const POSTAVY = [
    { nazev: 'muž', vyska: 1800, ramena: 0.25, boky: 0.19, trup: 0.09, barva: '#8f9aa6' },
    { nazev: 'žena', vyska: 1650, ramena: 0.22, boky: 0.21, trup: 0.08, barva: '#a99aa6' },
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

  // stylizovaná figurína z kapslí a koulí, chodidla na zemi v [x, 0, z], čelem dopředu (+z); rozměry v m
  function figurina(f, x) {
    const H = f.vyska * MM, g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: f.barva, roughness: 0.9 });
    const kapsle = (a, b, r, sz = 1) => {
      const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), smer = B.clone().sub(A);
      const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, Math.max(0.001, smer.length()), 4, 12), mat);
      m.position.copy(A).add(B).multiplyScalar(0.5);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), smer.normalize());
      m.scale.z = sz;
      g.add(m);
    };
    const koule = (p, r, s = [1, 1, 1]) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), mat);
      m.position.set(...p); m.scale.set(...s);
      g.add(m);
    };
    const rn = 0.034 * H, ra = 0.022 * H;          // poloměr nohy a paže
    const kycel = 0.5 * H, rameno = 0.815 * H, bx = f.boky * H / 2 - rn, sx = f.ramena * H / 2;
    [-1, 1].forEach(s => {
      kapsle([s * bx * 0.8, rn, 0.01 * H], [s * bx, kycel, 0], rn);              // noha
      koule([s * bx * 0.8, 0.012 * H, 0.04 * H], 0.03 * H, [0.9, 0.4, 1.6]);     // chodidlo
      kapsle([s * sx, rameno - ra, 0], [s * (sx + 0.03 * H), 0.45 * H, 0.01 * H], ra);   // paže
    });
    koule([0, kycel + 0.02 * H, 0], f.boky * H / 2, [1, 0.7, 0.62]);           // pánev
    kapsle([0, kycel + 0.1 * H, 0], [0, rameno - f.trup * H * 0.5, 0], f.trup * H, 0.62);  // trup
    kapsle([-sx, rameno - ra, 0], [sx, rameno - ra, 0], ra * 1.15, 0.8);        // ramena
    kapsle([0, rameno, 0], [0, 0.875 * H, 0], 0.024 * H);                         // krk
    koule([0, 0.935 * H, 0.004 * H], 0.06 * H, [0.88, 1.12, 1]);                  // hlava
    g.position.set(x, 0, 0);
    g.userData.sirka = Math.max(f.ramena, f.boky) * H + 2 * 0.03 * H;
    return g;
  }

  // vlevo od výrobku (xLevy = levý okraj modelu v m): žena blíž, muž za ní
  function postavPostavy(xLevy) {
    if (postavy) { scene.remove(postavy); uvolni(postavy); }
    postavy = new THREE.Group();
    let x = xLevy - 0.35;
    POSTAVY.slice().reverse().forEach(f => {
      const fig = figurina(f, 0);
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
