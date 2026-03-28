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
      ellA = 32; // 竖版横向更窄
      ellB = 36; // 竖版纵向更高
    } else {
      ellA = 36; // 横版横向更宽
      ellB = 34;
    }
  }
  updateEllipse();

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

  /* ====== 碰撞检测 ====== */
  // placed: [{x,y,w,h}, ...]  全部用百分比
  var placed = [];
  // 中央青蛙 + 荷叶座位保留区（荷叶比青蛙大150%）
  placed.push({ x: 32, y: 30, w: 36, h: 40 });

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
    for (var t = 0; t < 120; t++) {
      var x = rand(10, 88 - w);
      var y = rand(10, 86 - h);
      var r = { x: x - margin, y: y - margin, w: w + margin * 2, h: h + margin * 2 };
      if (!overlaps(r) && insideEllipse(x, y, w, h)) {
        placed.push(r);
        return { x: x, y: y };
      }
    }
    // 失败则找一个椭圆内的位置
    for (var f = 0; f < 50; f++) {
      var fx = rand(18, 78 - w);
      var fy = rand(18, 78 - h);
      if (insideEllipse(fx, fy, w, h)) return { x: fx, y: fy };
    }
    return { x: 30, y: 40 };
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
     水草 PNG ×6
     ========================================== */
  for (var gi = 0; gi < 7; gi++) {
    var gw = rand(5, 9);
    var gh = gw * 1.8;
    var gpos = findPos(gw, gh);
    var gr = makeEl('img', 'el-grass', 'images/grass.png', gw);
    gr.style.left = gpos.x + '%';
    gr.style.top  = gpos.y + '%';
    gr.style.setProperty('--sx', Math.random() > 0.5 ? '-1' : '1');
    gr.style.animationDelay = rand(0, 4).toFixed(1) + 's';
    elBox.appendChild(gr);

    (function(el, grassIdx) {
      el.addEventListener('click', function(e) {
        e.stopPropagation();
        el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
        el.addEventListener('animationend', function h() {
          el.classList.remove('shake'); el.removeEventListener('animationend', h);
        });
        // 释放躲在这棵水草下的鱼
        fishes.forEach(function(fish) {
          if (fish.dataset.hiding === '1' && parseInt(fish.dataset.hideGrass) === grassIdx) {
            fish.dataset.hiding = '0';
            fish.classList.remove('hiding');
            fish.classList.add('fast');
            var cx = parseFloat(fish.style.left);
            var cy = parseFloat(fish.style.top);
            var escDir = Math.random() > 0.5 ? 1 : -1;
            var nx = cx + escDir * rand(15, 25);
            var ny = cy + rand(-6, 6);
            nx = Math.max(14, Math.min(80, nx));
            ny = Math.max(16, Math.min(80, ny));
            if (!pointInEllipse(nx, ny)) { nx = 50 + (nx > 50 ? -10 : 10); ny = 50; }
            setFishDir(fish, cx, nx);
            fish.style.left = nx + '%';
            fish.style.top  = ny + '%';
            setTimeout(function() { fish.classList.remove('fast'); }, 1600);
          }
        });
      });
    })(gr, gi);
  }

  /* ==========================================
     小花 ×3
     ========================================== */
  for (var fi = 0; fi < 3; fi++) {
    var fw = rand(3.5, 6);
    var fh = fw * 1.2;
    var fpos = findPos(fw, fh);
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
     小鱼 ×4 — 平滑游动 + 椭圆内 + 躲水草
     ========================================== */
  var fishes = [];
  var grassEls = document.querySelectorAll('.el-grass');

  for (var fii = 0; fii < 5; fii++) {
    var fishW = rand(5, 7.5);
    var fishH = fishW * 0.6;
    var fishPos = findPos(fishW, fishH);

    var fish = makeEl('img', 'el-fish', 'images/fish.png', fishW);
    fish.style.left = fishPos.x + '%';
    fish.style.top  = fishPos.y + '%';

    // 初始朝向（1=右，-1=左）
    var dir = Math.random() > 0.5 ? 1 : -1;
    fish.style.transform = 'scaleX(' + dir + ')';
    fish.dataset.dir = dir;
    fish.dataset.hiding = '0';

    elBox.appendChild(fish);
    fishes.push(fish);

    // 点击：如果躲着就出来，否则加速逃跑
    (function(el) {
      el.addEventListener('click', function(e) {
        e.stopPropagation();
        // 如果在躲藏中或正在游向水草，点击出来
        if (el.dataset.hiding === '1' || el.dataset.hiding === 'swimming') {
          el.dataset.hiding = '0';
          el.classList.remove('hiding');
          el.classList.add('fast');
          var cx = parseFloat(el.style.left);
          var cy = parseFloat(el.style.top);
          var curDir = parseInt(el.dataset.dir);
          var nx = cx + (-curDir) * rand(15, 25);
          var ny = cy + rand(-6, 6);
          nx = Math.max(14, Math.min(80, nx));
          ny = Math.max(16, Math.min(80, ny));
          if (!pointInEllipse(nx, ny)) { nx = 50 + (nx > 50 ? -10 : 10); ny = 50; }
          setFishDir(el, cx, nx);
          el.style.left = nx + '%';
          el.style.top  = ny + '%';
          setTimeout(function() { el.classList.remove('fast'); }, 1600);
          return;
        }

        var curDir = parseInt(el.dataset.dir);
        var curX = parseFloat(el.style.left);
        // 如果鱼在池塘边缘附近，先回头
        if (!pointInEllipse(curX + curDir * 5, parseFloat(el.style.top))) {
          curDir = -curDir;
        }
        // 加速：沿当前朝向移动
        el.classList.add('fast');
        var curY = parseFloat(el.style.top);
        var newX = curX + curDir * rand(15, 30);
        var newY = curY + rand(-8, 8);
        newX = Math.max(14, Math.min(80, newX));
        newY = Math.max(16, Math.min(80, newY));
        if (!pointInEllipse(newX, newY)) { newX = 50; newY = 50; }
        setFishDir(el, curX, newX);
        el.style.left = newX + '%';
        el.style.top  = newY + '%';
        setTimeout(function() { el.classList.remove('fast'); }, 1600);
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

    // 记录目标水草引用
    fish.dataset.hideGrass = Array.prototype.indexOf.call(
      elBox.querySelectorAll('.el-grass'), g
    );

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
      if (Math.random() < 0.1) return;

      // 很小概率躲到水草下
      if (Math.random() < 0.05) {
        hideUnderGrass(fish);
        return;
      }

      var curX = parseFloat(fish.style.left);
      var curY = parseFloat(fish.style.top);
      var curDir = parseInt(fish.dataset.dir);

      // 如果当前位置不在椭圆内，游回中心方向
      if (!pointInEllipse(curX, curY)) {
        var nx2 = curX + (50 - curX) * 0.5;
        var ny2 = curY + (50 - curY) * 0.5;
        setFishDir(fish, curX, nx2);
        fish.style.left = nx2 + '%';
        fish.style.top  = ny2 + '%';
        return;
      }

      // 如果在边缘附近，强制转向
      if (!pointInEllipse(curX + curDir * 10, curY)) curDir = -curDir;

      var dx = rand(8, 22) * (Math.random() > 0.3 ? curDir : -curDir);
      var dy = rand(-6, 6);
      var nx = curX + dx;
      var ny = curY + dy;
      nx = Math.max(14, Math.min(80, nx));
      ny = Math.max(16, Math.min(80, ny));

      // 确保新位置在椭圆内
      if (!pointInEllipse(nx, ny)) {
        nx = curX + dx * 0.3;
        ny = curY + dy * 0.3;
        if (!pointInEllipse(nx, ny)) { nx = curX; ny = curY; }
      }

      setFishDir(fish, curX, nx);
      fish.style.left = nx + '%';
      fish.style.top  = ny + '%';
    });
  }
  // 每 3 秒移动一次
  setInterval(moveFish, 3000);
  setTimeout(moveFish, 1500); // 初始延迟后开始

  /* ==========================================
     思考气泡 — 箭头切换想法
     ========================================== */
  var thinkIdeas = [
    { icon: '♥', href: 'https://www.bilibili.com' },
    { icon: '🐇', href: '#' },
    { icon: '🌳', href: '#' },
    { icon: '🌸', href: '#' },
    { icon: '⭐', href: '#' },
    { icon: '🍄', href: '#' }
  ];
  var thinkIdx = 0;
  var thinkIconEl = document.getElementById('thinkIcon');
  var thinkLink  = document.getElementById('thinkLink');
  var arrowLeft  = document.getElementById('arrowLeft');
  var arrowRight = document.getElementById('arrowRight');

  function updateArrows() {
    arrowLeft.classList.toggle('disabled', thinkIdx <= 0);
    arrowRight.classList.toggle('disabled', thinkIdx >= thinkIdeas.length - 1);
    thinkLink.href = thinkIdeas[thinkIdx].href;
  }

  function switchIdea(newIdx) {
    if (newIdx < 0 || newIdx >= thinkIdeas.length) return false;
    thinkIdx = newIdx;
    thinkIconEl.classList.remove('switching');
    void thinkIconEl.offsetWidth;
    thinkIconEl.classList.add('switching');
    setTimeout(function() {
      thinkIconEl.textContent = thinkIdeas[thinkIdx].icon;
      thinkLink.href = thinkIdeas[thinkIdx].href;
    }, 120);
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
