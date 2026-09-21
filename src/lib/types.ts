import type { Database, Tables } from "@/lib/database.types";

export type Activity = Tables<"activities">;
export type Category = Tables<"categories">;
export type Brand = Tables<"brands">;
export type Product = Tables<"products">;
export type ProductImage = Tables<"product_images">;
export type Retailer = Tables<"retailers">;
export type OfferPublic = Tables<"offers_public">;
export type TrafficSource = Tables<"traffic_sources">;
export type AffiliateNetwork = Tables<"affiliate_networks">;
export type Offer = Tables<"offers">;
export type AffiliateClick = Tables<"affiliate_clicks">;
export type ShoppingSession = Tables<"shopping_sessions">;
export type ShoppingCartItem = Tables<"shopping_cart_items">;
export type CartEvent = Tables<"cart_events">;

/** How a retailer's multi-product cart link (if any) is built. Matches the retailers.cart_link_type check constraint. */
export type CartLinkType = "none" | "static" | "dynamic" | "platform_specific" | "api" | "custom";

/** One row of cart_get_items()'s live join — the cart page's authoritative source, never offers.affiliate_url. */
export type CartItemView = Database["public"]["Functions"]["cart_get_items"]["Returns"][number];

export type ProductWithMeta = Product & {
  brand: Brand | null;
  images: ProductImage[];
  offers: OfferPublic[];
  categories: Category[];
};

export type ProductCardData = Product & {
  brand: Brand | null;
  offers: OfferPublic[];
};

export type SortOption =
  | "featured"
  | "price_asc"
  | "price_desc"
  | "newest"
  | "relevant";

export type ProductFilters = {
  activitySlug?: string;
  categorySlug?: string;
  brandSlug?: string;
  retailerSlug?: string;
  country?: string;
  priceMin?: number;
  priceMax?: number;
  availability?: string;
  sort?: SortOption;
  search?: string;
};
