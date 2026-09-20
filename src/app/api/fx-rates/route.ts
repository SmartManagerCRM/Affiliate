import { NextResponse } from "next/server";

// Free, keyless exchange-rate API. Rates move slowly enough that a 12h
// cache is unnoticeable, and it keeps this route from calling out on every
// request. See https://www.exchangerate-api.com/docs/free
const FX_SOURCE_URL = "https://open.er-api.com/v6/latest/USD";
const REVALIDATE_SECONDS = 60 * 60 * 12;

export async function GET() {
  try {
    const res = await fetch(FX_SOURCE_URL, {
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) throw new Error(`FX provider responded ${res.status}`);

    const data = await res.json();
    if (data.result !== "success" || !data.rates) {
      throw new Error("Unexpected FX provider response shape");
    }

    return NextResponse.json(
      {
        base: data.base_code ?? "USD",
        rates: data.rates,
        fetchedAt: data.time_last_update_utc ?? new Date().toUTCString(),
      },
      { headers: { "Cache-Control": "public, max-age=3600" } }
    );
  } catch (error) {
    console.error("[fx-rates] failed to fetch live rates:", error);
    return NextResponse.json(
      { base: "USD", rates: null, fetchedAt: null },
      { status: 502 }
    );
  }
}
