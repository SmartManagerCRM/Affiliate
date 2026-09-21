"use client";

import { useState } from "react";
import { Field, TextInput, TextArea, Select, Checkbox } from "@/components/admin/FormField";
import { Button } from "@/components/ui/Button";
import type { CartLinkType } from "@/lib/types";

const CART_LINK_TYPE_OPTIONS: { value: CartLinkType; label: string }[] = [
  { value: "none", label: "None — items are shopped individually" },
  { value: "static", label: "Static cart link template" },
  { value: "dynamic", label: "Dynamic (reserved for a future implementation)" },
  { value: "platform_specific", label: "Platform-specific (reserved for a future implementation)" },
  { value: "api", label: "API integration (reserved for a future implementation)" },
  { value: "custom", label: "Custom (reserved for a future implementation)" },
];

const JSON_CONFIG_TYPES: CartLinkType[] = ["dynamic", "platform_specific", "api", "custom"];

/**
 * Only cart_link_type "static" (a plain cart_link_template URL) has any
 * storefront behavior behind it today — the cart page's grouping logic
 * (getRetailerCartStrategy) only distinguishes "a real strategy is
 * configured" from "none". The other strategy values are accepted and
 * stored so an admin can pre-configure a retailer ahead of a future
 * implementation, per the "future compatibility" requirement — but nothing
 * resolves cart_config into an actual multi-item redirect yet, and "Test
 * Cart Configuration" is a format check only, never a live request to the
 * retailer (we never manipulate a retailer's cart without documented,
 * implemented support).
 */
export function CartConfigFields({
  supportsMultiProductCart,
  cartLinkType,
  cartLinkTemplate,
  cartConfig,
}: {
  supportsMultiProductCart: boolean;
  cartLinkType: CartLinkType;
  cartLinkTemplate: string;
  cartConfig: string;
}) {
  const [supports, setSupports] = useState(supportsMultiProductCart);
  const [strategy, setStrategy] = useState<CartLinkType>(cartLinkType);
  const [template, setTemplate] = useState(cartLinkTemplate);
  const [configText, setConfigText] = useState(cartConfig);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  function runTest() {
    if (strategy === "static") {
      try {
        const url = new URL(template);
        if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("not http(s)");
        setTestResult({
          ok: true,
          message: "Valid URL. (Format check only — the storefront doesn't send visitors here yet.)",
        });
      } catch {
        setTestResult({ ok: false, message: "Not a valid http(s) URL." });
      }
      return;
    }
    try {
      if (configText.trim()) JSON.parse(configText);
      setTestResult({
        ok: true,
        message: "Valid JSON. (Format check only — this strategy isn't implemented by the storefront yet.)",
      });
    } catch {
      setTestResult({ ok: false, message: "Cart configuration is not valid JSON." });
    }
  }

  const showsInvalidCombo = supports && strategy === "none";

  return (
    <div className="flex flex-col gap-5 rounded-xl border border-espresso/10 bg-beige/40 p-4">
      <Checkbox
        name="supports_multi_product_cart"
        label="Supports multi-product cart"
        checked={supports}
        onChange={(e) => setSupports(e.target.checked)}
      />

      <Field
        label="Cart strategy"
        hint="Only 'Static cart link template' has any real behavior today — the rest are reserved for future implementations."
      >
        <Select
          name="cart_link_type"
          value={strategy}
          onChange={(e) => {
            setStrategy(e.target.value as CartLinkType);
            setTestResult(null);
          }}
        >
          {CART_LINK_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </Field>

      {showsInvalidCombo && (
        <p className="text-xs text-red-600">
          Supports multi-product cart requires a cart strategy other than &quot;None&quot;.
        </p>
      )}

      {strategy === "static" && (
        <Field
          label="Cart link template"
          hint="The retailer's own documented cart URL. Never invented — leave blank until you have a real one from the retailer."
        >
          <TextInput
            name="cart_link_template"
            value={template}
            onChange={(e) => {
              setTemplate(e.target.value);
              setTestResult(null);
            }}
            placeholder="https://retailer.example.com/cart"
          />
        </Field>
      )}

      {JSON_CONFIG_TYPES.includes(strategy) && (
        <Field label="Cart configuration (JSON)" hint="Reserved for this strategy's future implementation.">
          <TextArea
            name="cart_config"
            value={configText}
            onChange={(e) => {
              setConfigText(e.target.value);
              setTestResult(null);
            }}
            placeholder="{}"
          />
        </Field>
      )}

      {strategy !== "none" && (
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" size="sm" onClick={runTest}>
            Test Cart Configuration
          </Button>
          {testResult && (
            <span className={`text-sm ${testResult.ok ? "text-accent-green-dark" : "text-red-600"}`}>
              {testResult.message}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
