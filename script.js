/**
 * 🐸 蛙蛙池塘 — 交互逻辑
 * 每次刷新随机分布荷叶/鱼/花/水草，青蛙固定中央
 * 泡泡用 bubble.png，鱼点击逃跑，花草点击摇晃
 */
(function () {
  'use strict';

  var pond       = document.getElementById('pond');
  var frogWrap   = document.getElementById('frogWrap');
  var thinkBub   = document.getElementById('thinkBubble');
  var thinkOpen  = false;

  // 容器
  var lilyC   = document.getElementById('lilyContainer');
  var flowerC = document.getElementById('flowerContainer');
  var fishC   = document.getElementById('fishContainer');
  var grassC  = document.getElementById('grassContainer');
  var pgC     = document.getElementById('pixelGrassContainer');

  /* ==========================================
     工具函数
     ========================================== */
  function rand(min, max) { return min + Math.random() * (max - min); }
  function randInt(min, max) { return Math.floor(rand(min, max + 1)); }

  // 在池塘内生成安全位置（避开中央青蛙区域）
  function safePos(wPct, hPct) {
    var x, y, tries = 0;
    do {
      x = rand(8, 88 - wPct);
      y = rand(10, 85 - hPct);
      tries++;
    } while (tries < 30 && x > 30 && x < 60 && y > 25 && y < 65);
    return { x: x, y: y };
  }

  /* ==========================================
     1. 随机分布荷叶 ×5
     ========================================== */
  for (var i = 0; i < 5; i++) {
    var lp = document.createElement('img');
    lp.src = 'images/lily_pad.png';
    lp.alt = '荷叶';
    lp.className = 'decor lily-pad interactive';
    var lpW = rand(11, 16);
    lp.style.width = lpW + '%';
    var pos = safePos(lpW, 8);
    lp.style.left = pos.x + '%';
    lp.style.top  = pos.y + '%';
    lp.style.transform = 'rotate(' + rand(-20, 20).toFixed(0) + 'deg)';
    lp.draggable = false;
    lilyC.appendChild(lp);
    // 点击摇晃 + 波纹
    (function(el) {
      el.addEventListener('click', function(e) {
        e.stopPropagation();
        el.classList.remove('wobble');
        void el.offsetWidth;
        el.classList.add('wobble');
        createRipple(e.clientX, e.clientY);
        el.addEventListener('animationend', function h() {
          el.classList.remove('wobble');
          el.removeEventListener('animationend', h);
        });
      });
    })(lp);
  }

  /* ==========================================
     2. 随机分布小花 ×3
     ========================================== */
  for (var fi = 0; fi < 3; fi++) {
    var fl = document.createElement('img');
    fl.src = 'images/flower.png';
    fl.alt = '小花';
    fl.className = 'decor flower interactive';
    var flW = rand(4, 7);
    fl.style.width = flW + '%';
    var fpos = safePos(flW, 5);
    fl.style.left = fpos.x + '%';
    fl.style.top  = fpos.y + '%';
    fl.style.animationDelay = rand(0, 3).toFixed(1) + 's';
    fl.draggable = false;
    flowerC.appendChild(fl);
    // 点击摇晃
    (function(el) {
      el.addEventListener('click', function(e) {
        e.stopPropagation();
        el.classList.remove('shake');
        void el.offsetWidth;
        el.classList.add('shake');
        el.addEventListener('animationend', function h() {
          el.classList.remove('shake');
          el.removeEventListener('animationend', h);
        });
      });
    })(fl);
  }

  /* ==========================================
     3. 随机分布小鱼 ×4（朝向正确+游动）
     ========================================== */
  for (var fii = 0; fii < 4; fii++) {
    var fish = document.createElement('img');
    fish.src = 'images/fish.png';
    fish.alt = '小鱼';
    fish.className = 'decor fish interactive swimming';
    var fishW = rand(5, 8);
    fish.style.width = fishW + '%';
    var fshPos = safePos(fishW, 5);
    fish.style.left = fshPos.x + '%';
    fish.style.top  = fshPos.y + '%';
    fish.draggable = false;

    // 游动参数（CSS 变量）
    var dir = Math.random() > 0.5 ? 1 : -1;
    var dx  = randInt(40, 100) + 'px';
    var dx2 = randInt(80, 180) + 'px';
    fish.style.setProperty('--fish-dir', dir);
    fish.style.setProperty('--swim-dur', rand(10, 20).toFixed(0) + 's');
    fish.style.setProperty('--swim-dx', (dir > 0 ? '' : '-') + dx);
    fish.style.setProperty('--swim-dx2', (dir > 0 ? '' : '-') + dx2);
    fish.style.setProperty('--swim-dy1', randInt(-12, 12) + 'px');
    fish.style.setProperty('--swim-dy2', randInt(-8, 8) + 'px');
    fish.style.setProperty('--swim-dy3', randInt(-12, 12) + 'px');
    fish.style.transform = 'scaleX(' + dir + ')';
    fish.style.animationDelay = rand(0, 5).toFixed(1) + 's';

    fishC.appendChild(fish);

    // 点击鱼：快速逃跑
    (function(el, direction) {
      el.addEventListener('click', function(e) {
        e.stopPropagation();
        el.classList.remove('swimming');
        el.classList.add('flee');
        // 向鱼当前朝向快速移动
        var fleeDist = direction * randInt(120, 250);
        el.style.transform = 'translateX(' + fleeDist + 'px) scaleX(' + direction + ')';
        // 逃跑后回来继续游
        setTimeout(function() {
          el.classList.remove('flee');
          el.style.transform = 'scaleX(' + direction + ')';
          void el.offsetWidth;
          el.classList.add('swimming');
        }, 1200);
      });
    })(fish, dir);
  }

  /* ==========================================
     4. 随机分布水草 PNG ×6 + CSS像素水草 ×5
     ========================================== */
  // PNG 水草
  for (var gi = 0; gi < 6; gi++) {
    var gr = document.createElement('img');
    gr.src = 'images/grass.png';
    gr.alt = '水草';
    gr.className = 'decor grass interactive';
    var grW = rand(6, 10);
    gr.style.width = grW + '%';
    // 水草分布在池塘边缘（上下左右）
    var side = gi % 4; // 0上 1下 2左 3右
    if (side === 0) {
      gr.style.top = rand(2, 15) + '%';
      gr.style.left = rand(5, 85) + '%';
    } else if (side === 1) {
      gr.style.bottom = rand(-4, 8) + '%';
      gr.style.left = rand(5, 85) + '%';
    } else if (side === 2) {
      gr.style.left = rand(-2, 8) + '%';
      gr.style.top = rand(15, 75) + '%';
    } else {
      gr.style.right = rand(-2, 8) + '%';
      gr.style.top = rand(15, 75) + '%';
    }
    gr.style.animationDelay = rand(0, 4).toFixed(1) + 's';
    if (Math.random() > 0.5) gr.style.transform = 'scaleX(-1)';
    gr.draggable = false;
    grassC.appendChild(gr);
    // 点击摇晃
    (function(el) {
      el.addEventListener('click', function(e) {
        e.stopPropagation();
        el.classList.remove('shake');
        void el.offsetWidth;
        el.classList.add('shake');
        el.addEventListener('animationend', function h() {
          el.classList.remove('shake');
          el.removeEventListener('animationend', h);
        });
      });
    })(gr);
  }

  // CSS 像素水草（增加密度）
  var pgColors = ['#5a9e58', '#6db86b', '#4d8f4b', '#7cc97a', '#58a556'];
  for (var pi = 0; pi < 5; pi++) {
    var pg = document.createElement('div');
    pg.className = 'decor pixel-grass';
    var pgSide = pi % 4;
    if (pgSide === 0) {
      pg.style.top = rand(3, 12) + '%';
      pg.style.left = rand(10, 80) + '%';
    } else if (pgSide === 1) {
      pg.style.bottom = rand(0, 10) + '%';
      pg.style.left = rand(10, 80) + '%';
    } else if (pgSide === 2) {
      pg.style.left = rand(2, 10) + '%';
      pg.style.top = rand(20, 70) + '%';
    } else {
      pg.style.right = rand(2, 10) + '%';
      pg.style.top = rand(20, 70) + '%';
    }
    pg.style.setProperty('--pg-color', pgColors[pi]);
    pg.style.animationDelay = rand(0, 5).toFixed(1) + 's';
    var h1 = randInt(18, 36) + 'px';
    var h2 = randInt(12, 24) + 'px';
    pg.style.height = h1;  // 容器高度
    // 内部竖条
    pg.innerHTML =
      '<div style="position:absolute;bottom:0;left:0;width:4px;height:' + h1 +
      ';background:linear-gradient(to top,' + pgColors[pi] + ',#7cc97a);image-rendering:pixelated;"></div>' +
      '<div style="position:absolute;bottom:0;left:6px;width:3px;height:' + h2 +
      ';background:linear-gradient(to top,' + pgColors[(pi+1)%5] + ',#90d890);transform:rotate(-6deg);image-rendering:pixelated;"></div>';
    pgC.appendChild(pg);
  }

  /* ==========================================
     5. 点击青蛙：跳跃 + 弹出思考框
     ========================================== */
  frogWrap.addEventListener('click', function(e) {
    e.stopPropagation();
    frogWrap.classList.remove('jumping');
    void frogWrap.offsetWidth;
    frogWrap.classList.add('jumping');
    frogWrap.addEventListener('animationend', function h() {
      frogWrap.classList.remove('jumping');
      frogWrap.removeEventListener('animationend', h);
    });
    setTimeout(function() {
      thinkOpen = !thinkOpen;
      thinkBub.classList.toggle('show', thinkOpen);
    }, 280);
  });

  /* ==========================================
     6. 点击水面空白：波纹 + 像素泡泡
     ========================================== */
  pond.addEventListener('click', function(e) {
    if (e.target.closest('.frog-wrap') ||
        e.target.closest('.think-bubble') ||
        e.target.closest('.lily-pad') ||
        e.target.closest('.fish') ||
        e.target.closest('.flower') ||
        e.target.closest('.grass')) return;

    createRipple(e.clientX, e.clientY);
    var n = randInt(3, 5);
    for (var bi = 0; bi < n; bi++) {
      createBubble(e.clientX, e.clientY, bi);
    }
  });

  /* ==========================================
     辅助：水波纹
     ========================================== */
  function createRipple(cx, cy) {
    var r = pond.getBoundingClientRect();
    var el = document.createElement('div');
    el.className = 'ripple';
    var img = document.createElement('img');
    img.src = 'images/ripple.png';
    img.alt = '';
    el.appendChild(img);
    el.style.left = (cx - r.left) + 'px';
    el.style.top  = (cy - r.top)  + 'px';
    pond.appendChild(el);
    el.addEventListener('animationend', function() { el.remove(); });
  }

  /* ==========================================
     辅助：像素泡泡（使用 bubble.png）
     ========================================== */
  function createBubble(cx, cy, idx) {
    var r = pond.getBoundingClientRect();
    var s = randInt(10, 22);
    var el = document.createElement('div');
    el.className = 'bubble';
    el.style.left = (cx - r.left + rand(-20, 20)) + 'px';
    el.style.top  = (cy - r.top  + rand(-10, 10)) + 'px';
    el.style.animationDelay = (idx * 0.12) + 's';

    var img = document.createElement('img');
    img.src = 'images/bubble.png';
    img.alt = '';
    img.style.width  = s + 'px';
    img.style.height = s + 'px';
    img.draggable = false;
    el.appendChild(img);

    pond.appendChild(el);
    el.addEventListener('animationend', function() { el.remove(); });
  }

})();
