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
  var catchCounter = document.getElementById('catchCounter');
  var pondNotify   = document.getElementById('pondNotify');
  var thinkOpen = false;
  var catchCount = 0;

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
      ellB = 36;
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
    fish.style.setProperty('--fish-dir', d);
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
  var activeFishDrag = null;
  var fishDragThreshold = 8;

  // 初始化朝向
  fishes.forEach(function (fish) {
    var dir = Math.random() > 0.5 ? 1 : -1;
    fish.style.setProperty('--fish-dir', dir);
    fish.style.transform = 'scaleX(' + dir + ')';
    fish.dataset.dir = String(dir);
  });

  function clearFishFastState(fish) {
    fish.classList.remove('fast');
    if (fish._fastTimer) {
      clearTimeout(fish._fastTimer);
      fish._fastTimer = null;
    }
  }

  function cancelFishHiding(fish) {
    if (fish._hideTimer) {
      clearTimeout(fish._hideTimer);
      fish._hideTimer = null;
    }
    fish._hiding = false;
    fish._hideGrass = null;
    fish.classList.remove('hiding');
  }

  function getFishSizePct(fish) {
    var pondRect = pond.getBoundingClientRect();
    var fishRect = fish.getBoundingClientRect();
    return {
      w: fishRect.width / pondRect.width * 100,
      h: fishRect.height / pondRect.height * 100
    };
  }

  function fitFishInsideWater(x, y, w, h) {
    var pos = clampFishPos(x, y, w, h);
    var attempts = [0.08, 0.16, 0.24, 0.32, 0.44, 0.56, 0.68, 0.8, 1];
    var i;

    if (insideEllipse(pos.x, pos.y, w, h)) return pos;

    for (i = 0; i < attempts.length; i++) {
      var candidate = clampFishPos(
        pos.x + (50 - pos.x) * attempts[i],
        pos.y + (50 - pos.y) * attempts[i],
        w,
        h
      );
      if (insideEllipse(candidate.x, candidate.y, w, h)) return candidate;
    }

    return clampFishPos(50 - w / 2, 50 - h / 2, w, h);
  }

  function getFishCenterClientPos(fish) {
    var rect = fish.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
  }

  function spawnFishSplash(fish) {
    var center = getFishCenterClientPos(fish);
    createRipple(center.x + rand(-5, 5), center.y + rand(2, 8));
    createBubble(center.x + rand(-8, 8), center.y + rand(-2, 8), 0);
    createBubble(center.x + rand(-8, 8), center.y + rand(-2, 8), 1);
  }

  function stopFishSplash(fish) {
    if (fish._splashTimer) {
      clearInterval(fish._splashTimer);
      fish._splashTimer = null;
    }
  }

  function startFishSplash(fish) {
    stopFishSplash(fish);
    fish._splashTimer = setInterval(function () {
      if (!fish._grabbed) {
        stopFishSplash(fish);
        return;
      }
      spawnFishSplash(fish);
    }, 220);
  }

  function dragFishToPointer(fish, clientX, clientY) {
    var pondRect = pond.getBoundingClientRect();
    var size = getFishSizePct(fish);
    var targetX = (clientX - pondRect.left) / pondRect.width * 100 - size.w / 2;
    var targetY = (clientY - pondRect.top) / pondRect.height * 100 - size.h / 2;
    var nextPos = fitFishInsideWater(targetX, targetY, size.w, size.h);
    var curX = parseFloat(fish.style.left) || nextPos.x;

    setFishDir(fish, curX, nextPos.x);
    fish.style.left = nextPos.x + '%';
    fish.style.top = nextPos.y + '%';
  }

  function triggerFishEscape(fish) {
    if (fish._grabbed) return;

    cancelFishHiding(fish);
    clearFishFastState(fish);
    fish.classList.remove('emerging');

    var fishW = 7;
    var fishH = 4.2;
    var curDir = parseInt(fish.dataset.dir, 10);
    var curX = parseFloat(fish.style.left);
    var curY = parseFloat(fish.style.top);
    var edgeProbe = clampFishPos(curX + curDir * 8, curY, fishW, fishH);
    if (!insideEllipse(edgeProbe.x, edgeProbe.y, fishW, fishH)) {
      curDir = -curDir;
    }
    var clickTarget = resolveFishTarget(fish, curX, curY, curDir * rand(15, 30), rand(-8, 8));

    if (clickTarget.x === curX && clickTarget.y === curY) {
      clickTarget = resolveFishTarget(
        fish,
        curX,
        curY,
        (50 - curX) * 0.9,
        (50 - curY) * 0.45
      );
    }

    if (clickTarget.x === curX && clickTarget.y === curY) {
      clickTarget = fitFishInsideWater(curX - curDir * 12, curY + rand(-4, 4), fishW, fishH);
    }

    moveFishTo(fish, curX, clickTarget, 1600);
  }

  function beginFishDrag(clientX, clientY) {
    if (!activeFishDrag || activeFishDrag.dragging) return;

    var fish = activeFishDrag.fish;
    cancelFishHiding(fish);
    clearFishFastState(fish);
    fish.classList.remove('emerging');
    fish._grabbed = true;
    fish.classList.add('grabbed');
    activeFishDrag.dragging = true;

    dragFishToPointer(fish, clientX, clientY);
    spawnFishSplash(fish);
    startFishSplash(fish);
  }

  function releaseFishDrag(pointerId) {
    if (!activeFishDrag) return;
    if (pointerId !== undefined && activeFishDrag.pointerId !== pointerId) return;

    var drag = activeFishDrag;
    var fish = drag.fish;
    activeFishDrag = null;

    if (drag.dragging) {
      fish._grabbed = false;
      fish.classList.remove('grabbed');
      fish._suppressClickUntil = Date.now() + 260;
      stopFishSplash(fish);
      spawnFishSplash(fish);
    }

    if (fish.releasePointerCapture) {
      try { fish.releasePointerCapture(pointerId); } catch (err) {}
    }

    return drag;
  }

  // 鱼点击逃跑，拖动则抓取
  fishes.forEach(function (fish) {
    fish.addEventListener('pointerdown', function (e) {
      if (fish.classList.contains('hiding')) return;

      e.preventDefault();
      e.stopPropagation();

      activeFishDrag = {
        fish: fish,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        dragging: false
      };

      if (fish.setPointerCapture) {
        try { fish.setPointerCapture(e.pointerId); } catch (err) {}
      }
    });
  });

  // 鱼巡游定时器 — 每3秒移动一次
  function moveFish() {
    fishes.forEach(function (fish) {
      if (fish.classList.contains('fast')) return;
      if (fish._hiding) return;
      if (fish._grabbed) return;
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
    if (fish._hiding || fish.classList.contains('fast') || fish._grabbed) return;
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
    fish._hideTimer = setTimeout(function () {
      if (!fish._hiding) return;
      fish.classList.add('hiding');
      fish._hideTimer = null;
    }, 3000);
  }

  function emergeFromGrass(fish) {
    if (!fish._hiding) return;
    if (fish._hideTimer) {
      clearTimeout(fish._hideTimer);
      fish._hideTimer = null;
    }
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

  // 随机计时：每8-15秒随机一条鱼躲水草（保证至少4条可见鱼在游动）
  function scheduleHide() {
    setTimeout(function () {
      var free = fishes.filter(function (f) { return !f._hiding && !f.classList.contains('fast') && !f._grabbed; });
      if (free.length > 4 && grasses.length > 0) {
        hideInGrass(free[randInt(0, free.length - 1)]);
      }
      scheduleHide();
    }, rand(8000, 15000));
  }
  scheduleHide();

  document.addEventListener('pointermove', function (e) {
    if (!activeFishDrag || activeFishDrag.pointerId !== e.pointerId) return;

    if (!activeFishDrag.dragging) {
      var deltaX = e.clientX - activeFishDrag.startX;
      var deltaY = e.clientY - activeFishDrag.startY;
      if (Math.sqrt(deltaX * deltaX + deltaY * deltaY) < fishDragThreshold) return;
      beginFishDrag(e.clientX, e.clientY);
    }

    e.preventDefault();
    dragFishToPointer(activeFishDrag.fish, e.clientX, e.clientY);
  });

  document.addEventListener('pointerup', function (e) {
    var drag = releaseFishDrag(e.pointerId);
    if (!drag) return;
    if (!drag.dragging) {
      triggerFishEscape(drag.fish);
    }
  });

  document.addEventListener('pointercancel', function (e) {
    releaseFishDrag(e.pointerId);
  });

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

  // 花朵点击摇晃（紫花7连击特殊处理）
  var purpleFlowerEl = document.getElementById('flowerPurple');
  var purpleClickCount = 0;
  var purpleClickTimer = null;

  addShakeInteraction('.el-flower:not(#flowerPurple)');

  purpleFlowerEl.addEventListener('click', function (e) {
    e.stopPropagation();
    purpleFlowerEl.classList.remove('shake'); void purpleFlowerEl.offsetWidth; purpleFlowerEl.classList.add('shake');
    purpleFlowerEl.addEventListener('animationend', function h() {
      purpleFlowerEl.classList.remove('shake'); purpleFlowerEl.removeEventListener('animationend', h);
    });
    purpleClickCount++;
    if (purpleClickTimer) clearTimeout(purpleClickTimer);
    purpleClickTimer = setTimeout(function () { purpleClickCount = 0; }, 3000);
    if (purpleClickCount >= 7) {
      purpleClickCount = 0;
      showNotifyThenGo('🌸 哇，你发现了紫花的秘密通道！', 'https://lijiangyu010.github.io/goldfish/');
    }
  });

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
          catchCount = Math.min(catchCount + 1, 99);
          catchCounter.textContent = catchCount < 10 ? '0' + catchCount : String(catchCount);
          catchCounter.classList.remove('pop'); void catchCounter.offsetWidth; catchCounter.classList.add('pop');
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
    { icon: '🐇', href: 'https://www.66rpg.com/game/uncheck/1686870', notify: '🐇 去看看小兔子的冒险吧！' },
    { icon: '🌳', href: '#', notify: '🌳 通往森林的路……'   },
    { icon: '🐸', href: '#', notify: '🐸 蛙蛙想说点什么…'   },
    { icon: '🌸', href: '#', notify: '🌸 花开的地方有秘密~'  },
    { icon: '⭐', href: '#', notify: '⭐ 去追星星吧！'       },
    { icon: '🍄', href: '#', notify: '🍄 蘑菇森林在等你~'   }
  ];
  var thinkIdx = 0;
  var thinkItemsEl = document.getElementById('thinkItems');
  var thinkLinkPrev = document.getElementById('thinkLinkPrev');
  var thinkLinkCurrent = document.getElementById('thinkLinkCurrent');
  var thinkLinkNext = document.getElementById('thinkLinkNext');
  var thinkIconPrev = document.getElementById('thinkIconPrev');
  var thinkIconCurrent = document.getElementById('thinkIconCurrent');
  var thinkIconNext = document.getElementById('thinkIconNext');
  var arrowLeft   = document.getElementById('arrowLeft');
  var arrowRight  = document.getElementById('arrowRight');
  var thinkSwitching = false;

  function normalizeIdeaIndex(i) {
    var len = thinkIdeas.length;
    return ((i % len) + len) % len;
  }

  function renderThinkItems() {
    if (!thinkIdeas.length) return;
    var prevIdx = normalizeIdeaIndex(thinkIdx - 1);
    var currIdx = normalizeIdeaIndex(thinkIdx);
    var nextIdx = normalizeIdeaIndex(thinkIdx + 1);

    thinkIconPrev.textContent = thinkIdeas[prevIdx].icon;
    thinkLinkPrev.href = thinkIdeas[prevIdx].href;

    thinkIconCurrent.textContent = thinkIdeas[currIdx].icon;
    thinkLinkCurrent.href = thinkIdeas[currIdx].href;

    thinkIconNext.textContent = thinkIdeas[nextIdx].icon;
    thinkLinkNext.href = thinkIdeas[nextIdx].href;
  }

  function switchIdea(step) {
    if (thinkSwitching || !thinkIdeas.length) return false;
    thinkSwitching = true;

    thinkItemsEl.classList.remove('switching-prev');
    thinkItemsEl.classList.remove('switching-next');
    void thinkItemsEl.offsetWidth;
    thinkItemsEl.classList.add(step < 0 ? 'switching-prev' : 'switching-next');

    setTimeout(function () {
      thinkIdx = normalizeIdeaIndex(thinkIdx + step);
      renderThinkItems();
    }, 120);

    setTimeout(function () {
      thinkItemsEl.classList.remove('switching-prev');
      thinkItemsEl.classList.remove('switching-next');
      thinkSwitching = false;
    }, 260);

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
    switchIdea(-1);
  });

  arrowRight.addEventListener('click', function (e) {
    e.stopPropagation();
    arrowFeedback(arrowRight);
    switchIdea(1);
  });

  thinkLinkPrev.addEventListener('click', function (e) {
    e.preventDefault();
    e.stopPropagation();
    switchIdea(-1);
  });

  thinkLinkNext.addEventListener('click', function (e) {
    e.preventDefault();
    e.stopPropagation();
    switchIdea(1);
  });

  thinkLinkCurrent.addEventListener('click', function (e) {
    e.stopPropagation();
    e.preventDefault();
    var idea = thinkIdeas[normalizeIdeaIndex(thinkIdx)];
    if (idea.href === '#') return;
    showNotifyThenGo(idea.notify, idea.href);
  });

  renderThinkItems();

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
        e.target.closest('.el') ||
        e.target.closest('.counter-wrap')) return;

    // 只在椭圆水面区域内产生波纹和泡泡
    var rect = pond.getBoundingClientRect();
    var pctX = (e.clientX - rect.left) / rect.width * 100;
    var pctY = (e.clientY - rect.top) / rect.height * 100;
    if (!pointInEllipse(pctX, pctY)) return;

    createRipple(e.clientX, e.clientY);
    var n = randInt(3, 5);
    for (var b = 0; b < n; b++) createBubble(e.clientX, e.clientY, b);

    // 25% 概率刷新一只新鱼
    if (Math.random() < 0.25) {
      spawnNewFish(pctX, pctY);
    }
  });

  /* ====== 波纹 ====== */
  function createRipple(cx, cy) {
    var r = pond.getBoundingClientRect();
    var el = document.createElement('div');
    el.className = 'ripple';
    var img = document.createElement('img');
    img.src = 'images/ripple.webp';
    img.alt = '';
    el.appendChild(img);
    el.style.left = (cx - r.left) + 'px';
    el.style.top = (cy - r.top) + 'px';
    pond.appendChild(el);
    el.addEventListener('animationend', function () { el.remove(); });
  }

  /* ====== 气泡（bubble.webp） ====== */
  function createBubble(cx, cy, idx) {
    var r = pond.getBoundingClientRect();
    var s = randInt(10, 20);
    var el = document.createElement('div');
    el.className = 'bubble';
    el.style.left = (cx - r.left + rand(-18, 18)) + 'px';
    el.style.top = (cy - r.top + rand(-8, 8)) + 'px';
    el.style.animationDelay = (idx * 0.12) + 's';
    var img = document.createElement('img');
    img.src = 'images/bubble.webp';
    img.alt = '';
    img.style.width = s + 'px';
    img.style.height = s + 'px';
    img.draggable = false;
    el.appendChild(img);
    pond.appendChild(el);
    el.addEventListener('animationend', function () { el.remove(); });
  }

  /* ====== 通知后跳转 ====== */
  function showNotifyThenGo(msg, url) {
    pondNotify.textContent = msg;
    pondNotify.classList.add('show');
    setTimeout(function () {
      pondNotify.classList.remove('show');
      if (url && url !== '#') {
        window.location.href = url;
      }
    }, 1800);
  }

  /* ====== 动态生鱼 ====== */
  var fishImages = [
    'images/fish_light_blue.webp',
    'images/fish_blue_red.webp',
    'images/fish_brown.webp',
    'images/fish_orange.webp'
  ];
  var fishNames = ['浅蓝鱼', '蓝红鱼', '棕鱼', '橙鱼'];
  var spawnId = 100;

  function initFishInteraction(fish) {
    fish.addEventListener('pointerdown', function (e) {
      if (fish.classList.contains('hiding')) return;
      e.preventDefault();
      e.stopPropagation();
      activeFishDrag = {
        fish: fish,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        dragging: false
      };
      if (fish.setPointerCapture) {
        try { fish.setPointerCapture(e.pointerId); } catch (err) {}
      }
    });
  }

  function spawnNewFish(pctX, pctY) {
    var idx = randInt(0, fishImages.length - 1);
    var fish = document.createElement('img');
    fish.src = fishImages[idx];
    fish.alt = fishNames[idx];
    fish.className = 'el el-fish';
    fish.id = 'fish' + (++spawnId);
    fish.draggable = false;

    // 放置在点击位置附近
    var size = { w: 7, h: 4.2 };
    var pos = fitFishInsideWater(pctX - size.w / 2, pctY - size.h / 2, size.w, size.h);
    fish.style.left = pos.x + '%';
    fish.style.top = pos.y + '%';

    var dir = Math.random() > 0.5 ? 1 : -1;
    fish.style.setProperty('--fish-dir', dir);
    fish.style.transform = 'scaleX(' + dir + ')';
    fish.dataset.dir = String(dir);

    pond.appendChild(fish);
    fishes.push(fish);
    initFishInteraction(fish);

    // 超过 30 条非躲藏鱼 → 提示跳转
    var visibleCount = fishes.filter(function (f) { return !f._hiding; }).length;
    if (visibleCount > 30) {
      showNotifyThenGo('🐸 池塘里的鱼太多啦！快去看看~', '#');
    }
  }

})();
