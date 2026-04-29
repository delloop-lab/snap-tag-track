import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { resolveReceiptImageUrl } from "@/lib/receiptImageUrl";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imagePath: string | null | undefined;
  title?: string;
};

/** Full-resolution receipt preview (loads on open). */
export function ReceiptImagePreviewDialog({
  open,
  onOpenChange,
  imagePath,
  title = "Receipt",
}: Props) {
  const [fullUrl, setFullUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !imagePath) {
      setFullUrl(null);
      return;
    }
    let cancelled = false;
    void resolveReceiptImageUrl(imagePath).then((u) => {
      if (!cancelled) setFullUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [open, imagePath]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(92vh,940px)] max-w-[min(100vw-2rem,56rem)] overflow-y-auto border-0 bg-background/95 p-4 sm:p-6">
        <DialogHeader className="sr-only">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {!imagePath ? (
          <div className="aspect-[3/4] bg-muted rounded-md" />
        ) : !fullUrl ? (
          <div className="aspect-[3/4] max-h-[min(82vh,880px)] bg-muted animate-pulse rounded-md" />
        ) : (
          <img
            src={fullUrl}
            alt={title}
            className="mx-auto max-h-[min(85vh,900px)] w-auto max-w-full object-contain rounded-md shadow-sm"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
