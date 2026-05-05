/* Tweaks panel — color/sparks/fonts/density/ranking */

const TweakPanelInline = () => {
  const defaults = /*EDITMODE-BEGIN*/{
    "paper": "olive",
    "pinkOliveMix": 55,
    "sparkIntensity": 1.0,
    "fontPair": "grotesk",
    "density": "cozy",
    "rankingStyle": "drag"
  }/*EDITMODE-END*/;
  const [tw, setTweak] = useTweaks(defaults);

  // Apply globally
  React.useEffect(() => {
    document.documentElement.dataset.density = tw.density;
    document.documentElement.dataset.font = tw.fontPair;
    document.documentElement.dataset.paper = tw.paper;
    const pinkPct = tw.pinkOliveMix / 100;
    document.documentElement.style.setProperty("--pink-mix", pinkPct);
    document.documentElement.style.setProperty("--olive-mix", 1 - pinkPct);
    // Bias accent
    if (pinkPct > 0.6) {
      document.documentElement.style.setProperty("--accent", "var(--pink)");
      document.documentElement.style.setProperty("--accent-ink", "var(--pink-ink)");
      document.documentElement.style.setProperty("--accent-soft", "var(--pink-soft)");
    } else if (pinkPct < 0.4) {
      document.documentElement.style.setProperty("--accent", "var(--olive)");
      document.documentElement.style.setProperty("--accent-ink", "var(--olive-ink)");
      document.documentElement.style.setProperty("--accent-soft", "var(--olive-soft)");
    }
    window.__epTweakSparks = tw.sparkIntensity;
    window.dispatchEvent(new CustomEvent("ep:sparks", { detail: tw.sparkIntensity }));
  }, [tw]);

  return (
    <TweaksPanel title="Tweaks">
      <TweakSection title="Background" subtitle="Pick the paper">
        <TweakRadio
          options={[
            { label: "Pink", value: "pink" },
            { label: "Olive", value: "olive" },
            { label: "Grey", value: "grey" },
            { label: "Cream", value: "cream" },
          ]}
          value={tw.paper} onChange={(v) => setTweak("paper", v)}
        />
      </TweakSection>
      <TweakSection title="Accent" subtitle="Pink ↔ Olive ratio">
        <TweakSlider label="Dusty pink" min={0} max={100} value={tw.pinkOliveMix} onChange={(v) => setTweak("pinkOliveMix", v)} />
      </TweakSection>
      <TweakSection title="Sparks" subtitle="Cursor + hover particles">
        <TweakSlider label="Intensity" min={0} max={1.6} step={0.1} value={tw.sparkIntensity} onChange={(v) => setTweak("sparkIntensity", v)} />
      </TweakSection>
      <TweakSection title="Type">
        <TweakRadio
          options={[
            { label: "Grotesk", value: "grotesk" },
            { label: "Editorial", value: "editorial" },
            { label: "Serif", value: "serif" },
            { label: "Mono mix", value: "mono-mix" },
          ]}
          value={tw.fontPair} onChange={(v) => setTweak("fontPair", v)}
        />
      </TweakSection>
      <TweakSection title="Card density">
        <TweakRadio
          options={[{label: "Compact", value: "compact"}, {label: "Cozy", value: "cozy"}, {label: "Spacious", value: "spacious"}]}
          value={tw.density} onChange={(v) => setTweak("density", v)}
        />
      </TweakSection>
      <TweakSection title="Ranking interaction">
        <TweakRadio
          options={[{label: "Drag list", value: "drag"}, {label: "Bracket", value: "bracket"}, {label: "Tier", value: "tier"}]}
          value={tw.rankingStyle} onChange={(v) => setTweak("rankingStyle", v)}
        />
        <p style={{ fontSize: 11, color: "var(--muted)", margin: "8px 0 0" }}>
          Drag is live now. Bracket/Tier are placeholders for future iterations.
        </p>
      </TweakSection>
    </TweaksPanel>
  );
};

window.TweakPanelInline = TweakPanelInline;
