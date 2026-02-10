document.addEventListener("DOMContentLoaded", () => {
  const reduceMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const svgs = Array.from(document.querySelectorAll(".write-svg"));
  if (!svgs.length) return;

  if (reduceMotion) {
    svgs.forEach(svg => {
      svg.querySelectorAll(".write-path").forEach(p => {
        p.style.strokeDasharray = "none";
        p.style.strokeDashoffset = "0";
        p.style.animation = "none";
      });
    });
    return;
  }

  const WORD_GAP_MS = 0;
  const PATH_STAGGER_MS = 50;
  const DURATION_MS = 1100;
  const START_DELAY_MS = 800;

  let timelineMs = START_DELAY_MS;

  svgs.forEach(svg => {
    const paths = Array.from(svg.querySelectorAll(".write-path"));

    paths.forEach((p, idx) => {
      const len = Math.max(1, Math.ceil(p.getTotalLength()));
      p.style.strokeDasharray = String(len);
      p.style.strokeDashoffset = String(len);

      p.style.animationName = "write-stroke";
      p.style.animationDuration = `${DURATION_MS}ms`;
      p.style.animationTimingFunction = "ease";
      p.style.animationFillMode = "forwards";

      p.style.animationDelay = `${timelineMs + idx * PATH_STAGGER_MS}ms`;
    });

    const wordSpanMs = (paths.length - 1) * PATH_STAGGER_MS;
    const wordEndMs = timelineMs + DURATION_MS + wordSpanMs;
    
    setTimeout(() => {
      svg.classList.add("is-filled");
    }, wordEndMs);

    timelineMs += DURATION_MS + wordSpanMs + WORD_GAP_MS;
  });
});