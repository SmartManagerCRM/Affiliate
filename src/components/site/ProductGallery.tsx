"use client";

import Image from "next/image";
import { useState } from "react";
import { clsx } from "clsx";

export function ProductGallery({
  images,
  productName,
}: {
  images: string[];
  productName: string;
}) {
  const [active, setActive] = useState(0);
  const safeImages = images.length > 0 ? images : [];

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square overflow-hidden rounded-3xl bg-beige shadow-[var(--shadow-card)]">
        <Image
          src={safeImages[active]}
          alt={productName}
          fill
          priority
          sizes="(min-width: 1024px) 40vw, 90vw"
          className="object-cover"
        />
      </div>
      {safeImages.length > 1 && (
        <div className="flex gap-3">
          {safeImages.map((src, i) => (
            <button
              key={src + i}
              onClick={() => setActive(i)}
              className={clsx(
                "relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-colors sm:h-20 sm:w-20",
                active === i ? "border-accent-gold" : "border-transparent"
              )}
            >
              <Image src={src} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
