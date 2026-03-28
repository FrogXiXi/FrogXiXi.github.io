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

  /* ====== 碰撞检测 ====== */
  // placed: [{x,y,w,h}, ...]  全部用百分比
  var placed = [];
  // 中央青蛙保留区
  placed.push({ x: 38, y: 35, w: 24, h: 30 });

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
    for (var t = 0; t < 80; t++) {
      var x = rand(4, 94 - w);
      var y = rand(6, 90 - h);
      var r = { x: x - margin, y: y - margin, w: w + margin * 2, h: h + margin * 2 };
      if (!overlaps(r)) {
        placed.push(r);
        return { x: x, y: y };
      }
    }
    // 失败则放在随机位置
    return { x: rand(4, 90 - w), y: rand(6, 86 - h) };
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

  /* ==========================================
     荷叶 ×5
     ========================================== */
  for (var li = 0; li < 5; li++) {
    var lw = rand(10, 15);
    var lh = lw * 0.6;  // 近似高宽比
    var lpos = findPos(lw, lh);
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
  for (var gi = 0; gi < 6; gi++) {
    var gw = rand(5, 9);
    var gh = gw * 1.8;
    var gpos = findPos(gw, gh);
    var gr = makeEl('img', 'el-grass', 'images/grass.png', gw);
    gr.style.left = gpos.x + '%';
    gr.style.top  = gpos.y + '%';
    gr.style.setProperty('--sx', Math.random() > 0.5 ? '-1' : '1');
    gr.style.animationDelay = rand(0, 4).toFixed(1) + 's';
    elBox.appendChild(gr);

    (function(el) {
      el.addEventListener('click', function(e) {
        e.stopPropagation();
        el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
        el.addEventListener('animationend', function h() {
          el.classList.remove('shake'); el.removeEventListener('animationend', h);
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
     小鱼 ×4 — 平滑游动 + 正确朝向 + 点击加速
     ========================================== */
  var fishes = [];

  for (var fii = 0; fii < 4; fii++) {
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
    fish.dataset.baseX = fishPos.x;
    fish.dataset.baseY = fishPos.y;

    elBox.appendChild(fish);
    fishes.push(fish);

    // 点击加速逃跑
    (function(el) {
      el.addEventListener('click', function(e) {
        e.stopPropagation();
        var curDir = parseInt(el.dataset.dir);
        var curX = parseFloat(el.style.left);
        // 如果鱼在池塘边缘附近，先回头
        if ((curX <= 8 && curDir === -1) || (curX >= 85 && curDir === 1)) {
          curDir = -curDir;
          el.style.transform = 'scaleX(' + curDir + ')';
          el.dataset.dir = curDir;
        }
        // 加速：沿当前朝向移动
        el.classList.add('fast');
        var curY = parseFloat(el.style.top);
        var newX = curX + curDir * rand(15, 30);
        var newY = curY + rand(-8, 8);
        // 边界限制
        newX = Math.max(3, Math.min(90, newX));
        newY = Math.max(5, Math.min(85, newY));
        el.style.left = newX + '%';
        el.style.top  = newY + '%';
        // 1.5s 后恢复正常速度
        setTimeout(function() {
          el.classList.remove('fast');
        }, 1600);
      });
    })(fish);
  }

  // 鱼巡游定时器：每隔一段时间给鱼设新目标
  function moveFish() {
    fishes.forEach(function(fish) {
      if (fish.classList.contains('fast')) return; // 逃跑中不干扰

      var curX = parseFloat(fish.style.left);
      var curY = parseFloat(fish.style.top);
      var curDir = parseInt(fish.dataset.dir);

      // 如果在边缘附近，强制转向
      if (curX <= 8) curDir = 1;
      else if (curX >= 85) curDir = -1;

      // 新目标
      var dx = rand(8, 22) * (Math.random() > 0.3 ? curDir : -curDir);
      var dy = rand(-6, 6);
      var nx = curX + dx;
      var ny = curY + dy;
      nx = Math.max(3, Math.min(90, nx));
      ny = Math.max(5, Math.min(85, ny));

      // 判断新朝向
      var newDir = (nx - curX) > 0 ? 1 : -1;
      if (newDir !== curDir) {
        // 先转身
        fish.style.transform = 'scaleX(' + newDir + ')';
        fish.dataset.dir = newDir;
      }

      fish.style.left = nx + '%';
      fish.style.top  = ny + '%';
    });
  }
  // 每 5-8 秒移动一次
  setInterval(moveFish, 6000);
  setTimeout(moveFish, 2000); // 初始延迟后开始

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
