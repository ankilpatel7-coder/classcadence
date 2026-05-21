import Image from "next/image";

type Props = {
  size?: number;
  showWordmark?: boolean;
  className?: string;
};

export function Logo({ size = 32, showWordmark = true, className = "" }: Props) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Image
        src="/logo.svg"
        alt="ClassCadence"
        width={size}
        height={size}
        priority
        className="rounded-md"
      />
      {showWordmark ? (
        <span className="font-wordmark text-xl text-primary">ClassCadence</span>
      ) : null}
    </span>
  );
}
