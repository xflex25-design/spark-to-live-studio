interface LogoProps {
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-7",
  md: "h-8",
  lg: "h-10",
} as const;

export function Logo({ size = "md" }: LogoProps) {
  return (
    <img
      src="/assets/orgraai-logo-white.png"
      alt="OrgraaAI"
      className={`${sizeClasses[size]} w-auto object-contain`}
    />
  );
}
