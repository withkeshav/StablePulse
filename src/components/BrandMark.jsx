export default function BrandMark({ size = 36, className = '' }) {
  return (
    <svg
      class={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <ellipse cx="32" cy="34" rx="22" ry="14" stroke="#5B9CFF" stroke-width="2.2" opacity=".9" />
      <ellipse cx="32" cy="30" rx="16" ry="10" stroke="#286FCF" stroke-width="1.8" opacity=".65" />
      <path d="M10 34c8-4 14-6 22-6s14 2 22 6" stroke="#5B9CFF" stroke-width="2" stroke-linecap="round" opacity=".95" />
      <circle cx="32" cy="34" r="3.2" fill="#5B9CFF" />
    </svg>
  );
}

export function BrandWordmark({ size = 36, withImage = false }) {
  return (
    <div class="brand">
      {withImage ? (
        <img src="/stablesense-logo.png" alt="" width={size} height={size} />
      ) : (
        <BrandMark size={size} />
      )}
      <span>
        stable
        <span>sense</span>
      </span>
    </div>
  );
}
