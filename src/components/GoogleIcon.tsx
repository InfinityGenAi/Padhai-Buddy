import React from "react";

interface GoogleIconProps {
  size?: number;
  className?: string;
}

export default function GoogleIcon({
  size = 20,
  className = "",
}: GoogleIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
    >
      <path
        fill="#EA4335"
        d="M22.56 11.75c0-.98-.09-1.95-.25-2.91H12v5.66h4.92c-.19.82-.46 1.56-.82 2.2l3.57 2.8c2.19-2.01 3.5-4.9 3.5-8.55z"
      />
      <path fill="#FFC107" d="M12 23c2.97 0 5.47-.98 7.35-2.66l-3.57-2.8c-.98.65-2.23 1.04-3.54 1.18-.96.16-1.92.06-2.83-.27-.83-.3-1.58-.75-2.2-1.3l-3.06 2.38c1.72 2.58 4.64 4.36 7.92 4.36z" />
      <path fill="#4285F4" d="M12 4.75c1.24 0 2.43.22 3.55.63l2.59-2.59C17.08 1.1 14.65 0 12 0 8.72 0 5.8 1.78 3.92 4.66l3.06 2.38C9.42 5.75 10.67 4.75 12 4.75z" />
      <path fill="#34A853" d="M7.53 11.75c0 .86.16 1.72.45 2.53l-.01.02-3.06-2.38c-.79-.61-1.52-1.38-2.14-2.25S.75 9.26.75 8.3c0-.98.16-1.95.45-2.91 2.88 2.03 6.33 3.16 9.95 3.16v.01z" />
    </svg>
  );
}