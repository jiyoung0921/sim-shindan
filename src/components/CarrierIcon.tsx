import Image from "next/image";
import { SmartphoneDevice } from "iconoir-react";
import type { CarrierBrand } from "@/lib/carriers";

interface CarrierIconProps {
  carrier: CarrierBrand;
  className?: string;
}

export default function CarrierIcon({ carrier, className = "" }: CarrierIconProps) {
  return (
    <span
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-zinc-200 bg-white ${className}`}
      aria-hidden="true"
    >
      {carrier.iconSrc ? (
        <Image src={carrier.iconSrc} alt="" width={24} height={24} className="h-5 w-5 object-contain" />
      ) : (
        <SmartphoneDevice className="h-4 w-4 text-zinc-500" strokeWidth={1.8} />
      )}
    </span>
  );
}
