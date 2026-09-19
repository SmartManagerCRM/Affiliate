import Image from "next/image";
import Link from "next/link";
import { placeholderImage } from "@/lib/image";
import type { Activity } from "@/lib/types";

const FALLBACK_ICONS: Record<string, string> = {
  cafe: "☕",
  restaurant: "🍽",
  "salon-spa": "💇",
  gym: "🏋",
};

export function ActivityCard({ activity }: { activity: Activity }) {
  const image =
    activity.hero_image ||
    placeholderImage(activity.slug, {
      title: activity.name,
      subtitle: "Selected Items",
      w: 800,
      h: 600,
    });

  return (
    <Link
      href={`/${activity.slug}`}
      className="group relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-3xl bg-espresso shadow-[var(--shadow-card)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-card-hover)] sm:aspect-[3/4]"
    >
      <Image
        src={image}
        alt={activity.name}
        fill
        sizes="(min-width: 1024px) 22vw, 45vw"
        className="object-cover opacity-80 transition-transform duration-500 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-espresso via-espresso/20 to-transparent" />
      <div className="relative flex flex-col gap-1 p-5 sm:p-6">
        <span className="text-2xl">{activity.icon || FALLBACK_ICONS[activity.slug] || "✦"}</span>
        <h3 className="font-serif-display text-xl font-semibold text-cream sm:text-2xl">
          {activity.name}
        </h3>
        {activity.description && (
          <p className="line-clamp-2 text-sm text-cream/70">{activity.description}</p>
        )}
      </div>
    </Link>
  );
}
