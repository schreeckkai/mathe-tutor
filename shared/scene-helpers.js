/* ════════════════════════════════════════════════════════════════
   SCENE HELPERS — Wiederverwendbare Three.js-Funktionen
   ────────────────────────────────────────────────────────────────
   Wird von allen Animationen unter visualisierungen/ genutzt.
   Muss NACH three.min.js geladen werden, da es THREE benötigt.

   Was hier drinsteht:
   - Achsen, Beschriftungen (Sprite-Labels mit Subscript-Support)
   - Punkte, Linien, gestrichelte Linien, Pfeile
   - Boden-/Plane-Patches
   - Opacity-Tweens (sanftes Ein-/Ausblenden)
   - Maus- und Touch-Steuerung für Kamera-Orbit
   ════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  /* ── HILFSFUNKTION: Subscript parsen, z.B. "h_K" oder "x_{Drei}" ── */
  function parseSubscripts(text) {
    var parts = [];
    var i = 0;
    while (i < text.length) {
      if (text[i] === '_') {
        if (text[i + 1] === '{') {
          var end = text.indexOf('}', i + 2);
          parts.push({ text: text.substring(i + 2, end), sub: true });
          i = end + 1;
        } else {
          parts.push({ text: text[i + 1], sub: true });
          i += 2;
        }
      } else {
        var j = i;
        while (j < text.length && text[j] !== '_') j++;
        parts.push({ text: text.substring(i, j), sub: false });
        i = j;
      }
    }
    return parts;
  }

  /* ── LABEL: Text als Sprite (immer zur Kamera ausgerichtet) ── */
  function makeLabel(text, color, fs, italic) {
    if (fs === undefined) fs = 48;
    if (italic === undefined) italic = true;
    var cv = document.createElement('canvas');
    var ctx = cv.getContext('2d');
    var DPR = 2;
    var parts = parseSubscripts(text);
    var fontMain = (italic ? 'italic ' : '') + fs + 'px Cambria, Georgia, serif';
    var fontSub  = (italic ? 'italic ' : '') + (fs * 0.62) + 'px Cambria, Georgia, serif';
    ctx.font = fontMain;
    var totalW = 0;
    for (var p = 0; p < parts.length; p++) {
      ctx.font = parts[p].sub ? fontSub : fontMain;
      totalW += ctx.measureText(parts[p].text).width;
    }
    var actualFs = fs;
    var maxCanvasW = 512;
    if (totalW > maxCanvasW - 30) {
      var k = (maxCanvasW - 30) / totalW;
      actualFs = fs * k;
      totalW *= k;
    }
    var pad = 14;
    var W = Math.max(64, Math.ceil(totalW + pad * 2));
    var H = Math.ceil(actualFs * 1.55);
    cv.width  = W * DPR;
    cv.height = H * DPR;
    ctx.scale(DPR, DPR);
    ctx.clearRect(0, 0, W, H);
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    var mainFont = (italic ? 'italic ' : '') + actualFs + 'px Cambria, Georgia, serif';
    var subFont  = (italic ? 'italic ' : '') + (actualFs * 0.62) + 'px Cambria, Georgia, serif';
    var baseY = H / 2;
    var subY  = baseY + actualFs * 0.18;
    var x = pad;
    for (var q = 0; q < parts.length; q++) {
      if (parts[q].sub) {
        ctx.font = subFont;
        ctx.fillText(parts[q].text, x, subY);
        x += ctx.measureText(parts[q].text).width;
      } else {
        ctx.font = mainFont;
        ctx.fillText(parts[q].text, x, baseY);
        x += ctx.measureText(parts[q].text).width;
      }
    }
    var tex = new THREE.CanvasTexture(cv);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    var mat = new THREE.SpriteMaterial({
      map: tex, transparent: true, opacity: 1,
      depthTest: false, depthWrite: false
    });
    mat.userData.maxOp = 1;
    var sprite = new THREE.Sprite(mat);
    var scY = actualFs * 0.006;
    var scX = scY * (W / H);
    sprite.scale.set(scX, scY, 1);
    sprite.renderOrder = 999;
    return sprite;
  }

  /* ── VEKTOR-LABEL: Buchstabe mit Pfeil oben drüber (für v⃗) ── */
  function makeVecLabel(letter, color, fs, italic) {
    if (fs === undefined) fs = 48;
    if (italic === undefined) italic = true;
    var cv = document.createElement('canvas');
    var ctx = cv.getContext('2d');
    var DPR = 2;
    var fontMain = (italic ? 'italic ' : '') + fs + 'px Cambria, Georgia, serif';
    ctx.font = fontMain;
    var textW = ctx.measureText(letter).width;
    var pad = 14;
    var W = Math.max(64, Math.ceil(textW + pad * 2));
    var H = Math.ceil(fs * 1.85);
    cv.width  = W * DPR;
    cv.height = H * DPR;
    ctx.scale(DPR, DPR);
    ctx.clearRect(0, 0, W, H);
    ctx.font = fontMain;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    var baseY = H * 0.62;
    ctx.fillText(letter, pad, baseY);
    // Pfeil oben drüber
    var arrowY = H * 0.22;
    var arrowXStart = pad - 3;
    var arrowXEnd = pad + textW + 3;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.6, fs * 0.05);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(arrowXStart, arrowY);
    ctx.lineTo(arrowXEnd, arrowY);
    ctx.stroke();
    var headSize = fs * 0.17;
    ctx.beginPath();
    ctx.moveTo(arrowXEnd, arrowY);
    ctx.lineTo(arrowXEnd - headSize, arrowY - headSize * 0.55);
    ctx.moveTo(arrowXEnd, arrowY);
    ctx.lineTo(arrowXEnd - headSize, arrowY + headSize * 0.55);
    ctx.stroke();
    var tex = new THREE.CanvasTexture(cv);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    var mat = new THREE.SpriteMaterial({
      map: tex, transparent: true, opacity: 1,
      depthTest: false, depthWrite: false
    });
    mat.userData.maxOp = 1;
    var sprite = new THREE.Sprite(mat);
    var scY = fs * 0.006 * 1.35;
    var scX = scY * (W / H);
    sprite.scale.set(scX, scY, 1);
    sprite.renderOrder = 999;
    return sprite;
  }

  /* ── ACHSE: Linie + Pfeilspitze + Beschriftung ── */
  function makeAxis(dir, length, labelText) {
    var g = new THREE.Group();
    var col = 0x777799;
    var lineGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      dir.clone().multiplyScalar(length)
    ]);
    var lineMat = new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.75 });
    lineMat.userData.maxOp = 0.75;
    g.add(new THREE.Line(lineGeom, lineMat));

    var coneMat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.9 });
    coneMat.userData.maxOp = 0.9;
    var cone = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.38, 16), coneMat);
    var tip = dir.clone().multiplyScalar(length);
    cone.position.copy(tip);
    var up = new THREE.Vector3(0, 1, 0);
    var qn = new THREE.Quaternion().setFromUnitVectors(up, dir.clone().normalize());
    cone.quaternion.copy(qn);
    g.add(cone);

    var label = makeLabel(labelText, '#9999b5', 48, true);
    var labelOffset = dir.clone().multiplyScalar(length + 0.45);
    label.position.copy(labelOffset);
    g.add(label);
    return g;
  }

  /* ── PUNKT (kleine Kugel) ── */
  function makeDot(pos, colorHex, radius) {
    if (radius === undefined) radius = 0.075;
    var mat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 1 });
    mat.userData.maxOp = 1;
    var m = new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 16), mat);
    m.position.copy(pos);
    m.renderOrder = 10;
    return m;
  }

  /* ── DURCHGEZOGENE LINIE ── */
  function makeLine(from, to, colorHex, opacity) {
    if (opacity === undefined) opacity = 1;
    var g = new THREE.BufferGeometry().setFromPoints([from, to]);
    var mat = new THREE.LineBasicMaterial({ color: colorHex, transparent: true, opacity: opacity });
    mat.userData.maxOp = opacity;
    return new THREE.Line(g, mat);
  }

  /* ── GESTRICHELTE LINIE ── */
  function makeDashedLine(from, to, colorHex, opacity, dashSize, gapSize) {
    if (opacity  === undefined) opacity  = 1;
    if (dashSize === undefined) dashSize = 0.14;
    if (gapSize  === undefined) gapSize  = 0.1;
    var g = new THREE.BufferGeometry().setFromPoints([from, to]);
    var mat = new THREE.LineDashedMaterial({
      color: colorHex, transparent: true, opacity: opacity,
      dashSize: dashSize, gapSize: gapSize
    });
    mat.userData.maxOp = opacity;
    var line = new THREE.Line(g, mat);
    line.computeLineDistances();
    return line;
  }

  /* ── PFEIL (Linie mit Kegel-Spitze am Ende) ── */
  function makeArrow(from, to, colorHex, headLen, headR) {
    if (headLen === undefined) headLen = 0.28;
    if (headR   === undefined) headR   = 0.11;
    var g = new THREE.Group();
    var dir = to.clone().sub(from);
    var len = dir.length();
    var nd  = dir.clone().normalize();
    var shaftEnd = from.clone().add(nd.clone().multiplyScalar(Math.max(0, len - headLen)));
    var shaftMat = new THREE.LineBasicMaterial({ color: colorHex, transparent: true, opacity: 1 });
    shaftMat.userData.maxOp = 1;
    var shaftGeom = new THREE.BufferGeometry().setFromPoints([from, shaftEnd]);
    g.add(new THREE.Line(shaftGeom, shaftMat));
    var coneMat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 1 });
    coneMat.userData.maxOp = 1;
    var cone = new THREE.Mesh(new THREE.ConeGeometry(headR, headLen, 16), coneMat);
    cone.position.copy(to.clone().sub(nd.clone().multiplyScalar(headLen / 2)));
    var up = new THREE.Vector3(0, 1, 0);
    cone.quaternion.setFromUnitVectors(up, nd);
    g.add(cone);
    return g;
  }

  /* ── BODEN-/EBENEN-PATCH (eingefärbtes Quadrat) ── */
  function makeFloorPatch(size, colorHex, opacity) {
    var g = new THREE.PlaneGeometry(size, size);
    var mat = new THREE.MeshBasicMaterial({
      color: colorHex, transparent: true, opacity: opacity,
      side: THREE.DoubleSide, depthWrite: false
    });
    mat.userData.maxOp = opacity;
    var m = new THREE.Mesh(g, mat);
    m.position.set(0, 0, -0.001);
    return m;
  }

  /* ── OPACITY für komplette Gruppe setzen (rekursiv) ── */
  function setOpacity(obj, op) {
    obj.traverse(function (o) {
      if (o.material) {
        var mats = Array.isArray(o.material) ? o.material : [o.material];
        for (var i = 0; i < mats.length; i++) {
          var m = mats[i];
          if (m.userData && typeof m.userData.maxOp === 'number') {
            m.opacity = m.userData.maxOp * op;
          } else if (m.transparent !== false) {
            m.opacity = op;
          }
        }
      }
    });
    obj.visible = op > 0.001;
  }

  /* ── KAMERA-ORBIT-CONTROLS (Drag, Wheel, Touch) ── */
  function makeOrbitControls(canvas, state) {
    // state = { camAzim, camElev, camR, lastInteract, autoRotate, onInteract }
    var dragging = false;
    var lastX = 0, lastY = 0;
    var pinchPrevDist = 0;

    function touchNow() {
      state.lastInteract = performance.now();
      state.autoRotate = false;
      if (state.onInteract) state.onInteract();
    }

    canvas.addEventListener('mousedown', function (e) {
      dragging = true; lastX = e.clientX; lastY = e.clientY; touchNow();
    });
    window.addEventListener('mouseup', function () { dragging = false; });
    window.addEventListener('mousemove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - lastX;
      var dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      state.camAzim -= dx * 0.005;
      state.camElev += dy * 0.005;
      state.camElev = Math.max(-Math.PI / 2 + 0.08, Math.min(Math.PI / 2 - 0.08, state.camElev));
      touchNow();
    });
    canvas.addEventListener('wheel', function (e) {
      e.preventDefault();
      var factor = Math.pow(1.08, e.deltaY * 0.01);
      state.camR *= factor;
      state.camR = Math.max(state.camRMin || 6, Math.min(state.camRMax || 60, state.camR));
      touchNow();
    }, { passive: false });

    canvas.addEventListener('touchstart', function (e) {
      if (e.touches.length === 1) {
        dragging = true;
        lastX = e.touches[0].clientX;
        lastY = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        dragging = false;
        var dx = e.touches[0].clientX - e.touches[1].clientX;
        var dy = e.touches[0].clientY - e.touches[1].clientY;
        pinchPrevDist = Math.sqrt(dx * dx + dy * dy);
      }
      touchNow();
    }, { passive: false });
    canvas.addEventListener('touchmove', function (e) {
      e.preventDefault();
      if (e.touches.length === 1 && dragging) {
        var dx = e.touches[0].clientX - lastX;
        var dy = e.touches[0].clientY - lastY;
        lastX = e.touches[0].clientX;
        lastY = e.touches[0].clientY;
        state.camAzim -= dx * 0.005;
        state.camElev += dy * 0.005;
        state.camElev = Math.max(-Math.PI / 2 + 0.08, Math.min(Math.PI / 2 - 0.08, state.camElev));
      } else if (e.touches.length === 2) {
        var dx2 = e.touches[0].clientX - e.touches[1].clientX;
        var dy2 = e.touches[0].clientY - e.touches[1].clientY;
        var d = Math.sqrt(dx2 * dx2 + dy2 * dy2);
        if (pinchPrevDist > 0) {
          var scale = pinchPrevDist / d;
          state.camR *= scale;
          state.camR = Math.max(state.camRMin || 6, Math.min(state.camRMax || 60, state.camR));
        }
        pinchPrevDist = d;
      }
      touchNow();
    }, { passive: false });
    canvas.addEventListener('touchend', function () { dragging = false; pinchPrevDist = 0; });
  }

  /* ── EMBED-MODUS: Body-Klasse setzen, wenn ?embed=1 ── */
  function applyEmbedMode() {
    if (location.search.indexOf('embed=1') >= 0) {
      document.body.classList.add('embed');
    }
  }

  /* ── EXPORT ── */
  global.SceneHelpers = {
    parseSubscripts: parseSubscripts,
    makeLabel: makeLabel,
    makeVecLabel: makeVecLabel,
    makeAxis: makeAxis,
    makeDot: makeDot,
    makeLine: makeLine,
    makeDashedLine: makeDashedLine,
    makeArrow: makeArrow,
    makeFloorPatch: makeFloorPatch,
    setOpacity: setOpacity,
    makeOrbitControls: makeOrbitControls,
    applyEmbedMode: applyEmbedMode
  };
})(window);
