import Image from "next/image";

interface BrandLogoProps {
  size?: number;
  className?: string;
  href?: string;
  alt?: string;
}

export default function BrandLogo({
  size = 40,
  className = "",
  href,
  alt = "Padhai Buddy",
}: BrandLogoProps) {
  const src = "/brand/padhai-buddy-logo.png";
  const content = (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={`rounded-xl ${className}`}
      priority
    />
  );

  if (href) {
    return (
      <a href={href} className="inline-flex flex-shrink-0">
        {content}
      </a>
    );
  }

  return content;
}
