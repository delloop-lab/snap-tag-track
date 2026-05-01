import React, { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Tag,
  Clock,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  RotateCcw,
} from "lucide-react";

interface LineItem {
  description: string;
  amount: number;
}

interface ReceiptReviewProps {
  open: boolean;
  vendor: string;
  amount: string;
  date: string;
  currency: string;
  confidence: "high" | "medium" | "low";
  lineItems: LineItem[];
  onVendorChange: (v: string) => void;
  onAmountChange: (v: string) => void;
  onDateChange: (v: string) => void;
  onConfirm: (tagNow: boolean) => void;
  onRescan: () => void;
  onClose: () => void;
  isSaving: boolean;
}

const confidenceConfig = {
  high: {
    label: "High confidence",
    Icon: CheckCircle2,
    className: "bg-green-100 text-green-700",
  },
  medium: {
    label: "Review suggested",
    Icon: AlertTriangle,
    className: "bg-yellow-100 text-yellow-700",
  },
  low: {
    label: "Low confidence — please check all fields",
    Icon: AlertCircle,
    className: "bg-red-100 text-red-700",
  },
};

const ReceiptReview: React.FC<ReceiptReviewProps> = ({
  open,
  vendor,
  amount,
  date,
  currency,
  confidence,
  lineItems,
  onVendorChange,
  onAmountChange,
  onDateChange,
  onConfirm,
  onRescan,
  onClose,
  isSaving,
}) => {
  const [showLineItems, setShowLineItems] = useState(false);
  const { label, Icon, className } =
    confidenceConfig[confidence] ?? confidenceConfig.medium;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isSaving) onClose();
      }}
    >
      <DialogContent
        className="w-full max-w-sm overflow-hidden rounded-2xl border border-slate-600 bg-slate-900 p-0 text-slate-100 shadow-2xl"
      >
        {/* Header */}
        <div className="border-b border-slate-600 px-6 pb-4 pt-6">
          <div className="mb-2 text-xl font-bold text-white">
            Review Receipt
          </div>
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${className}`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </span>
        </div>

        {/* Editable fields */}
        <div className="flex flex-col gap-4 px-6 py-5">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-300">
              Vendor
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-slate-500 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400/50"
              value={vendor}
              onChange={(e) => onVendorChange(e.target.value)}
              disabled={isSaving}
              placeholder="Store or business name"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-300">
                Total ({currency || "?"})
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="w-full rounded-lg border border-slate-500 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400/50"
                value={amount}
                onChange={(e) => onAmountChange(e.target.value)}
                disabled={isSaving}
                placeholder="0.00"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-300">
                Date
              </label>
              <input
                type="date"
                className="w-full rounded-lg border border-slate-500 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400/50"
                value={date}
                onChange={(e) => onDateChange(e.target.value)}
                disabled={isSaving}
              />
            </div>
          </div>

          {lineItems.length > 0 && (
            <div>
              <button
                type="button"
                className="flex items-center gap-1 text-xs font-semibold text-sky-300 hover:text-sky-200"
                onClick={() => setShowLineItems((v) => !v)}
              >
                {showLineItems ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
                {showLineItems ? "Hide" : "Show"} {lineItems.length} line item
                {lineItems.length !== 1 ? "s" : ""}
              </button>
              {showLineItems && (
                <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-slate-600 text-xs divide-y divide-slate-600 bg-slate-800">
                  {lineItems.map((item, i) => (
                    <div
                      key={i}
                      className="flex justify-between px-3 py-1.5 text-slate-200"
                    >
                      <span className="truncate pr-4">{item.description}</span>
                      <span className="font-medium whitespace-nowrap">
                        {currency} {item.amount?.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 border-t border-slate-600 px-6 pb-6 pt-4">
          <button
            className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-500 py-3.5 text-base font-bold text-white shadow transition-all duration-150 hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-60"
            onClick={() => onConfirm(true)}
            disabled={isSaving}
          >
            <Tag className="w-4 h-4" />
            {isSaving ? "Saving..." : "Save & Tag Now"}
          </button>
          <button
            className="flex w-full items-center justify-center gap-2 rounded-full border border-slate-500 bg-slate-800 py-3 text-sm font-semibold text-slate-200 transition-all duration-150 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-60"
            onClick={() => onConfirm(false)}
            disabled={isSaving}
          >
            <Clock className="w-4 h-4" />
            Save & Tag Later
          </button>
          <button
            className="flex w-full items-center justify-center gap-2 rounded-full py-2 text-xs font-medium text-slate-400 transition-all duration-150 hover:text-slate-200 focus:outline-none disabled:opacity-50"
            onClick={onRescan}
            disabled={isSaving}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Re-scan receipt
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReceiptReview;
