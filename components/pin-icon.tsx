// components/pin-icon.tsx
// Shared red map-pin icon — matches the brand mark (red pin on orange/white).

export default function PinIcon({
  className = "h-3.5 w-3.5",
  color = "text-[#E5342A]",
}: {
  className?: string;
  /** สีของหมุด — แยกออกจาก className (ขนาด) เพื่อกันปัญหา Tailwind class ชนกัน
   *  ตอนอยาก override สี เช่นวางบนพื้นสีส้ม ให้ใช้ color="text-white" แทน */
  color?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} ${color}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.4" />
    </svg>
  );
}
