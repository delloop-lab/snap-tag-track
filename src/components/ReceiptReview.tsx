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
  isSaving,
}) => {
  const [showLineItems, setShowLineItems] = useState(false);
  const { label, Icon, className } =
    confidenceConfig[confidence] ?? confidenceConfig.medium;

  return (
    <Dialog open={open}>
      <DialogContent
        className="max-w-sm w-full flex flex-col gap-0 p-0 bg-white rounded-2xl shadow-2xl overflow-hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="text-xl font-bold text-gray-900 mb-2">
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
        <div className="px-6 py-5 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Vendor
            </label>
            <input
              type="text"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={vendor}
              onChange={(e) => onVendorChange(e.target.value)}
              disabled={isSaving}
              placeholder="Store or business name"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Total ({currency || "?"})
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={amount}
                onChange={(e) => onAmountChange(e.target.value)}
                disabled={isSaving}
                placeholder="0.00"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Date
              </label>
              <input
                type="date"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
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
                <div className="mt-2 border border-gray-100 rounded-lg divide-y divide-gray-100 text-xs max-h-40 overflow-y-auto">
                  {lineItems.map((item, i) => (
                    <div
                      key={i}
                      className="flex justify-between px-3 py-1.5 text-gray-700"
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
        <div className="px-6 pb-6 flex flex-col gap-2 border-t border-gray-100 pt-4">
          <button
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white text-base font-bold py-3.5 rounded-full shadow transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-green-400 w-full disabled:opacity-60"
            onClick={() => onConfirm(true)}
            disabled={isSaving}
          >
            <Tag className="w-4 h-4" />
            {isSaving ? "Saving..." : "Save & Tag Now"}
          </button>
          <button
            className="flex items-center justify-center gap-2 border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm font-semibold py-3 rounded-full transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-gray-200 w-full disabled:opacity-60"
            onClick={() => onConfirm(false)}
            disabled={isSaving}
          >
            <Clock className="w-4 h-4" />
            Save & Tag Later
          </button>
          <button
            className="flex items-center justify-center gap-2 text-gray-400 hover:text-gray-600 text-xs font-medium py-2 rounded-full transition-all duration-150 focus:outline-none w-full disabled:opacity-50"
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
