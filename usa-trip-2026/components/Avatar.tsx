"use client";

import { useState } from "react";
import { UserRound } from "lucide-react";
import { slugifyPersonName } from "@/lib/slug";

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const src = `/avatars/${slugifyPersonName(name)}.webp`;

  if (failed) {
    return (
      <span
        style={{ width: size, height: size }}
        className="flex shrink-0 items-center justify-center rounded-full bg-white/15 text-white"
      >
        <UserRound size={size * 0.55} strokeWidth={2} />
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className="shrink-0 rounded-full object-cover"
      onError={() => setFailed(true)}
    />
  );
}
