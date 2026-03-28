/**
 * 🐸 蛙蛙池塘 — 交互逻辑
 * 纯原生 JavaScript，无框架依赖
 */
(function () {
  'use strict';

  var pond      = document.getElementById('pond');
  var frogWrap  = document.getElementById('frogWrap');
  var navBtns   = document.getElementById('navButtons');
  var lilyPads  = document.querySelectorAll('.lily-pad');
  var navVisible = false;

  /* ==========================
     1. 点击荷叶：摇晃 + 水波纹
     ========================== */
  lilyPads.forEach(function (pad) {
    pad.addEventListener('click', function (e) {
      e.stopPropagation();
      // 触发摇晃动画
      pad.classList.remove('wobble');
      void pad.offsetWidth; // 强制回流重新触发
      pad.classList.add('wobble');
      // 生成水波纹
      createRipple(e.clientX, e.clientY);
      pad.addEventListener('animationend', function h() {
        pad.classList.remove('wobble');
        pad.removeEventListener('animationend', h);
      });
    });
  });

  /* ==========================
     2. 点击水面空白：气泡 + 波纹
     ========================== */
  pond.addEventListener('click', function (e) {
    if (e.target.closest('.frog-wrap') ||
        e.target.closest('.nav-buttons') ||
        e.target.closest('.lily-pad')) return;

    createRipple(e.clientX, e.clientY);
    // 生成 3-5 个小气泡
    var n = 3 + Math.floor(Math.random() * 3);
    for (var i = 0; i < n; i++) {
      createBubble(e.clientX, e.clientY, i);
    }
  });

  /* ==========================
     3. 点击青蛙：跳跃 + 弹出按钮
     ========================== */
  frogWrap.addEventListener('click', function (e) {
    e.stopPropagation();
    // 触发跳跃动画
    frogWrap.classList.remove('jumping');
    void frogWrap.offsetWidth;
    frogWrap.classList.add('jumping');
    frogWrap.addEventListener('animationend', function h() {
      frogWrap.classList.remove('jumping');
      frogWrap.removeEventListener('animationend', h);
    });
    // 延迟后切换按钮显示
    setTimeout(function () {
      navVisible = !navVisible;
      navBtns.classList.toggle('show', navVisible);
    }, 280);
  });

  /* ==========================
     辅助：生成水波纹
     ========================== */
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
    el.addEventListener('animationend', function () { el.remove(); });
  }

  /* ==========================
     辅助：生成小气泡
     ========================== */
  function createBubble(cx, cy, idx) {
    var r = pond.getBoundingClientRect();
    var el = document.createElement('div');
    el.className = 'bubble';
    var s = 5 + Math.random() * 9;
    el.style.width  = s + 'px';
    el.style.height = s + 'px';
    el.style.left = (cx - r.left + (Math.random() - 0.5) * 36) + 'px';
    el.style.top  = (cy - r.top  + (Math.random() - 0.5) * 16) + 'px';
    el.style.animationDelay = (idx * 0.14) + 's';
    pond.appendChild(el);
    el.addEventListener('animationend', function () { el.remove(); });
  }
})();
