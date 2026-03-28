/**
 * 🐸 蛙蛙池塘 — 交互逻辑
 *
 * 修复清单：
 * - 随机分布不重叠（碰撞检测）
 * - 所有花/草/鱼都有点击判定
 * - 鱼点击后加速游走（不瞬移），朝向正确，含转身
 * - 思考气泡在青蛙上方，点击青蛙可收回
 * - 泡泡用 bubble.png
 */
(function () {
  'use strict';

  var pond     = document.getElementById('pond');
  var frogWrap = document.getElementById('frogWrap');
  var thinkBub = document.getElementById('thinkBubble');
  var elBox    = document.getElementById('elContainer');
  var thinkOpen = false;

  /* ====== 工具 ====== */
  function rand(a, b) { return a + Math.random() * (b - a); }
  function randInt(a, b) { return Math.floor(rand(a, b + 1)); }

  /* ====== 椭圆边界检测 ====== */
  // 根据屏幕朝向动态调整椭圆参数
  // pond.png 横版: 水面椭圆约 中心(50,50) 半轴(36,34)
  // pond_mobile.png 竖版: 水面椭圆约 中心(50,50) 半轴(34,38)
  var ellCx = 50, ellCy = 50, ellA, ellB;

  function updateEllipse() {
    var isPortrait = window.innerHeight > window.innerWidth;
    if (isPortrait) {
      ellA = 41; // 竖版横向
      ellB = 46; // 竖版纵向
    } else {
      ellA = 45; // 横版横向
      ellB = 38; // 横版纵向
    }
  }
  updateEllipse();
  window.addEventListener('resize', updateEllipse);

  function insideEllipse(x, y, w, h) {
    // 检测矩形4个角 + 中心是否都在椭圆内
    var pts = [
      [x, y], [x + w, y], [x, y + h], [x + w, y + h],
      [x + w / 2, y + h / 2]
    ];
    for (var i = 0; i < pts.length; i++) {
      var dx = (pts[i][0] - ellCx) / ellA;
      var dy = (pts[i][1] - ellCy) / ellB;
      if (dx * dx + dy * dy > 1) return false;
    }
    return true;
  }

  function pointInEllipse(x, y) {
    var dx = (x - ellCx) / ellA;
    var dy = (y - ellCy) / ellB;
    return dx * dx + dy * dy <= 1;
  }

  function getFishSize(fish) {
    var w = parseFloat(fish.style.width) || 6;
    var h = parseFloat(fish.dataset.heightPct) || w * 0.6;
    return { w: w, h: h };
  }

  function clampFishPos(x, y, w, h) {
    return {
      x: Math.max(10, Math.min(88 - w, x)),
      y: Math.max(10, Math.min(86 - h, y))
    };
  }

  function resolveFishTarget(fish, fromX, fromY, deltaX, deltaY) {
    var size = getFishSize(fish);
    var attempts = [1, 0.8, 0.6, 0.45, 0.3, 0.18];
    var i;

    for (i = 0; i < attempts.length; i++) {
      var forward = clampFishPos(
        fromX + deltaX * attempts[i],
        fromY + deltaY * attempts[i],
        size.w,
        size.h
      );
      if (insideEllipse(forward.x, forward.y, size.w, size.h)) return forward;
    }

    for (i = 0; i < attempts.length; i++) {
      var backward = clampFishPos(
        fromX - deltaX * attempts[i],
        fromY + deltaY * attempts[i] * 0.5,
        size.w,
        size.h
      );
      if (insideEllipse(backward.x, backward.y, size.w, size.h)) return backward;
    }

    var toCenter = clampFishPos(
      fromX + (50 - fromX) * 0.35,
      fromY + (50 - fromY) * 0.35,
      size.w,
      size.h
    );
    if (insideEllipse(toCenter.x, toCenter.y, size.w, size.h)) return toCenter;

    return { x: fromX, y: fromY };
  }

  /* ====== 碰撞检测 ====== */
  // placed: [{x,y,w,h}, ...]  全部用百分比
  var placed = [];
  // 中央青蛙 + 荷叶座位保留区，按屏幕方向预留中心区域
  function getFrogReserveRect() {
    var isPortrait = window.innerHeight > window.innerWidth;
    return isPortrait
      ? { x: 33, y: 31, w: 34, h: 30 }
      : { x: 38, y: 36, w: 24, h: 22 };
  }
  placed.push(getFrogReserveRect());

  function overlaps(r) {
    for (var i = 0; i < placed.length; i++) {
      var p = placed[i];
      if (r.x < p.x + p.w && r.x + r.w > p.x &&
          r.y < p.y + p.h && r.y + r.h > p.y) return true;
    }
    return false;
  }

  function findPos(w, h, margin) {
    margin = margin || 2;
    var margins = [margin, Math.max(1, margin * 0.5), 0];

    for (var m = 0; m < margins.length; m++) {
      var currentMargin = margins[m];
      for (var t = 0; t < 180; t++) {
        var x = rand(10, 88 - w);
        var y = rand(10, 86 - h);
        var r = {
          x: x - currentMargin,
          y: y - currentMargin,
          w: w + currentMargin * 2,
          h: h + currentMargin * 2
        };
        if (!overlaps(r) && insideEllipse(x, y, w, h)) {
          placed.push(r);
          return { x: x, y: y };
        }
      }
    }

    return null;
  }

  function getHideOffset(total, idx) {
    if (total <= 1) return { x: 0, y: 0 };
    if (total === 2) return idx === 0 ? { x: -1.8, y: 0.4 } : { x: 1.8, y: -0.2 };
    if (total === 3) {
      return [
        { x: -2.2, y: 0.5 },
        { x: 2.2, y: 0.5 },
        { x: 0, y: -1.1 }
      ][idx];
    }

    var angle = (Math.PI * 2 * idx) / total - Math.PI / 2;
    return {
      x: Math.cos(angle) * 2.3,
      y: Math.sin(angle) * 1.4
    };
  }

  function getGrassById(grassId) {
    if (!grassId) return null;
    return elBox.querySelector('.el-grass[data-grass-id="' + grassId + '"]');
  }

  function updateGrassHideLayout(grassId) {
    var grassEl = getGrassById(grassId);
    if (!grassEl) return;

    var hiddenFish = fishes.filter(function(fish) {
      return fish.dataset.hiding === '1' && fish.dataset.hideGrass === grassId;
    });
    var grassX = parseFloat(grassEl.style.left);
    var grassY = parseFloat(grassEl.style.top);

    hiddenFish.forEach(function(fish, idx) {
      var offset = getHideOffset(hiddenFish.length, idx);
      fish.classList.toggle('hiding-group', hiddenFish.length > 1);
      fish.style.left = (grassX + offset.x).toFixed(3) + '%';
      fish.style.top  = (grassY + offset.y).toFixed(3) + '%';
      fish.dataset.hideCount = hiddenFish.length;
    });
  }

  function moveFishTo(fish, fromX, target, fastDuration) {
    if (fastDuration) {
      fish.classList.add('fast');
      if (fish._fastTimer) clearTimeout(fish._fastTimer);
      fish._fastTimer = setTimeout(function() {
        fish.classList.remove('fast');
        fish._fastTimer = null;
      }, fastDuration);
    }

    setFishDir(fish, fromX, target.x);
    fish.style.left = target.x + '%';
    fish.style.top  = target.y + '%';
  }

  function releaseFishFromHide(fish, deltaX, deltaY) {
    var grassId = fish.dataset.hideGrass;
    var fromX = parseFloat(fish.style.left);
    var fromY = parseFloat(fish.style.top);
    var target = resolveFishTarget(fish, fromX, fromY, deltaX, deltaY);

    fish.dataset.hiding = '0';
    fish.classList.remove('hiding');
    fish.classList.remove('hiding-group');
    moveFishTo(fish, fromX, target, 1600);

    if (grassId) updateGrassHideLayout(grassId);
  }

  /* ====== 创建装饰元素 ====== */
  function makeEl(tag, cls, src, wPct) {
    var el;
    if (tag === 'img') {
      el = document.createElement('img');
      el.src = src;
      el.alt = '';
      el.draggable = false;
    } else {
      el = document.createElement('div');
    }
    el.className = 'el ' + cls + ' interactive';
    el.style.width = wPct + '%';
    return el;
  }

  /* ====== 鱼朝向辅助：确保面朝游动方向 ====== */
  // fish.png 默认朝右，scaleX(1)=右，scaleX(-1)=左
  function setFishDir(fish, fromX, toX) {
    if (toX === fromX) return; // 没移动，不改方向
    var d = toX > fromX ? 1 : -1;
    fish.style.transform = 'scaleX(' + d + ')';
    fish.dataset.dir = d;
  }

  /* ==========================================
     荷叶 ×4
     ========================================== */
  for (var li = 0; li < 2; li++) {
    var lw = rand(10, 14);
    var lh = lw * 0.6;  // 近似高宽比
    var lpos = findPos(lw, lh, 10);
    if (!lpos) continue;
    var lp = makeEl('img', 'el-lily', 'images/lily_pad.png', lw);
    lp.style.left = lpos.x + '%';
    lp.style.top  = lpos.y + '%';
    var rot = rand(-18, 18);
    lp.style.transform = 'rotate(' + rot.toFixed(0) + 'deg)';
    lp.style.setProperty('--rot', rot.toFixed(0) + 'deg');
    elBox.appendChild(lp);

    (function(el) {
      el.addEventListener('click', function(e) {
        e.stopPropagation();
        el.classList.remove('wobble'); void el.offsetWidth; el.classList.add('wobble');
        createRipple(e.clientX, e.clientY);
        el.addEventListener('animationend', function h() {
          el.classList.remove('wobble'); el.removeEventListener('animationend', h);
        });
      });
    })(lp);
  }

  /* ==========================================
     水草 PNG ×8
     ========================================== */
  for (var gi = 0; gi < 8; gi++) {
    var gw = rand(5, 9);
    var gh = gw * 1.8;
    var gpos = findPos(gw, gh);
    if (!gpos) continue;
    var gr = makeEl('img', 'el-grass', 'images/grass.png', gw);
    gr.dataset.grassId = 'grass-' + gi;
    gr.style.left = gpos.x + '%';
    gr.style.top  = gpos.y + '%';
    gr.style.setProperty('--sx', Math.random() > 0.5 ? '-1' : '1');
    gr.style.animationDelay = rand(0, 4).toFixed(1) + 's';
    elBox.appendChild(gr);

    (function(el) {
      el.addEventListener('click', function(e) {
        e.stopPropagation();
        var grassId = el.dataset.grassId;
        el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
        el.addEventListener('animationend', function h() {
          el.classList.remove('shake'); el.removeEventListener('animationend', h);
        });
        // 释放躲在这棵水草下的鱼
        fishes.forEach(function(fish) {
          if ((fish.dataset.hiding === '1' || fish.dataset.hiding === 'swimming') && fish.dataset.hideGrass === grassId) {
            releaseFishFromHide(fish, (Math.random() > 0.5 ? 1 : -1) * rand(15, 25), rand(-6, 6));
          }
        });
      });
    })(gr);
  }

  /* ==========================================
     小花 ×3
     ========================================== */
  for (var fi = 0; fi < 3; fi++) {
    var fw = rand(3.5, 6);
    var fh = fw * 1.2;
    var fpos = findPos(fw, fh);
    if (!fpos) continue;
    var fl = makeEl('img', 'el-flower', 'images/flower.png', fw);
    fl.style.left = fpos.x + '%';
    fl.style.top  = fpos.y + '%';
    fl.style.animationDelay = rand(0, 3).toFixed(1) + 's';
    elBox.appendChild(fl);

    (function(el) {
      el.addEventListener('click', function(e) {
        e.stopPropagation();
        el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
        el.addEventListener('animationend', function h() {
          el.classList.remove('shake'); el.removeEventListener('animationend', h);
        });
      });
    })(fl);
  }

  /* ==========================================
     小鱼 ×6 — 平滑游动 + 椭圆内 + 躲水草
     ========================================== */
  var fishes = [];
  var grassEls = document.querySelectorAll('.el-grass');

  for (var fii = 0; fii < 6; fii++) {
    var fishW = rand(5, 7.5);
    var fishH = fishW * 0.6;
    var fishPos = findPos(fishW, fishH);
    if (!fishPos) continue;

    var fish = makeEl('img', 'el-fish', 'images/fish.png', fishW);
    fish.style.left = fishPos.x + '%';
    fish.style.top  = fishPos.y + '%';

    // 初始朝向（1=右，-1=左）
    var dir = Math.random() > 0.5 ? 1 : -1;
    fish.style.transform = 'scaleX(' + dir + ')';
    fish.dataset.dir = dir;
    fish.dataset.heightPct = fishH;
    fish.dataset.hiding = '0';

    elBox.appendChild(fish);
    fishes.push(fish);

    // 点击：如果躲着就出来，否则加速逃跑
    (function(el) {
      el.addEventListener('click', function(e) {
        e.stopPropagation();
        // 如果在躲藏中或正在游向水草，点击出来
        if (el.dataset.hiding === '1' || el.dataset.hiding === 'swimming') {
          var curDir = parseInt(el.dataset.dir);
          releaseFishFromHide(el, (-curDir) * rand(15, 25), rand(-6, 6));
          return;
        }

        var curDir = parseInt(el.dataset.dir);
        var curX = parseFloat(el.style.left);
        // 如果鱼在池塘边缘附近，先回头
        if (!pointInEllipse(curX + curDir * 5, parseFloat(el.style.top))) {
          curDir = -curDir;
        }
        // 加速：沿当前朝向移动
        var curY = parseFloat(el.style.top);
        var clickTarget = resolveFishTarget(el, curX, curY, curDir * rand(15, 30), rand(-8, 8));
        moveFishTo(el, curX, clickTarget, 1600);
      });
    })(fish);
  }

  // 让鱼躲到水草下面：先游过去，到达后再变透明
  function hideUnderGrass(fish) {
    var grasses = elBox.querySelectorAll('.el-grass');
    if (grasses.length === 0) return false;
    var g = grasses[randInt(0, grasses.length - 1)];
    var gx = parseFloat(g.style.left);
    var gy = parseFloat(g.style.top);
    var grassId = g.dataset.grassId;

    // 记录目标水草引用
    fish.dataset.hideGrass = grassId;
    fish.classList.remove('hiding-group');

    // 先朝向水草方向
    var curX = parseFloat(fish.style.left);
    setFishDir(fish, curX, gx);

    // 游到水草位置（正常速度，8s transition）
    fish.style.left = gx + '%';
    fish.style.top  = gy + '%';

    // 游到之后再变透明（延迟等 transition 完成）
    fish.dataset.hiding = 'swimming'; // 正在游向水草
    setTimeout(function() {
      // 到达后变透明
      if (fish.dataset.hiding === 'swimming') {
        fish.dataset.hiding = '1';
        fish.classList.add('hiding');
        updateGrassHideLayout(grassId);
      }
    }, 3500);
    return true;
  }

  // 鱼巡游定时器
  function moveFish() {
    fishes.forEach(function(fish) {
      if (fish.classList.contains('fast')) return;
      if (fish.dataset.hiding === '1' || fish.dataset.hiding === 'swimming') return;

      // 小概率偷懒不动
      if (Math.random() < 0.05) return;

      // 很小概率躲到水草下
      if (Math.random() < 0.1) {
        hideUnderGrass(fish);
        return;
      }

      var curX = parseFloat(fish.style.left);
      var curY = parseFloat(fish.style.top);
      var curDir = parseInt(fish.dataset.dir);
      var size = getFishSize(fish);

      // 如果当前位置不在椭圆内，游回中心方向
      if (!insideEllipse(curX, curY, size.w, size.h)) {
        var recoverTarget = resolveFishTarget(fish, curX, curY, 50 - curX, 50 - curY);
        moveFishTo(fish, curX, recoverTarget);
        return;
      }

      // 如果在边缘附近，强制转向
      var probeTarget = resolveFishTarget(fish, curX, curY, curDir * 10, 0);
      if (probeTarget.x === curX && probeTarget.y === curY) curDir = -curDir;

      var dx = rand(8, 22) * (Math.random() > 0.3 ? curDir : -curDir);
      var dy = rand(-6, 6);
      var target = resolveFishTarget(fish, curX, curY, dx, dy);
      if (target.x === curX && target.y === curY) {
        target = resolveFishTarget(fish, curX, curY, (50 - curX) * 0.45, (50 - curY) * 0.45);
      }
      moveFishTo(fish, curX, target);
    });
  }
  // 每 3 秒移动一次
  setInterval(moveFish, 3000);
  setTimeout(moveFish, 1500); // 初始延迟后开始

  /* ==========================================
     思考气泡 — 箭头切换想法
     ========================================== */
  var thinkIdeas = [
    { icon: '🦒', href: 'https://lijiangyu010.github.io/goldfish/' },
    { icon: '🌳', href: '#' },
    { icon: '🐇', href: '#' },
    { icon: '🌸', href: '#' },
    { icon: '⭐', href: '#' },
    { icon: '🍄', href: '#' }
  ];
  var thinkIdx = 0;
  var thinkIconEl = document.getElementById('thinkIcon');
  var thinkLink  = document.getElementById('thinkLink');
  var arrowLeft  = document.getElementById('arrowLeft');
  var arrowRight = document.getElementById('arrowRight');

  function syncCurrentIdea() {
    thinkIconEl.textContent = thinkIdeas[thinkIdx].icon;
    thinkLink.href = thinkIdeas[thinkIdx].href;
  }

  function updateArrows() {
    arrowLeft.classList.toggle('disabled', thinkIdx <= 0);
    arrowRight.classList.toggle('disabled', thinkIdx >= thinkIdeas.length - 1);
    syncCurrentIdea();
  }

  function switchIdea(newIdx) {
    if (newIdx < 0 || newIdx >= thinkIdeas.length) return false;
    thinkIdx = newIdx;
    thinkIconEl.classList.remove('switching');
    void thinkIconEl.offsetWidth;
    thinkIconEl.classList.add('switching');
    setTimeout(syncCurrentIdea, 120);
    thinkIconEl.addEventListener('animationend', function h() {
      thinkIconEl.classList.remove('switching');
      thinkIconEl.removeEventListener('animationend', h);
    });
    updateArrows();
    return true;
  }

  function arrowFeedback(el) {
    el.classList.remove('click-feedback');
    void el.offsetWidth;
    el.classList.add('click-feedback');
    el.addEventListener('animationend', function h() {
      el.classList.remove('click-feedback');
      el.removeEventListener('animationend', h);
    });
  }

  arrowLeft.addEventListener('click', function(e) {
    e.stopPropagation();
    arrowFeedback(arrowLeft);
    if (!switchIdea(thinkIdx - 1)) {
      // 已经是第一个，震动反馈
      arrowLeft.style.animation = 'none'; void arrowLeft.offsetWidth;
    }
  });

  arrowRight.addEventListener('click', function(e) {
    e.stopPropagation();
    arrowFeedback(arrowRight);
    if (!switchIdea(thinkIdx + 1)) {
      arrowRight.style.animation = 'none'; void arrowRight.offsetWidth;
    }
  });

  updateArrows();

  /* ==========================================
     青蛙点击：跳跃 + 切换思考气泡
     ========================================== */
  frogWrap.addEventListener('click', function(e) {
    e.stopPropagation();
    // 跳跃动画
    frogWrap.classList.remove('jumping'); void frogWrap.offsetWidth;
    frogWrap.classList.add('jumping');
    frogWrap.addEventListener('animationend', function h() {
      frogWrap.classList.remove('jumping'); frogWrap.removeEventListener('animationend', h);
    });
    // 切换气泡
    setTimeout(function() {
      thinkOpen = !thinkOpen;
      thinkBub.classList.toggle('show', thinkOpen);
    }, 250);
  });

  /* ==========================================
     点击水面空白：波纹 + 泡泡
     ========================================== */
  pond.addEventListener('click', function(e) {
    if (e.target.closest('.frog-wrap') ||
        e.target.closest('.think-bubble') ||
        e.target.closest('.el')) return;

    // 只在椭圆水面区域内产生波纹和泡泡
    var rect = pond.getBoundingClientRect();
    var pctX = (e.clientX - rect.left) / rect.width * 100;
    var pctY = (e.clientY - rect.top) / rect.height * 100;
    if (!pointInEllipse(pctX, pctY)) return;

    createRipple(e.clientX, e.clientY);
    var n = randInt(3, 5);
    for (var b = 0; b < n; b++) createBubble(e.clientX, e.clientY, b);
  });

  /* ====== 波纹 ====== */
  function createRipple(cx, cy) {
    var r = pond.getBoundingClientRect();
    var el = document.createElement('div');
    el.className = 'ripple';
    var img = document.createElement('img');
    img.src = 'images/ripple.png'; img.alt = '';
    el.appendChild(img);
    el.style.left = (cx - r.left) + 'px';
    el.style.top  = (cy - r.top) + 'px';
    pond.appendChild(el);
    el.addEventListener('animationend', function() { el.remove(); });
  }

  /* ====== 像素泡泡（bubble.png） ====== */
  function createBubble(cx, cy, idx) {
    var r = pond.getBoundingClientRect();
    var s = randInt(10, 20);
    var el = document.createElement('div');
    el.className = 'bubble';
    el.style.left = (cx - r.left + rand(-18, 18)) + 'px';
    el.style.top  = (cy - r.top + rand(-8, 8)) + 'px';
    el.style.animationDelay = (idx * 0.12) + 's';
    var img = document.createElement('img');
    img.src = 'images/bubble.png'; img.alt = '';
    img.style.width = s + 'px'; img.style.height = s + 'px';
    img.draggable = false;
    el.appendChild(img);
    pond.appendChild(el);
    el.addEventListener('animationend', function() { el.remove(); });
  }

})();
