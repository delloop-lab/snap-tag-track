import { CANONICAL_ORIGIN } from "@/seo/site";

export function breadcrumbJsonLd(items: { name: string; path: string }[]): string {
  const list = items.map((item, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: item.name,
    item: item.path === "/" ? `${CANONICAL_ORIGIN}/` : `${CANONICAL_ORIGIN}${item.path}`,
  }));
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: list,
  });
}

/** HowTo for receipt capture — only emitted on the receipt scanner topic page to avoid duplicate HowTo elsewhere. */
export function receiptScanHowToJsonLd(): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to scan a receipt with Snap Tag Track",
    description:
      "Capture a clear receipt photo in the browser: lay the slip flat, fill the frame, use even light, then review fields before saving.",
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "Sign in and open Upload",
        text: "Open Snap Tag Track in your browser, sign in, and choose Upload or add from your receipt list.",
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Lay the receipt flat",
        text: "Smooth folds, keep the full slip visible, and avoid heavy shadows across totals.",
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Fill the frame and capture",
        text: "Hold the phone parallel to the paper, include all corners, and take the photo when focus is sharp.",
      },
      {
        "@type": "HowToStep",
        position: 4,
        name: "Review and save",
        text: "Check date, vendor, and amount; add tags or warranty notes, then save to your library.",
      },
    ],
  });
}

export function articleJsonLd(params: {
  headline: string;
  description: string;
  url: string;
  datePublished?: string;
}): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: params.headline,
    description: params.description,
    mainEntityOfPage: { "@type": "WebPage", "@id": params.url },
    ...(params.datePublished ? { datePublished: params.datePublished } : {}),
  });
}
