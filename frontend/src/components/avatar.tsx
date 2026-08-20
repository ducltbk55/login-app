import Image from "next/image";

/** Ảnh đại diện Google (domain được cho phép trong next.config.ts). */
export function Avatar({
  src,
  name,
  size = 64,
}: {
  src: string;
  name?: string | null;
  size?: number;
}) {
  return (
    <Image
      src={src}
      alt={name ?? "Ảnh đại diện"}
      width={size}
      height={size}
      className="rounded-full"
    />
  );
}
