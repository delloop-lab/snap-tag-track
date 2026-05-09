export type DemoCategory =
  | "Groceries"
  | "Electronics"
  | "Health"
  | "Dining"
  | "Fuel"
  | "Home"
  | "Fashion";

export type DemoLineItem = {
  name: string;
  qty: number;
  unitPrice: number;
  vatRate: number;
};

export type DemoReceiptRecord = {
  id: string;
  vendor: string;
  category: DemoCategory;
  purchaseDate: string; // YYYY-MM-DD
  purchaseTime: string; // HH:mm
  invoiceNumber: string;
  paymentMethod: "MULTIBANCO" | "MB WAY" | "VISA" | "MASTERCARD";
  currency: "EUR";
  confidenceScore: number;
  warrantyEligible: boolean;
  warrantyExpiryDate: string | null; // YYYY-MM-DD
  imagePath: string;
  productImage: string | null;
  tags: string[];
  lineItems: DemoLineItem[];
};

export const DEMO_RECEIPTS_DATASET: DemoReceiptRecord[] = [
  {
    id: "demo-continente-001",
    vendor: "Continente",
    category: "Groceries",
    purchaseDate: "2026-03-14",
    purchaseTime: "18:42",
    invoiceNumber: "FT A/32041",
    paymentMethod: "MULTIBANCO",
    currency: "EUR",
    confidenceScore: 0.96,
    warrantyEligible: false,
    warrantyExpiryDate: null,
    imagePath: "/demo/continente.png",
    productImage: null,
    tags: ["groceries"],
    lineItems: [
      { name: "Leite Meio-Gordo 1L", qty: 3, unitPrice: 0.99, vatRate: 6 },
      { name: "Pao de Forma", qty: 2, unitPrice: 1.49, vatRate: 6 },
      { name: "Frango Filetes", qty: 1, unitPrice: 8.75, vatRate: 6 },
      { name: "Detergente Roupa", qty: 1, unitPrice: 6.99, vatRate: 23 },
      { name: "Iogurte Natural Pack", qty: 2, unitPrice: 2.89, vatRate: 6 },
      { name: "Legumes Frescos", qty: 1, unitPrice: 5.68, vatRate: 6 },
      { name: "Azeite Virgem 750ml", qty: 1, unitPrice: 12.34, vatRate: 6 },
    ],
  },
  {
    id: "demo-worten-001",
    vendor: "Worten",
    category: "Electronics",
    purchaseDate: "2026-02-06",
    purchaseTime: "12:18",
    invoiceNumber: "FT WR/90812",
    paymentMethod: "MB WAY",
    currency: "EUR",
    confidenceScore: 0.93,
    warrantyEligible: true,
    warrantyExpiryDate: "2029-02-06",
    imagePath: "/demo/worten.png",
    productImage: "/demo/worten.jpg",
    tags: ["electronics"],
    lineItems: [
      { name: "Auscultadores Bluetooth", qty: 1, unitPrice: 89.9, vatRate: 23 },
      { name: "Teclado Sem Fios", qty: 1, unitPrice: 59.99, vatRate: 23 },
      { name: "Cabo HDMI 2m", qty: 2, unitPrice: 9.95, vatRate: 23 },
    ],
  },
  {
    id: "demo-farmacia-001",
    vendor: "Farmacia Central",
    category: "Health",
    purchaseDate: "2026-01-28",
    purchaseTime: "09:37",
    invoiceNumber: "FT FC/77821",
    paymentMethod: "MULTIBANCO",
    currency: "EUR",
    confidenceScore: 0.95,
    warrantyEligible: false,
    warrantyExpiryDate: null,
    imagePath: "/demo/farmacia-central.png",
    productImage: null,
    tags: ["health"],
    lineItems: [
      { name: "Paracetamol 1g", qty: 1, unitPrice: 4.95, vatRate: 6 },
      { name: "Vitamina D", qty: 1, unitPrice: 12.4, vatRate: 6 },
      { name: "Creme Hidratante", qty: 1, unitPrice: 13.5, vatRate: 23 },
    ],
  },
  {
    id: "demo-cafe-001",
    vendor: "Cafe A Brasileira",
    category: "Dining",
    purchaseDate: "2026-03-03",
    purchaseTime: "08:21",
    invoiceNumber: "FT AB/19472",
    paymentMethod: "VISA",
    currency: "EUR",
    confidenceScore: 0.91,
    warrantyEligible: false,
    warrantyExpiryDate: null,
    imagePath: "/demo/cafe-a-brasileira.png",
    productImage: null,
    tags: ["dining"],
    lineItems: [
      { name: "Cafe", qty: 2, unitPrice: 1.2, vatRate: 13 },
      { name: "Tosta Mista", qty: 1, unitPrice: 4.8, vatRate: 13 },
      { name: "Sumo Natural", qty: 1, unitPrice: 3.2, vatRate: 13 },
    ],
  },
  {
    id: "demo-galp-001",
    vendor: "Galp",
    category: "Fuel",
    purchaseDate: "2026-02-21",
    purchaseTime: "19:04",
    invoiceNumber: "FT GP/55290",
    paymentMethod: "MASTERCARD",
    currency: "EUR",
    confidenceScore: 0.92,
    warrantyEligible: false,
    warrantyExpiryDate: null,
    imagePath: "/demo/galp.png",
    productImage: null,
    tags: ["fuel"],
    lineItems: [
      { name: "Gasoleo Simples 37.41L", qty: 1, unitPrice: 1.76, vatRate: 23 },
      { name: "Lavagem Premium", qty: 1, unitPrice: 6.5, vatRate: 23 },
    ],
  },
  {
    id: "demo-ikea-001",
    vendor: "IKEA",
    category: "Home",
    purchaseDate: "2026-01-12",
    purchaseTime: "16:55",
    invoiceNumber: "FT IK/44731",
    paymentMethod: "MULTIBANCO",
    currency: "EUR",
    confidenceScore: 0.94,
    warrantyEligible: true,
    warrantyExpiryDate: "2028-01-12",
    imagePath: "/demo/ikea.png",
    productImage: "/demo/ikea.jpg",
    tags: ["home"],
    lineItems: [
      { name: "Candeeiro de Mesa", qty: 1, unitPrice: 24.99, vatRate: 23 },
      { name: "Organizador Gaveta", qty: 3, unitPrice: 5.99, vatRate: 23 },
      { name: "Prateleira KALLAX", qty: 1, unitPrice: 59.99, vatRate: 23 },
    ],
  },
  {
    id: "demo-zara-001",
    vendor: "Zara",
    category: "Fashion",
    purchaseDate: "2026-03-26",
    purchaseTime: "13:11",
    invoiceNumber: "FT ZR/21803",
    paymentMethod: "MB WAY",
    currency: "EUR",
    confidenceScore: 0.9,
    warrantyEligible: true,
    warrantyExpiryDate: "2028-03-26",
    imagePath: "/demo/zara.png",
    productImage: "/demo/zara.jpg",
    tags: ["fashion"],
    lineItems: [
      { name: "Camisa Linho", qty: 1, unitPrice: 35.95, vatRate: 23 },
      { name: "Calcas Slim", qty: 1, unitPrice: 49.95, vatRate: 23 },
    ],
  },
];

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function subtotalForReceipt(receipt: DemoReceiptRecord): number {
  return round2(receipt.lineItems.reduce((sum, item) => sum + item.qty * item.unitPrice, 0));
}

export function vatForReceipt(receipt: DemoReceiptRecord): number {
  const vat = receipt.lineItems.reduce(
    (sum, item) => sum + item.qty * item.unitPrice * (item.vatRate / 100),
    0
  );
  return round2(vat);
}

export function totalForReceipt(receipt: DemoReceiptRecord): number {
  return round2(subtotalForReceipt(receipt) + vatForReceipt(receipt));
}

export function ocrTextForReceipt(receipt: DemoReceiptRecord): string {
  const subtotal = subtotalForReceipt(receipt);
  const vat = vatForReceipt(receipt);
  const total = totalForReceipt(receipt);
  const itemLines = receipt.lineItems
    .map((item) => `${item.qty}x ${item.name} ${round2(item.qty * item.unitPrice).toFixed(2)} EUR`)
    .join("\n");

  return [
    `${receipt.vendor}`,
    `Fatura ${receipt.invoiceNumber}`,
    `Data ${receipt.purchaseDate} Hora ${receipt.purchaseTime}`,
    itemLines,
    `Subtotal ${subtotal.toFixed(2)} EUR`,
    `IVA ${vat.toFixed(2)} EUR`,
    `Total ${total.toFixed(2)} EUR`,
    `Pagamento ${receipt.paymentMethod}`,
    "NIF Cliente: 999999990",
  ].join("\n");
}

export function demoCategorySummary(data: DemoReceiptRecord[]) {
  const map = new Map<string, { count: number; total: number }>();
  for (const receipt of data) {
    const current = map.get(receipt.category) || { count: 0, total: 0 };
    current.count += 1;
    current.total = round2(current.total + totalForReceipt(receipt));
    map.set(receipt.category, current);
  }
  return map;
}

export function demoVendorSummary(data: DemoReceiptRecord[]) {
  const map = new Map<string, { count: number; total: number }>();
  for (const receipt of data) {
    const current = map.get(receipt.vendor) || { count: 0, total: 0 };
    current.count += 1;
    current.total = round2(current.total + totalForReceipt(receipt));
    map.set(receipt.vendor, current);
  }
  return map;
}
