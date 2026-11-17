import React from 'react';

interface ReceiptLogoProps {
  className?: string;
}

export const ReceiptLogo: React.FC<ReceiptLogoProps> = ({ className = 'h-10 w-10' }) => {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={`${className} shrink-0 text-[#7A1E34] dark:text-[#F4B4C2] drop-shadow-sm transition-transform`}
    >
      <path
        d="M8 8.5C8 6.567 9.567 5 11.5 5H28.5C30.433 5 32 6.567 32 8.5V34.5L29 31.8L26 34.5L23 31.8L20 34.5L17 31.8L14 34.5L11 31.8L8 34.5V8.5Z"
        fill="#FFFFFF"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="M13.5 13H26.5M13.5 18.5H21.5M24.5 18.5H26.5M13.5 24H20M23.5 24H26.5"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
    </svg>
  );
};
