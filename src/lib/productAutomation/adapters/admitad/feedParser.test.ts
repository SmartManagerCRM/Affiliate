import { describe, it, expect } from "vitest";
import { parseCsvFeed, normalizeFeedRow } from "./feedParser";

describe("parseCsvFeed", () => {
  it("parses a simple CSV with a header row", () => {
    const csv = "id,name,price\n1,Widget,9.99\n2,Gadget,19.99\n";
    const rows = parseCsvFeed(csv);
    expect(rows).toEqual([
      { id: "1", name: "Widget", price: "9.99" },
      { id: "2", name: "Gadget", price: "19.99" },
    ]);
  });

  it("handles quoted fields containing commas", () => {
    const csv = 'id,name\n1,"Widget, Deluxe"\n';
    const rows = parseCsvFeed(csv);
    expect(rows).toEqual([{ id: "1", name: "Widget, Deluxe" }]);
  });

  it("handles escaped double quotes inside quoted fields", () => {
    const csv = 'id,name\n1,"Widget ""XL"""\n';
    const rows = parseCsvFeed(csv);
    expect(rows).toEqual([{ id: "1", name: 'Widget "XL"' }]);
  });

  it("normalizes CRLF line endings", () => {
    const csv = "id,name\r\n1,Widget\r\n2,Gadget\r\n";
    const rows = parseCsvFeed(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ id: "1", name: "Widget" });
  });

  it("returns an empty array for empty input", () => {
    expect(parseCsvFeed("")).toEqual([]);
  });

  it("returns an empty array for a header-only CSV", () => {
    expect(parseCsvFeed("id,name\n")).toEqual([]);
  });
});

describe("normalizeFeedRow", () => {
  it("maps a canonically-named row into the normalized shape", () => {
    const row = {
      product_id: "sku-1",
      name: "Widget",
      brand: "Acme",
      price: "19.99",
      currency: "USD",
      image_url: "https://example.test/widget.jpg",
      url: "https://example.test/go/widget",
      availability: "in_stock",
      shop: "Acme Store",
    };

    const product = normalizeFeedRow(row);

    expect(product.externalProductId).toBe("sku-1");
    expect(product.name).toBe("Widget");
    expect(product.brand).toBe("Acme");
    expect(product.images).toEqual(["https://example.test/widget.jpg"]);
    expect(product.offers).toHaveLength(1);
    expect(product.offers[0]).toMatchObject({
      price: 19.99,
      currency: "USD",
      affiliateUrl: "https://example.test/go/widget",
      availability: "in_stock",
      retailerName: "Acme Store",
    });
  });

  it("maps a differently-named (aliased) header set to the same shape", () => {
    const row = {
      offer_id: "sku-2",
      title: "Gadget",
      vendor: "Acme",
      cost: "29.99",
      currencyid: "EUR",
      picture: "https://example.test/gadget.jpg",
      link: "https://example.test/go/gadget",
      in_stock: "yes",
      store: "Acme Store",
    };

    const product = normalizeFeedRow(row);

    expect(product.externalProductId).toBe("sku-2");
    expect(product.name).toBe("Gadget");
    expect(product.offers[0].price).toBe(29.99);
    expect(product.offers[0].currency).toBe("EUR");
  });

  it("is case-insensitive about header names", () => {
    const row = { ID: "sku-3", NAME: "Thing", Price: "5", Currency: "USD", URL: "https://example.test/go/thing" };
    const product = normalizeFeedRow(row);
    expect(product.externalProductId).toBe("sku-3");
    expect(product.name).toBe("Thing");
  });

  it("parses a comma-decimal price", () => {
    const row = { id: "sku-4", name: "Euro Thing", price: "12,50", currency: "EUR", url: "https://example.test/go/4" };
    const product = normalizeFeedRow(row);
    expect(product.offers[0].price).toBe(12.5);
  });

  it("strips currency symbols from price", () => {
    const row = { id: "sku-5", name: "Priced Thing", price: "$42.00", currency: "USD", url: "https://example.test/go/5" };
    const product = normalizeFeedRow(row);
    expect(product.offers[0].price).toBe(42);
  });

  it("degrades gracefully with missing fields rather than throwing", () => {
    const row = { id: "sku-6" };
    const product = normalizeFeedRow(row);
    expect(product.externalProductId).toBe("sku-6");
    expect(product.name).toBe("");
    expect(product.offers[0].price).toBeNaN();
    expect(product.offers[0].affiliateUrl).toBe("");
  });

  it("produces no images when no image field is present", () => {
    const row = { id: "sku-7", name: "No Image Thing" };
    const product = normalizeFeedRow(row);
    expect(product.images).toEqual([]);
  });

  describe("availability mapping", () => {
    it("defaults to in_stock when availability is absent", () => {
      const row = { id: "sku-8", name: "Thing" };
      expect(normalizeFeedRow(row).offers[0].availability).toBe("in_stock");
    });

    it("maps out-of-stock variants", () => {
      for (const value of ["no", "false", "0", "out of stock", "outofstock"]) {
        const row = { id: "sku-9", name: "Thing", availability: value };
        expect(normalizeFeedRow(row).offers[0].availability).toBe("out_of_stock");
      }
    });

    it("maps preorder variants", () => {
      const row = { id: "sku-10", name: "Thing", availability: "preorder" };
      expect(normalizeFeedRow(row).offers[0].availability).toBe("preorder");
    });

    it("maps limited variants", () => {
      const row = { id: "sku-11", name: "Thing", availability: "limited stock" };
      expect(normalizeFeedRow(row).offers[0].availability).toBe("limited");
    });
  });
});
