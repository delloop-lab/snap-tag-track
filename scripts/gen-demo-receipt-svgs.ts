/**
 * Generates public/demo/*.svg receipts from DEMO_RECEIPTS_DATASET (single source of truth).
 * Run: npx tsx scripts/gen-demo-receipt-svgs.ts
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { DemoReceiptRecord } from "../src/lib/demo/demoDataset";
import {
  DEMO_RECEIPTS_DATASET,
  round2,
  subtotalForReceipt,
  totalForReceipt,
  vatForReceipt,
} from "../src/lib/demo/demoDataset";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEMO_DIR = path.join(__dirname, "..", "public", "demo");

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function ptDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function receiptSvg(receipt: DemoReceiptRecord): string {
  const sub = subtotalForReceipt(receipt);
  const vat = vatForReceipt(receipt);
  const total = totalForReceipt(receipt);

  const width = 340;
  const pad = 20;
  const font = "'Courier New',Consolas,monospace";
  let y = 36;
  const out: string[] = [];

  const text = (
    content: string,
    opts: { x?: number; size?: number; anchor?: "start" | "middle"; weight?: string } = {}
  ) => {
    const x = opts.x ?? (opts.anchor === "middle" ? width / 2 : pad);
    const size = opts.size ?? 11;
    const anchor = opts.anchor ?? "start";
    const weight = opts.weight ?? "400";
    out.push(
      `<text x="${x}" y="${y}" font-family="${font}" font-size="${size}" font-weight="${weight}" ` +
        `text-anchor="${anchor}" fill="#141414">${escapeXml(content)}</text>`
    );
    y += size + 6;
  };

  const divider = () => {
    y += 4;
    out.push(
      `<line x1="${pad}" y1="${y}" x2="${width - pad}" y2="${y}" stroke="#b0b0b0" stroke-dasharray="5 4" stroke-width="1"/>`
    );
    y += 14;
  };

  out.push(`<defs>
    <filter id="paper" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" result="n"/>
      <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.06 0" in="n" result="n2"/>
      <feBlend in="SourceGraphic" in2="n2" mode="multiply"/>
    </filter>
  </defs>`);

  const bodyH = 120 + receipt.lineItems.length * 44 + 160;
  const height = Math.max(480, bodyH);

  out.push(
    `<g filter="url(#paper)" transform="rotate(-0.6 ${width / 2} ${height / 2}) translate(4 2)">`
  );
  out.push(`<rect x="0" y="0" width="${width}" height="${height}" fill="#f7f5f2" rx="3"/>`);

  text(receipt.vendor, { size: 15, anchor: "middle", weight: "700" });
  text("Fatura simplificada", { size: 9, anchor: "middle" });
  divider();
  text(receipt.invoiceNumber, { size: 10 });
  text(`Data ${ptDate(receipt.purchaseDate)}  ${receipt.purchaseTime}`, { size: 10 });
  text("NIF cliente 999999990", { size: 9 });
  divider();
  text("Descricao / IVA / Linha EUR", { size: 9 });
  divider();

  for (const item of receipt.lineItems) {
    const lineTot = round2(item.qty * item.unitPrice);
    const label = `${item.qty}x ${item.name}`;
    text(label.length > 34 ? `${label.slice(0, 31)}...` : label, { size: 10 });
    text(`${item.vatRate}% IVA        ${lineTot.toFixed(2)} ${receipt.currency}`, {
      size: 10,
    });
  }

  divider();
  text(`SUBTOTAL  ${sub.toFixed(2)} ${receipt.currency}`, { size: 11, weight: "600" });
  text(`IVA       ${vat.toFixed(2)} ${receipt.currency}`, { size: 11 });
  text(`TOTAL     ${total.toFixed(2)} ${receipt.currency}`, {
    size: 13,
    anchor: "middle",
    weight: "700",
  });
  divider();
  text(`Pagamento: ${receipt.paymentMethod}`, { size: 10 });
  if (receipt.warrantyEligible && receipt.warrantyExpiryDate) {
    text(`Garantia ate ${ptDate(receipt.warrantyExpiryDate)}`, { size: 10 });
  }
  text("Obrigado pela sua compra", { size: 9, anchor: "middle" });
  text("(Demo SnapTagTrack)", { size: 8, anchor: "middle" });

  out.push(`</g>`);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
${out.join("\n")}
</svg>`;
}

function outfileFor(receipt: DemoReceiptRecord): string {
  const name = path.basename(receipt.imagePath);
  return path.join(DEMO_DIR, name);
}

async function main() {
  fs.mkdirSync(DEMO_DIR, { recursive: true });
  for (const receipt of DEMO_RECEIPTS_DATASET) {
    const outfile = outfileFor(receipt);
    fs.writeFileSync(outfile, receiptSvg(receipt), "utf8");
    console.log("Wrote", path.relative(process.cwd(), outfile));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
