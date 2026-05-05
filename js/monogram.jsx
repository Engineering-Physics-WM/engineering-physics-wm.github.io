/* EP monogram — interlocked E + P, drawn as SVG.
   Used as logo, mobile menu toggle, and decorative mark.
   The "interlock" is the right vertical bar of the E doubling as the stem of the P. */

const Monogram = ({ size = 40, color = "currentColor", trademark = true, decorative = true }) => {
  const stroke = Math.max(2, Math.round(size * 0.14));
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role={decorative ? "img" : undefined}
      aria-label={decorative ? "Engineering Physics" : undefined}
      style={{ display: "block", overflow: "visible" }}
    >
      {/* E: left bar + 3 horizontals (top, middle, bottom) */}
      <path
        d="M 12 8 L 12 56"
        fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="square"
      />
      <path
        d="M 12 8 L 36 8"
        fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="square"
      />
      <path
        d="M 12 32 L 30 32"
        fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="square"
      />
      <path
        d="M 12 56 L 36 56"
        fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="square"
      />
      {/* P: shares a stem with the E's right side; bowl interlocks with E's middle bar */}
      <path
        d="M 36 8 L 36 56"
        fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="square"
      />
      <path
        d="M 36 8 Q 56 8 56 20 Q 56 32 36 32"
        fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="square"
      />
      {trademark && (
        <text
          x="58" y="14"
          fontSize="9" fontFamily="ui-monospace, monospace"
          fill={color} opacity="0.7"
        >™</text>
      )}
    </svg>
  );
};

window.Monogram = Monogram;
