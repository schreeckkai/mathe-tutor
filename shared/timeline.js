/* ════════════════════════════════════════════════════════════════
   TIMELINE & KAPITEL-ENGINE
   ────────────────────────────────────────────────────────────────
   Steuert das Abspielen einer animierten Kapitel-Sequenz:
   - Fade-In von Szenenobjekten pro Kapitel
   - Timeline-UI (klickbare Segmente, Tooltip mit Titel)
   - Auto-Replay nach Ende
   - Pause/Reset-Buttons

   Voraussetzungen im DOM (vom HTML-Wrapper bereitgestellt):
     #info, #infoLabel, #infoTitle, #infoDesc
     #top-bar, #btn-reset, #btn-pause, #timeline
     #tooltip mit .tt-title und .tt-range

   Voraussetzungen im Code:
     - eine THREE.Scene "scene" mit Objekten, die userData.ch tragen
       (ch = ab welchem Kapitel sichtbar; 0 = von Anfang an)
     - ein Array "chapters" mit { t, label, title, desc }
     - eine "render"-Funktion (Three.js animation loop)
   ════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  function createTimeline(opts) {
    // opts = { scene, chapters }
    var scene    = opts.scene;
    var chapters = opts.chapters;

    /* ── Tween-System für sanfte Opacity-Übergänge ── */
    var tweens = [];
    function tween(obj, from, to, dur) {
      tweens.push({ obj: obj, from: from, to: to, dur: dur, t: 0 });
    }
    function clearTweensFor(obj) {
      for (var i = tweens.length - 1; i >= 0; i--) {
        if (tweens[i].obj === obj) tweens.splice(i, 1);
      }
    }
    function fadeIn(obj, dur) {
      if (dur === undefined) dur = 0.7;
      clearTweensFor(obj);
      SceneHelpers.setOpacity(obj, 0);
      obj.visible = true;
      tween(obj, 0, 1, dur);
    }
    function updateTweens(dt) {
      for (var i = tweens.length - 1; i >= 0; i--) {
        var tw = tweens[i];
        tw.t += dt;
        var k = tw.t / tw.dur;
        if (k >= 1) { k = 1; tweens.splice(i, 1); }
        // ease-in-out quadratisch
        var e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        var v = tw.from + (tw.to - tw.from) * e;
        SceneHelpers.setOpacity(tw.obj, v);
      }
    }

    /* ── Pro Kapitel: alle Objekte mit userData.ch <= i sichtbar ── */
    function forEachTrackedObj(fn) {
      scene.traverse(function (o) {
        if (o.userData && typeof o.userData.ch === 'number') fn(o);
      });
    }
    function setEndState(i) {
      forEachTrackedObj(function (o) {
        clearTweensFor(o);
        var visible = o.userData.ch <= i;
        SceneHelpers.setOpacity(o, visible ? 1 : 0);
      });
    }
    function enterChapter(i) {
      forEachTrackedObj(function (o) {
        if (o.userData.ch === i) fadeIn(o, 0.7);
      });
    }

    /* ── Timeline-UI bauen ── */
    var timelineEl = document.getElementById('timeline');
    var tooltip    = document.getElementById('tooltip');
    var segments = [];
    var cumTime = 0;
    for (var ci = 0; ci < chapters.length; ci++) {
      (function (i, ch) {
        var seg = document.createElement('div');
        seg.className = 'segment';
        seg.style.flex = ch.t;
        var fill = document.createElement('div'); fill.className = 'fill'; seg.appendChild(fill);
        var num  = document.createElement('div'); num.className = 'num'; num.textContent = (i + 1); seg.appendChild(num);
        var ts   = document.createElement('div'); ts.className = 'ts';
        var mn = Math.floor(cumTime / 60);
        var sc = Math.floor(cumTime % 60);
        ts.textContent = mn + ':' + (sc < 10 ? '0' : '') + sc;
        seg.appendChild(ts);
        cumTime += ch.t;
        seg.addEventListener('click', function () { seekTo(i); });
        seg.addEventListener('mouseenter', function (e) { showTip(i, e); });
        seg.addEventListener('mouseleave', hideTip);
        seg.addEventListener('mousemove', moveTip);
        timelineEl.appendChild(seg);
        segments.push({ el: seg, fill: fill, ch: ch });
      })(ci, chapters[ci]);
    }

    function showTip(i, e) {
      var ch = chapters[i];
      var start = 0; for (var k = 0; k < i; k++) start += chapters[k].t;
      var end = start + ch.t;
      tooltip.querySelector('.tt-title').textContent = ch.title;
      tooltip.querySelector('.tt-range').textContent = fmtTime(start) + ' – ' + fmtTime(end);
      tooltip.style.display = 'block';
      moveTip(e);
    }
    function hideTip() { tooltip.style.display = 'none'; }
    function moveTip(e) {
      tooltip.style.left = (e.clientX + 12) + 'px';
      tooltip.style.top  = (e.clientY - 44) + 'px';
    }
    function fmtTime(s) {
      var m = Math.floor(s / 60);
      var sc = Math.floor(s % 60);
      return m + ':' + (sc < 10 ? '0' : '') + sc;
    }

    /* ── Playback-Zustand ── */
    var infoLabel = document.getElementById('infoLabel');
    var infoTitle = document.getElementById('infoTitle');
    var infoDesc  = document.getElementById('infoDesc');

    var currentCh = 0;
    var chElapsed = 0;
    var playing   = true;
    var endPause  = 0;
    var atEnd     = false;

    function applyInfo(i) {
      var ch = chapters[i];
      infoLabel.textContent = ch.label;
      infoTitle.innerHTML   = ch.title;
      infoDesc.innerHTML    = ch.desc;
    }
    function seekTo(i) {
      atEnd = false; endPause = 0;
      currentCh = i;
      chElapsed = 0;
      setEndState(i - 1);
      enterChapter(i);
      applyInfo(i);
      updateTimelineUI();
    }
    function updateTimelineUI() {
      for (var k = 0; k < segments.length; k++) {
        var s = segments[k];
        s.el.classList.remove('active', 'done');
        if (k < currentCh) s.el.classList.add('done');
        else if (k === currentCh) s.el.classList.add('active');
        var frac = k < currentCh ? 1 : (k === currentCh ? Math.min(1, chElapsed / chapters[k].t) : 0);
        s.fill.style.width = (frac * 100) + '%';
      }
    }

    /* ── Reset / Pause Buttons ── */
    var btnReset = document.getElementById('btn-reset');
    var btnPause = document.getElementById('btn-pause');
    btnReset.addEventListener('click', function () {
      seekTo(0);
      playing = true;
      btnPause.innerHTML = '&#10074;&#10074;';
    });
    btnPause.addEventListener('click', function () {
      playing = !playing;
      btnPause.innerHTML = playing ? '&#10074;&#10074;' : '&#9654;';
    });

    /* ── Pro Frame aufrufen ── */
    function tick(dt) {
      updateTweens(dt);
      if (!playing) return;
      if (!atEnd) {
        chElapsed += dt;
        var ch = chapters[currentCh];
        if (chElapsed >= ch.t) {
          if (currentCh + 1 < chapters.length) {
            currentCh += 1;
            chElapsed = 0;
            enterChapter(currentCh);
            applyInfo(currentCh);
          } else {
            atEnd = true;
            endPause = 0;
            chElapsed = ch.t;
          }
        }
        updateTimelineUI();
      } else {
        endPause += dt;
        if (endPause >= 2.5) seekTo(0);
      }
    }

    /* ── Initial: Kapitel 0 starten ── */
    seekTo(0);

    return { tick: tick, seekTo: seekTo };
  }

  global.Timeline = { create: createTimeline };
})(window);
