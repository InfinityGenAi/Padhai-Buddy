import Image from "next/image";

interface BrandLogoProps {
  size?: number;
  className?: string;
  href?: string;
  alt?: string;
}

/**
 * Single source of truth for the official Padhai Buddy brand mark.
 * Use the repository's approved PNG asset so pages don't render the
 * older, mismatched SVG variant.
 */
export default function BrandLogo({
  size = 40,
  className = "",
  href,
  alt = "Padhai Buddy",
}: BrandLogoProps) {
  const content = (
    <Image
      src="/brand/padhai-buddy-logo.png"
      alt={alt}
      width={size}
      height={size}
      className={className}
      priority
    />
  );

  if (href) {
    return (
      <a href={href} className="inline-flex flex-shrink-0" aria-label={alt}>
        {content}
      </a>
    );
  }

  return content;
}
