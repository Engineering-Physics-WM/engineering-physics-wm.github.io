/* Motion: ambient particles in hero, hover sparks, reveal-on-scroll. */

// ---------- Hero particles ----------
const HeroParticles = ({ count = 14, intensity = 1 }) => {
  if (intensity <= 0) return null;
  const dots = React.useMemo(() => Array.from({ length: count }, (_, i) => {
    const x = Math.random() * 100;
    const y = 60 + Math.random() * 40;
    const tx = (Math.random() - 0.5) * 200;
    const ty = -100 - Math.random() * 200;
    const dur = 8 + Math.random() * 10;
    const delay = -Math.random() * dur;
    const olive = i % 3 === 0;
    const size = 2 + Math.random() * 3;
    return { x, y, tx, ty, dur, delay, olive, size };
  }), [count]);

  return (
    <div className="particles" aria-hidden="true">
      {dots.map((d, i) => (
        <span
          key={i}
          className={"particle" + (d.olive ? " olive" : "")}
          style={{
            left: d.x + "%",
            top: d.y + "%",
            width: d.size, height: d.size,
            "--tx": d.tx + "px",
            "--ty": d.ty + "px",
            animationDuration: d.dur + "s",
            animationDelay: d.delay + "s",
            opacity: 0.55 * intensity,
          }}
        />
      ))}
    </div>
  );
};

// ---------- Spark canvas (cursor + click bursts) ----------
const SparkLayer = ({ intensity = 1 }) => {
  const canvasRef = React.useRef(null);
  React.useEffect(() => {
    if (intensity <= 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let particles = [];
    let raf;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = innerWidth * dpr;
      canvas.height = innerHeight * dpr;
      canvas.style.width = innerWidth + "px";
      canvas.style.height = innerHeight + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    let lastSpawn = 0;
    const spawnTrail = (x, y) => {
      const now = performance.now();
      if (now - lastSpawn < 30 / intensity) return;
      lastSpawn = now;
      const olive = Math.random() < 0.35;
      particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -0.2 - Math.random() * 0.3,
        life: 1,
        size: 1 + Math.random() * 1.5,
        olive,
      });
      if (particles.length > 80) particles.shift();
    };

    const burst = (x, y, n = 10) => {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
        const v = 1 + Math.random() * 2;
        particles.push({
          x, y,
          vx: Math.cos(a) * v,
          vy: Math.sin(a) * v - 0.5,
          life: 1,
          size: 1.2 + Math.random() * 1.8,
          olive: Math.random() < 0.4,
        });
      }
    };

    const onMove = (e) => spawnTrail(e.clientX, e.clientY);
    const onClick = (e) => {
      const tgt = e.target.closest("[data-spark]");
      if (tgt) burst(e.clientX, e.clientY, 14);
    };
    const onHover = (e) => {
      const tgt = e.target.closest("[data-spark]");
      if (tgt) {
        const r = tgt.getBoundingClientRect();
        burst(r.left + r.width / 2 + (Math.random() - 0.5) * r.width * 0.6,
              r.top + r.height * 0.3 + (Math.random() - 0.5) * r.height * 0.4, 4);
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("click", onClick);
    document.addEventListener("pointerover", onHover);

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles = particles.filter(p => p.life > 0);
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy; p.vy += 0.03; p.life -= 0.018;
        ctx.globalAlpha = Math.max(0, p.life) * 0.7 * intensity;
        ctx.fillStyle = p.olive ? "oklch(42% 0.045 120)" : "oklch(72% 0.060 18)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * Math.max(0.2, p.life), 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("click", onClick);
      document.removeEventListener("pointerover", onHover);
    };
  }, [intensity]);

  if (intensity <= 0) return null;
  return <canvas ref={canvasRef} className="spark-canvas" aria-hidden="true" />;
};

// ---------- Reveal-on-scroll ----------
const Reveal = ({ children, delay = 0, as: Tag = "div", className = "", ...rest }) => {
  const ref = React.useRef(null);
  const [seen, setSeen] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (seen) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          setTimeout(() => setSeen(true), delay);
          io.disconnect();
        }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [delay, seen]);
  return <Tag ref={ref} className={"reveal " + (seen ? "in " : "") + className} {...rest}>{children}</Tag>;
};

Object.assign(window, { HeroParticles, SparkLayer, Reveal });
