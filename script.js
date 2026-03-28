/**
 * 🐸 蛙蛙池塘 — 交互逻辑
 * 纯原生 JavaScript，无依赖
 */
(function () {
  'use strict';

  const pond = document.getElementById('pond');
  const frogWrap = document.getElementById('frogWrap');
  const navButtons = document.getElementById('navButtons');
  const lilyPads = document.querySelectorAll('.lily-pad');

  let navVisible = false; // 按钮是否已弹出

  /* ====================================================
     1. 点击荷叶：摇晃 + 水波纹
     ==================================================== */
  lilyPads.forEach(function (pad) {
    pad.addEventListener('click', function (e) {
      e.stopPropagation();

      // 触发摇晃动画
      pad.classList.remove('wobble');
      // 强制回流以重新触发动画
      void pad.offsetWidth;
      pad.classList.add('wobble');

      // 在点击位置生成水波纹
      createRipple(e.clientX, e.clientY);

      // 动画结束后移除类
      pad.addEventListener('animationend', function handler() {
        pad.classList.remove('wobble');
        pad.removeEventListener('animationend', handler);
      });
    });
  });

  /* ====================================================
     2. 点击水面空白处：3-5 个小气泡 + 水波纹
     ==================================================== */
  pond.addEventListener('click', function (e) {
    // 忽略点击到其他交互元素的情况
    if (
      e.target.closest('.frog-wrap') ||
      e.target.closest('.nav-buttons') ||
      e.target.closest('.lily-pad')
    ) {
      return;
    }

    // 生成水波纹
    createRipple(e.clientX, e.clientY);

    // 生成 3-5 个小气泡
    var bubbleCount = 3 + Math.floor(Math.random() * 3);
    for (var i = 0; i < bubbleCount; i++) {
      createBubble(e.clientX, e.clientY, i);
    }
  });

  /* ====================================================
     3. 点击中央青蛙：跳跃 + 弹出/收起按钮
     ==================================================== */
  frogWrap.addEventListener('click', function (e) {
    e.stopPropagation();

    // 触发跳跃动画
    frogWrap.classList.remove('jumping');
    void frogWrap.offsetWidth;
    frogWrap.classList.add('jumping');

    frogWrap.addEventListener('animationend', function handler() {
      frogWrap.classList.remove('jumping');
      frogWrap.removeEventListener('animationend', handler);
    });

    // 延迟后切换按钮显示
    setTimeout(function () {
      navVisible = !navVisible;
      if (navVisible) {
        navButtons.classList.add('show');
      } else {
        navButtons.classList.remove('show');
      }
    }, 300);
  });

  /* ====================================================
     辅助函数：生成水波纹（使用 ripple.png）
     ==================================================== */
  function createRipple(clientX, clientY) {
    var rect = pond.getBoundingClientRect();
    var x = clientX - rect.left;
    var y = clientY - rect.top;

    var ripple = document.createElement('div');
    ripple.className = 'ripple';

    var img = document.createElement('img');
    img.src = 'images/ripple.png';
    img.alt = '';
    img.draggable = false;
    ripple.appendChild(img);

    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    pond.appendChild(ripple);

    // 动画结束后自动移除
    ripple.addEventListener('animationend', function () {
      ripple.remove();
    });
  }

  /* ====================================================
     辅助函数：生成小气泡
     ==================================================== */
  function createBubble(clientX, clientY, index) {
    var rect = pond.getBoundingClientRect();
    var x = clientX - rect.left;
    var y = clientY - rect.top;

    // 稍微随机偏移位置
    var offsetX = (Math.random() - 0.5) * 40;
    var offsetY = (Math.random() - 0.5) * 20;
    var size = 6 + Math.random() * 10;

    var bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.style.left = (x + offsetX) + 'px';
    bubble.style.top = (y + offsetY) + 'px';
    bubble.style.width = size + 'px';
    bubble.style.height = size + 'px';
    // 逐个延迟，错落感
    bubble.style.animationDelay = (index * 0.15) + 's';

    pond.appendChild(bubble);

    // 动画结束后自动移除
    bubble.addEventListener('animationend', function () {
      bubble.remove();
    });
  }
})();
