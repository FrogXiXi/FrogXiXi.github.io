/**
 * 蛙蛙池塘 — 交互逻辑（固定布局版）
 *
 * 所有装饰元素位置固定在 HTML 中，不做随机分布
 * 保留：小鱼游动、气泡上浮、波纹扩散、青蛙交互、光标切换
 */
(function () {
  'use strict';

  /* ====== DOM 引用 ====== */
  var pond     = document.getElementById('pond');
  var frogWrap = document.getElementById('frogWrap');
  var thinkBub = document.getElementById('thinkBubble');
  var thinkOpen = false;

  /* ====== 工具函数 ====== */
  function rand(a, b) { return a + Math.random() * (b - a); }
  function randInt(a, b) { return Math.floor(rand(a, b + 1)); }

  /* ====== 椭圆边界检测（池塘水面区域） ====== */
  var ellCx = 50, ellCy = 50, ellA, ellB;

  function updateEllipse() {
    var isPortrait = window.innerHeight > window.innerWidth;
    if (isPortrait) {
      ellA = 41;
      ellB = 46;
    } else {
      ellA = 45;
      ellB = 38;
    }
  }
  updateEllipse();
  window.addEventListener('resize', updateEllipse);

  function pointInEllipse(x, y) {
    var dx = (x - ellCx) / ellA;
    var dy = (y - ellCy) / ellB;
    return dx * dx + dy * dy <= 1;
  }

  function insideEllipse(x, y, w, h) {
    var pts = [
      [x, y], [x + w, y], [x, y + h], [x + w, y + h],
      [x + w / 2, y + h / 2]
    ];
    for (var i = 0; i < pts.length; i++) {
      var ddx = (pts[i][0] - ellCx) / ellA;
      var ddy = (pts[i][1] - ellCy) / ellB;
      if (ddx * ddx + ddy * ddy > 1) return false;
    }
    return true;
  }

  /* ====== 鱼朝向辅助 ====== */
  function setFishDir(fish, fromX, toX) {
    if (toX === fromX) return;
    var d = toX > fromX ? 1 : -1;
    fish.style.transform = 'scaleX(' + d + ')';
    fish.dataset.dir = String(d);
  }

  function clampFishPos(x, y, w, h) {
    return {
      x: Math.max(10, Math.min(88 - w, x)),
      y: Math.max(10, Math.min(86 - h, y))
    };
  }

  function resolveFishTarget(fish, fromX, fromY, deltaX, deltaY) {
    var w = 7, h = 4.2;
    var attempts = [1, 0.8, 0.6, 0.45, 0.3, 0.18];
    var i, forward, backward;

    for (i = 0; i < attempts.length; i++) {
      forward = clampFishPos(fromX + deltaX * attempts[i], fromY + deltaY * attempts[i], w, h);
      if (insideEllipse(forward.x, forward.y, w, h)) return forward;
    }
    for (i = 0; i < attempts.length; i++) {
      backward = clampFishPos(fromX - deltaX * attempts[i], fromY + deltaY * attempts[i] * 0.5, w, h);
      if (insideEllipse(backward.x, backward.y, w, h)) return backward;
    }
    var toCenter = clampFishPos(fromX + (50 - fromX) * 0.35, fromY + (50 - fromY) * 0.35, w, h);
    if (insideEllipse(toCenter.x, toCenter.y, w, h)) return toCenter;
    return { x: fromX, y: fromY };
  }

  function moveFishTo(fish, fromX, target, fastDuration) {
    if (fastDuration) {
      fish.classList.add('fast');
      if (fish._fastTimer) clearTimeout(fish._fastTimer);
      fish._fastTimer = setTimeout(function () {
        fish.classList.remove('fast');
        fish._fastTimer = null;
      }, fastDuration);
    }
    setFishDir(fish, fromX, target.x);
    fish.style.left = target.x + '%';
    fish.style.top = target.y + '%';
  }

  /* ==========================================
     小鱼 — 收集 HTML 中固定的鱼元素
     ========================================== */
  var fishes = Array.prototype.slice.call(document.querySelectorAll('.el-fish'));
  var grasses = Array.prototype.slice.call(document.querySelectorAll('.el-grass'));

  // 初始化朝向
  fishes.forEach(function (fish) {
    var dir = Math.random() > 0.5 ? 1 : -1;
    fish.style.transform = 'scaleX(' + dir + ')';
    fish.dataset.dir = String(dir);
  });

  // 鱼点击：加速逃跑
  fishes.forEach(function (fish) {
    fish.addEventListener('click', function (e) {
      e.stopPropagation();
      var curDir = parseInt(fish.dataset.dir, 10);
      var curX = parseFloat(fish.style.left);
      var curY = parseFloat(fish.style.top);
      if (!pointInEllipse(curX + curDir * 5, curY)) {
        curDir = -curDir;
      }
      var clickTarget = resolveFishTarget(fish, curX, curY, curDir * rand(15, 30), rand(-8, 8));
      moveFishTo(fish, curX, clickTarget, 1600);
    });
  });

  // 鱼巡游定时器 — 每3秒移动一次
  function moveFish() {
    fishes.forEach(function (fish) {
      if (fish.classList.contains('fast')) return;
      if (fish._hiding) return;
      if (Math.random() < 0.05) return; // 偷懒不动

      var curX = parseFloat(fish.style.left);
      var curY = parseFloat(fish.style.top);
      var curDir = parseInt(fish.dataset.dir, 10);

      // 如果当前位置不在椭圆内，游回中心
      if (!insideEllipse(curX, curY, 7, 4.2)) {
        var recoverTarget = resolveFishTarget(fish, curX, curY, 50 - curX, 50 - curY);
        moveFishTo(fish, curX, recoverTarget);
        return;
      }

      // 边缘附近强制转向
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
  setInterval(moveFish, 3000);
  setTimeout(moveFish, 1500);

  /* ==========================================
     鱼躲水草机制 — 随机躲藏，点击水草出来
     ========================================== */
  // 每条鱼有一定几率游到水草位置躲藏
  function getGrassPos(grass) {
    return {
      x: parseFloat(grass.style.left),
      y: parseFloat(grass.style.top)
    };
  }

  function hideInGrass(fish) {
    if (fish._hiding || fish.classList.contains('fast')) return;
    // 随机选一株水草
    var grass = grasses[randInt(0, grasses.length - 1)];
    var gPos = getGrassPos(grass);
    fish._hiding = true;
    fish._hideGrass = grass;
    var curX = parseFloat(fish.style.left);
    setFishDir(fish, curX, gPos.x);
    fish.style.left = gPos.x + '%';
    fish.style.top = gPos.y + '%';
    // 到达后淡出躲藏
    setTimeout(function () {
      if (!fish._hiding) return;
      fish.classList.add('hiding');
    }, 3000);
  }

  function emergeFromGrass(fish) {
    if (!fish._hiding) return;
    fish._hiding = false;
    fish._hideGrass = null;
    fish.classList.remove('hiding');
    fish.classList.add('emerging');
    // 加速游走
    var curX = parseFloat(fish.style.left);
    var curY = parseFloat(fish.style.top);
    var curDir = parseInt(fish.dataset.dir, 10) || 1;
    var target = resolveFishTarget(fish, curX, curY, curDir * rand(15, 25), rand(-8, 8));
    setFishDir(fish, curX, target.x);
    fish.style.left = target.x + '%';
    fish.style.top = target.y + '%';
    setTimeout(function () {
      fish.classList.remove('emerging');
    }, 1500);
  }

  // 随机计时：每8-15秒随机一条鱼躲水草
  function scheduleHide() {
    setTimeout(function () {
      var free = fishes.filter(function (f) { return !f._hiding && !f.classList.contains('fast'); });
      if (free.length > 0 && grasses.length > 0) {
        hideInGrass(free[randInt(0, free.length - 1)]);
      }
      scheduleHide();
    }, rand(8000, 15000));
  }
  scheduleHide();

  /* ==========================================
     花朵/水草/荷叶/芦苇/石头 — 点击交互
     ========================================== */
  // 通用摇晃交互
  function addShakeInteraction(selector) {
    document.querySelectorAll(selector).forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.stopPropagation();
        el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
        el.addEventListener('animationend', function h() {
          el.classList.remove('shake'); el.removeEventListener('animationend', h);
        });
      });
    });
  }

  // 花朵点击摇晃
  addShakeInteraction('.el-flower');

  // 水草点击摇晃 + 赶鱼出来
  document.querySelectorAll('.el-grass').forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.stopPropagation();
      el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
      el.addEventListener('animationend', function h() {
        el.classList.remove('shake'); el.removeEventListener('animationend', h);
      });
      // 赶出躲在这株水草里的鱼
      fishes.forEach(function (fish) {
        if (fish._hiding && fish._hideGrass === el) {
          emergeFromGrass(fish);
        }
      });
    });
  });

  // 芦苇点击摇晃
  document.querySelectorAll('.el-reed').forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.stopPropagation();
      el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
      el.addEventListener('animationend', function h() {
        el.classList.remove('shake'); el.removeEventListener('animationend', h);
      });
    });
  });

  // 石头点击弹跳
  document.querySelectorAll('.el-stone').forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.stopPropagation();
      el.classList.remove('bounce'); void el.offsetWidth; el.classList.add('bounce');
      createRipple(e.clientX, e.clientY);
      el.addEventListener('animationend', function h() {
        el.classList.remove('bounce'); el.removeEventListener('animationend', h);
      });
    });
  });

  // 荷叶点击晃动 + 波纹
  document.querySelectorAll('.el-lily').forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.stopPropagation();
      el.classList.remove('wobble'); void el.offsetWidth; el.classList.add('wobble');
      createRipple(e.clientX, e.clientY);
      el.addEventListener('animationend', function h() {
        el.classList.remove('wobble'); el.removeEventListener('animationend', h);
      });
    });
  });

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
  var thinkLink   = document.getElementById('thinkLink');
  var arrowLeft   = document.getElementById('arrowLeft');
  var arrowRight  = document.getElementById('arrowRight');

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

  arrowLeft.addEventListener('click', function (e) {
    e.stopPropagation();
    arrowFeedback(arrowLeft);
    switchIdea(thinkIdx - 1);
  });

  arrowRight.addEventListener('click', function (e) {
    e.stopPropagation();
    arrowFeedback(arrowRight);
    switchIdea(thinkIdx + 1);
  });

  updateArrows();

  /* ==========================================
     青蛙点击：跳跃 + 切换思考气泡
     ========================================== */
  frogWrap.addEventListener('click', function (e) {
    e.stopPropagation();
    // 跳跃动画
    frogWrap.classList.remove('jumping'); void frogWrap.offsetWidth;
    frogWrap.classList.add('jumping');
    frogWrap.addEventListener('animationend', function h() {
      frogWrap.classList.remove('jumping'); frogWrap.removeEventListener('animationend', h);
    });
    // 切换气泡
    setTimeout(function () {
      thinkOpen = !thinkOpen;
      thinkBub.classList.toggle('show', thinkOpen);
    }, 250);
  });

  /* ==========================================
     点击水面空白：波纹 + 泡泡
     ========================================== */
  pond.addEventListener('click', function (e) {
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
    img.src = 'images/ripple.png';
    img.alt = '';
    el.appendChild(img);
    el.style.left = (cx - r.left) + 'px';
    el.style.top = (cy - r.top) + 'px';
    pond.appendChild(el);
    el.addEventListener('animationend', function () { el.remove(); });
  }

  /* ====== 气泡（bubble.png） ====== */
  function createBubble(cx, cy, idx) {
    var r = pond.getBoundingClientRect();
    var s = randInt(10, 20);
    var el = document.createElement('div');
    el.className = 'bubble';
    el.style.left = (cx - r.left + rand(-18, 18)) + 'px';
    el.style.top = (cy - r.top + rand(-8, 8)) + 'px';
    el.style.animationDelay = (idx * 0.12) + 's';
    var img = document.createElement('img');
    img.src = 'images/bubble.png';
    img.alt = '';
    img.style.width = s + 'px';
    img.style.height = s + 'px';
    img.draggable = false;
    el.appendChild(img);
    pond.appendChild(el);
    el.addEventListener('animationend', function () { el.remove(); });
  }

})();
