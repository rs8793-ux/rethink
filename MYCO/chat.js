(function () {
  'use strict';

  const FADE_MS = 20000;
  const REPLY_PAUSE_MS = 900;
  const HARDCODED_REPLY = "yes. i'm here.";
  const FLOAT_SPEED_PX_PER_SEC = 18;
  const STACK_GAP = 28;
  const MAX_VISIBLE_PER_SIDE = 3;

  const input = document.getElementById('transmit');
  const forest = window.MYCO.forest;

  const messages = [];
  let lastTime = 0;

  function addSegment(text, side) {
    messages.push({
      text,
      side,
      startTime: Date.now(),
      replyScheduled: false
    });
  }

  function updateProgress(now) {
    for (const seg of messages) {
      if (seg.side === 'left' && !seg.replyScheduled) {
        const age = now - seg.startTime;
        if (age > REPLY_PAUSE_MS) {
          seg.replyScheduled = true;
          setTimeout(() => addSegment(HARDCODED_REPLY, 'right'), 0);
        }
      }
    }
  }

  function pruneFaded(now) {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (now - messages[i].startTime >= FADE_MS) messages.splice(i, 1);
    }
  }

  function drawMessages(now) {
    pruneFaded(now);
    const ctx = forest.getCtx();
    const leftCap = forest.getLeftCapCenter();
    const rightCap = forest.getRightCapCenter();

    ctx.font = 'italic 13px Georgia';
    ctx.fillStyle = '#F2EDE4';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const sides = [
      { side: 'left', cap: leftCap },
      { side: 'right', cap: rightCap }
    ];

    for (const { side, cap } of sides) {
      const sideMessages = messages
        .filter(m => m.side === side)
        .sort((a, b) => a.startTime - b.startTime)
        .slice(-MAX_VISIBLE_PER_SIDE);

      sideMessages.forEach((seg, i) => {
        const age = now - seg.startTime;
        const opacity = Math.max(0, 1 - age / FADE_MS);
        if (opacity <= 0) return;

        const stackIndex = sideMessages.length - 1 - i;
        const floatOffset = (FLOAT_SPEED_PX_PER_SEC * age) / 1000;
        const y = cap.y - (stackIndex * STACK_GAP + floatOffset);

        ctx.globalAlpha = opacity;
        ctx.fillText(seg.text, cap.x, y);
      });
    }

    ctx.globalAlpha = 1;
  }

  function tick() {
    const now = Date.now();
    lastTime = now;

    const hasMessages = messages.some(m => (now - m.startTime) < FADE_MS);
    if (hasMessages) {
      updateProgress(now);
      forest.redraw();
      drawMessages(now);
    }

    requestAnimationFrame(tick);
  }

  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    addSegment(text, 'left');
    e.preventDefault();
  });

  requestAnimationFrame(tick);
})();
