"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { OptionCard } from "@/components/ui/OptionCard";
import { startCheckoutAction } from "@/lib/actions/orders";
import { formatPrice } from "@/lib/config/products";
import type { Product } from "@/lib/domain/types";

interface Props {
  giftId: string;
  products: Product[];
  initialProductId: string;
  recipientName: string;
  mode: "stripe" | "demo" | "unavailable";
  photoCount: number;
}

export function CheckoutForm({ giftId, products, initialProductId, recipientName, mode, photoCount }: Props) {
  const [productId, setProductId] = useState(products.some((p) => p.id === initialProductId) ? initialProductId : products[0]!.id);
  const [address, setAddress] = useState({ name: "", line1: "", line2: "", city: "", postcode: "", country: "GB", giftNote: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [scent, setScent] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const product = products.find((p) => p.id === productId)!;
  const total = product.priceMinor + (product.requiresShipping ? product.shippingMinor : 0);
  const needsPhotos = (product.minPhotos ?? 0) > photoCount;

  const submit = () => {
    setError(null);
    setErrors({});
    startTransition(async () => {
      if (product.scentOptions?.length && !product.scentOptions.some((s) => s.id === scent)) {
        setErrors({ scent: "Choose a fragrance, or unscented." });
        setError("Choose a fragrance, or unscented.");
        return;
      }
      const r = await startCheckoutAction(giftId, { productId, shippingAddress: product.requiresShipping ? address : undefined, options: product.scentOptions?.length ? { scent } : undefined });
      if (r && !r.ok) {
        setError(r.error);
        if (r.fieldErrors) setErrors(r.fieldErrors);
      }
    });
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <div className="space-y-8">
        <fieldset>
          <legend className="text-lg font-semibold text-ink">Choose your gift</legend>
          <div className="mt-4 grid gap-3" role="radiogroup" aria-label="Product">
            {products.map((p) => (
              <OptionCard key={p.id} name="product" value={p.id} checked={productId === p.id} onChange={setProductId} title={<span className="flex items-center justify-between gap-3 pr-2"><span>{p.name}</span><span className="font-display text-lg">{formatPrice(p.priceMinor)}</span></span>} description={<span>{p.tagline}{p.requiresShipping ? ` · ${p.shippingMinor ? `${formatPrice(p.shippingMinor)} UK delivery` : "UK delivery included"}` : ""}</span>} />
            ))}
          </div>
        </fieldset>

        {product.scentOptions?.length ? (
          <fieldset>
            <legend className="text-lg font-semibold text-ink">Choose the fragrance</legend>
            <p className="mt-1 text-sm text-text-muted">The card inside is lightly scented, so the season greets them when they uncork it.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Fragrance">
              {product.scentOptions.map((s) => (
                <OptionCard key={s.id} name="scent" value={s.id} checked={scent === s.id} onChange={(v) => { setScent(v); setErrors((e) => ({ ...e, scent: "" })); }} title={s.label} description={s.notes} compact />
              ))}
            </div>
            {errors.scent ? <p role="alert" className="mt-2 text-sm text-danger">{errors.scent}</p> : null}
          </fieldset>
        ) : null}

        {needsPhotos ? (
          <Notice tone="warning" title="Add a photo first">
            The {product.name} includes mini prints of your gift&apos;s photos, and this gift has none yet.{" "}
            <a href={`/gifts/${giftId}#memories-heading`} className="font-semibold underline underline-offset-4">Add photos to the gift</a>, then come back.
          </Notice>
        ) : product.minPhotos ? (
          <p className="text-sm text-text-muted">We&apos;ll print the first {Math.min(3, photoCount)} {Math.min(3, photoCount) === 1 ? "photo" : "photos"} in your gift&apos;s order. You can reorder them on the gift page.</p>
        ) : null}

        {product.requiresShipping ? (
          <fieldset className="space-y-4">
            <legend className="text-lg font-semibold text-ink">Delivery address (UK)</legend>
            <p className="text-sm text-text-muted">Where should we send the {product.name.toLowerCase()}? It can go straight to {recipientName}, or to you.</p>
            <Field id="addr-name" label="Name" error={errors.name}>
              <Input id="addr-name" value={address.name} onChange={(e) => setAddress({ ...address, name: e.target.value })} autoComplete="name" maxLength={80} invalid={Boolean(errors.name)} />
            </Field>
            <Field id="addr-line1" label="Address line 1" error={errors.line1}>
              <Input id="addr-line1" value={address.line1} onChange={(e) => setAddress({ ...address, line1: e.target.value })} autoComplete="address-line1" maxLength={120} invalid={Boolean(errors.line1)} />
            </Field>
            <Field id="addr-line2" label="Address line 2" optional>
              <Input id="addr-line2" value={address.line2} onChange={(e) => setAddress({ ...address, line2: e.target.value })} autoComplete="address-line2" maxLength={120} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="addr-city" label="Town or city" error={errors.city}>
                <Input id="addr-city" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} autoComplete="address-level2" maxLength={80} invalid={Boolean(errors.city)} />
              </Field>
              <Field id="addr-postcode" label="Postcode" error={errors.postcode}>
                <Input id="addr-postcode" value={address.postcode} onChange={(e) => setAddress({ ...address, postcode: e.target.value.toUpperCase() })} autoComplete="postal-code" maxLength={16} invalid={Boolean(errors.postcode)} />
              </Field>
            </div>
            <Field id="addr-note" label="Gift note on the packaging" optional hint="A short line for the outside of the parcel." counter={`${address.giftNote.length} / 200`}>
              <Textarea id="addr-note" value={address.giftNote} onChange={(e) => setAddress({ ...address, giftNote: e.target.value })} maxLength={200} className="min-h-[4.5rem]" />
            </Field>
          </fieldset>
        ) : null}
      </div>

      <aside className="h-fit rounded-xl border border-line bg-paper p-5 lg:sticky lg:top-20">
        <h2 className="text-xl">Summary</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-text-muted">{product.name}{product.scentOptions && scent ? ` · ${product.scentOptions.find((s) => s.id === scent)?.label}` : ""}</dt><dd>{formatPrice(product.priceMinor)}</dd></div>
          {product.requiresShipping ? <div className="flex justify-between"><dt className="text-text-muted">UK delivery</dt><dd>{product.shippingMinor ? formatPrice(product.shippingMinor) : "Included"}</dd></div> : null}
          <div className="flex justify-between border-t border-line pt-2 text-base font-semibold text-ink"><dt>Total</dt><dd>{formatPrice(total)}</dd></div>
        </dl>
        <p className="mt-3 text-xs text-text-faint">Includes VAT where applicable. The private link goes live as soon as payment is confirmed.</p>
        <div className="mt-5">
          {mode === "unavailable" ? (
            <Notice tone="warning">Payments aren&apos;t configured on this deployment yet.</Notice>
          ) : (
            <Button onClick={submit} disabled={pending || needsPhotos} fullWidth size="lg">
              {pending ? "One moment…" : mode === "stripe" ? "Continue to secure payment" : "Continue (demo payment)"}
            </Button>
          )}
        </div>
        {mode === "demo" ? <Notice tone="demo" className="mt-3">Demo checkout: no card is taken and nothing is charged. In production this goes to Stripe.</Notice> : null}
        {mode === "stripe" ? <p className="mt-3 text-xs text-text-faint">You&apos;ll be taken to Stripe to pay securely. We never see your card details.</p> : null}
        {error ? <Notice tone="danger" className="mt-3">{error}</Notice> : null}
      </aside>
    </div>
  );
}
