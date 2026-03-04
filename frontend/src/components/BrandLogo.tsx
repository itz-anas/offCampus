type BrandLogoProps = {
  size?: number;
  className?: string;
};

export default function BrandLogo({ size = 32, className = '' }: BrandLogoProps) {
  return (
    <div
      className={`rounded-xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700 flex items-center justify-center shadow-sm ${className}`.trim()}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg width={Math.round(size * 0.72)} height={Math.round(size * 0.72)} viewBox="0 0 32 32" fill="none">
        <path d="M6 22L16 9L26 22" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10 22H22" stroke="white" strokeWidth="3" strokeLinecap="round" />
        <circle cx="16" cy="15" r="2.5" fill="white" />
      </svg>
    </div>
  );
}
