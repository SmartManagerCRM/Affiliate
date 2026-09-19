import type { Tables } from "@/lib/database.types";

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
