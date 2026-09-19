import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

const PALETTES = [
  { from: "#F2ECE5", to: "#E4D5C3", accent: "#D78B3C" },
  { from: "#EFE6DA", to: "#D9C3AE", accent: "#399B55" },
  { from: "#F5EFE6", to: "#E8D9C5", accent: "#5B321F" },
  { from: "#F0E9DE", to: "#DCC9AE", accent: "#B8712C" },
];

function hashSeed(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") ?? slug.replace(/-/g, " ");
  const subtitle = searchParams.get("subtitle") ?? "Selected Items";
  const width = Number(searchParams.get("w") ?? 1200);
  const height = Number(searchParams.get("h") ?? 900);
  const variant = hashSeed(slug + (searchParams.get("v") ?? "")) % PALETTES.length;
  const palette = PALETTES[variant];
  const initial = title.trim().charAt(0).toUpperCase() || "S";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: `linear-gradient(135deg, ${palette.from} 0%, ${palette.to} 100%)`,
          padding: 56,
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: height * 0.9,
            height: height * 0.9,
            borderRadius: "50%",
            border: `2px solid ${palette.accent}55`,
            top: height * 0.12,
            right: -height * 0.22,
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: height * 0.6,
            height: height * 0.6,
            borderRadius: "50%",
            border: `1.5px solid ${palette.accent}40`,
            bottom: -height * 0.18,
            left: -height * 0.12,
            display: "flex",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: "50%",
              background: "#FFFFFFB0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 44,
              color: "#3E2417",
              fontWeight: 600,
              border: `1px solid ${palette.accent}66`,
            }}
          >
            {initial}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div
            style={{
              fontSize: 20,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: palette.accent,
              fontWeight: 600,
              display: "flex",
            }}
          >
            {subtitle}
          </div>
          <div
            style={{
              fontSize: 52,
              color: "#3E2417",
              fontWeight: 600,
              maxWidth: width * 0.8,
              lineHeight: 1.15,
              display: "flex",
            }}
          >
            {title}
          </div>
        </div>
      </div>
    ),
    {
      width,
      height,
      // Deterministic given its inputs — cache aggressively so the same
      // fallback image isn't re-rendered via Satori on every page view.
      headers: { "Cache-Control": "public, max-age=31536000, immutable" },
    }
  );
}
