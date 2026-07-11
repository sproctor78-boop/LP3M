export function RippleMark() {
  return (
    <svg
      className="ripple-mark"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
    >
      {/* Droplet — the point of impact */}
      <circle cx="12" cy="14" r="2" fill="currentColor" />
      {/* Inner ripple */}
      <circle
        className="ripple-mark-ring ripple-mark-ring-1"
        cx="12" cy="14" r="5"
        fill="none" stroke="currentColor" strokeWidth="1"
        opacity="0.55"
      />
      {/* Outer ripple */}
      <circle
        className="ripple-mark-ring ripple-mark-ring-2"
        cx="12" cy="14" r="8.5"
        fill="none" stroke="currentColor" strokeWidth="1"
        opacity="0.25"
      />
    </svg>
  );
}
