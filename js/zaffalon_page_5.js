(function () {
    const sheet = document.getElementById("contact_section");
    const handle = sheet?.querySelector(".sheet-handle");
    if (!sheet || !handle) return;

    sheet.classList.add("no-anim");

    const peekVh = 35;
    const topGapPx = 12;
  
    let startY = 0;
    let startTranslatePx = 0;
    let currentTranslatePx = 0;

    let minTranslatePx = 0;
    let peekTranslatePx = 0;
    let hiddenTranslatePx = 0;
  
    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  
    function getCurrentTranslatePx() {
      const t = getComputedStyle(sheet).transform;
      if (!t || t === "none") return 0;
      const parts = t.match(/matrix\((.+)\)/);
      if (!parts) return 0;
      const nums = parts[1].split(",").map((n) => parseFloat(n.trim()));
      return nums.length >= 6 ? nums[5] : 0;
    }
  
    function setTranslatePx(px) {
      sheet.style.setProperty("--sheet-translate", `${px}px`);
    }
  
    function computeMinTranslatePx() {
      const sheetH = sheet.getBoundingClientRect().height;
      return Math.max(0, sheetH - window.innerHeight + topGapPx);
    }
  
    function computePeekTranslatePx() {
      const vh = window.innerHeight / 100;
      const peekPx = peekVh * vh;
      const sheetH = sheet.getBoundingClientRect().height;
      return Math.max(0, sheetH - peekPx);
    }
  
    function computeHiddenTranslatePx() {
      const sheetH = sheet.getBoundingClientRect().height;
      return Math.max(peekTranslatePx, sheet.getBoundingClientRect().height - 24) - 127;
    }
  
    function recalcSnapPoints() {
      minTranslatePx = computeMinTranslatePx();
      peekTranslatePx = computePeekTranslatePx();
      hiddenTranslatePx = computeHiddenTranslatePx();
  
      peekTranslatePx = clamp(peekTranslatePx, minTranslatePx, hiddenTranslatePx);
    }
  
    function snapToNearest() {
      const points = [minTranslatePx, peekTranslatePx, hiddenTranslatePx];
      let best = points[0];
      let bestDist = Math.abs(currentTranslatePx - best);
  
      for (const p of points) {
        const d = Math.abs(currentTranslatePx - p);
        if (d < bestDist) {
          best = p;
          bestDist = d;
        }
      }
      sheet.classList.remove("is-dragging");
      setTranslatePx(best);
    }
  
    function onPointerDown(e) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
  
      const rect = sheet.getBoundingClientRect();
      const yInside = e.clientY - rect.top;
      
      const onHandle = e.target && e.target.closest?.('.sheet-handle');
      if (!onHandle && yInside > 240) return;
  
      recalcSnapPoints();
  
      startY = e.clientY;
      startTranslatePx = getCurrentTranslatePx();
      currentTranslatePx = startTranslatePx;
  
      sheet.classList.add("is-dragging");
      sheet.setPointerCapture(e.pointerId);
    }
  
    function onPointerMove(e) {
      if (!sheet.classList.contains("is-dragging")) return;
      const dy = e.clientY - startY;
  
      currentTranslatePx = clamp(startTranslatePx + dy, minTranslatePx, hiddenTranslatePx);
      setTranslatePx(currentTranslatePx);
    }
  
    function onPointerUp(e) {
      if (!sheet.classList.contains("is-dragging")) return;
      snapToNearest();
      try { sheet.releasePointerCapture(e.pointerId); } catch (_) {}
    }
  
    sheet.addEventListener("pointerdown", onPointerDown);
    sheet.addEventListener("pointermove", onPointerMove);
    sheet.addEventListener("pointerup", onPointerUp);
    sheet.addEventListener("pointercancel", onPointerUp);
  
    window.addEventListener("resize", () => {
      recalcSnapPoints();
      currentTranslatePx = getCurrentTranslatePx();
      snapToNearest();
    });
  
    requestAnimationFrame(() => {
        recalcSnapPoints();
        setTranslatePx(peekTranslatePx);
      
        requestAnimationFrame(() => {
          sheet.classList.remove("no-anim");
        });
      });
  })();