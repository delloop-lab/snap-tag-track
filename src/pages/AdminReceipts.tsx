import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getTagColor } from "@/components/TagInput";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Receipt = {
  id: string;
  user_id: string;
  image_path: string;
  text_content: string | null;
  vendor_name: string | null;
  total_amount: number | null;
  purchase_date: string | null;
  created_at: string;
  updated_at: string;
  warranty: boolean;
  client_name: string | null;
  type: string | null;
  receipt_tags: {
    tags: {
      id: string;
      name: string;
    };
  }[];
  user_email?: string;
  latitude: number | null;
  longitude: number | null;
  location_name: string | null;
  image_url?: string;
};

type ReceiptLineItem = {
  description?: string;
  amount?: number;
};

/** Native selects on dark shell: stop inheriting `text-slate-100` into a light browser control BG. */
const adminShellSelectClass =
  "h-10 rounded-md border border-slate-500 bg-slate-800 px-3 py-2 text-sm text-slate-100 shadow-sm scheme-dark focus:outline-none focus:ring-2 focus:ring-orange-400/40";

/** Search & date Inputs on `/admin/receipts` dark page. */
const adminShellInputClass =
  "border-slate-500 bg-slate-800 text-slate-100 placeholder:text-slate-400 ring-offset-slate-900";

const AdminReceipts = () => {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dateSort, setDateSort] = useState<"newest" | "oldest">("newest");
  const [minTotal, setMinTotal] = useState("");
  const [maxTotal, setMaxTotal] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedClient, setSelectedClient] = useState("");
  const [receiptIdSearch, setReceiptIdSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [foundReceipt, setFoundReceipt] = useState<Receipt | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState("/placeholder.svg");
  const [previewTitle, setPreviewTitle] = useState("Receipt image");
  const navigate = useNavigate();
  const location = useLocation();

  const readLineItems = (value: unknown): ReceiptLineItem[] => {
    if (!Array.isArray(value)) return [];
    return value as ReceiptLineItem[];
  };

  const resolveAdminReceiptImageUrl = async (imagePath?: string | null): Promise<string> => {
    const raw = (imagePath || "").trim();
    if (!raw) return "/placeholder.svg";
    if (/^https?:\/\//i.test(raw)) return raw;

    const candidates = [raw];
    if (raw.startsWith("receipts/")) candidates.push(raw.replace(/^receipts\//, ""));
    else candidates.push(`receipts/${raw}`);

    for (const key of candidates) {
      const { data, error } = await supabase.storage
        .from("receipts")
        .createSignedUrl(key, 60 * 60);
      if (!error && data?.signedUrl) return data.signedUrl;
    }
    return "/placeholder.svg";
  };

  useEffect(() => {
    fetchReceipts();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const receiptId = params.get("receiptId");
    const userId = params.get("userId");
    if (userId) {
      setSelectedUserId(userId);
    }
    if (!receiptId) return;
    setReceiptIdSearch(receiptId);
    void searchReceiptById(receiptId);
  }, [location.search]);

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      // Fetch all receipts with user information
      const { data: receiptsData, error: receiptsError } = await supabase
        .from("receipts")
        .select(`
          *,
          receipt_tags (
            tags (
              id,
              name
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (receiptsError) throw receiptsError;

      // Fetch all users
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, email");

      if (usersError) throw usersError;

      // Create a map of user emails
      const userMap = new Map(usersData?.map(user => [user.id, user.email]) || []);

      // Combine the data
      const combinedData = receiptsData?.map(receipt => ({
        ...receipt,
        user_email: userMap.get(receipt.user_id) || "Unknown user"
      })) || [];
      setReceipts(combinedData);
    } catch (error) {
      console.error("Error fetching receipts:", error);
    } finally {
      setLoading(false);
    }
  };

  const searchReceiptById = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from("receipts")
        .select(`
          *,
          receipt_tags (
            tags (
              id,
              name
            )
          )
        `)
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error searching receipt:", error);
        setFoundReceipt(null);
        return;
      }

      if (data) {
        const imageUrl = await resolveAdminReceiptImageUrl(data.image_path);
        // Get the user email for this receipt
        const { data: userData } = await supabase
          .from("users")
          .select("email")
          .eq("id", data.user_id)
          .single();

        setFoundReceipt({
          ...data,
          user_email: userData?.email || "Unknown user",
          image_url: imageUrl,
        });
      } else {
        setFoundReceipt(null);
      }
    } catch (error) {
      console.error("Error searching receipt:", error);
      setFoundReceipt(null);
    }
  };

  const previewReceiptImage = async (receipt: Receipt) => {
    const resolved = await resolveAdminReceiptImageUrl(receipt.image_path);
    setPreviewTitle(receipt.vendor_name || "Receipt image");
    setPreviewImageUrl(resolved);
    setPreviewOpen(true);
  };

  // Filtering logic
  const filteredReceipts = receipts
    .filter((r) => {
      if (search && r.vendor_name && !r.vendor_name.toLowerCase().includes(search.toLowerCase())) return false;
      if (selectedType && r.type !== selectedType) return false;
      if (selectedClient && r.client_name !== selectedClient) return false;
      if (selectedUserId && r.user_id !== selectedUserId) return false;
      if (dateFrom && (!r.purchase_date || r.purchase_date < dateFrom)) return false;
      if (dateTo && (!r.purchase_date || r.purchase_date > dateTo)) return false;
      if (minTotal && (!r.total_amount || r.total_amount < parseFloat(minTotal))) return false;
      if (maxTotal && (!r.total_amount || r.total_amount > parseFloat(maxTotal))) return false;
      return true;
    })
    .sort((a, b) => {
      const aTime = new Date(a.purchase_date || a.created_at).getTime();
      const bTime = new Date(b.purchase_date || b.created_at).getTime();
      return dateSort === "newest" ? bTime - aTime : aTime - bTime;
    });

  // Get unique clients and types for filters
  const clients = Array.from(new Set(receipts.map(r => r.client_name).filter(Boolean)));
  const types = Array.from(new Set(receipts.map(r => r.type).filter(Boolean)));
  const users = Array.from(
    new Map(
      receipts
        .filter((r) => !!r.user_id)
        .map((r) => [r.user_id, { id: r.user_id, email: r.user_email || "Unknown user" }]),
    ).values(),
  );

  if (loading) {
    return (
      <div className="container mx-auto p-4 text-slate-100">
        <div className="space-y-4">
          <Skeleton className="h-8 w-[200px]" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 text-slate-100">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold text-white">All Receipts</h2>
        <Button
          variant="outline"
          className="w-full border-slate-500 bg-slate-800 text-slate-100 hover:bg-slate-700 hover:text-white sm:w-auto"
          onClick={() => navigate("/admin")}
        >
          Back to Admin
        </Button>
      </div>

      {/* Receipt ID Search */}
      <div className="mb-6">
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          <Input
            placeholder="Search by Receipt ID..."
            value={receiptIdSearch}
            onChange={(e) => setReceiptIdSearch(e.target.value)}
            className={cn("w-full sm:max-w-md", adminShellInputClass)}
          />
          <Button 
            onClick={() => searchReceiptById(receiptIdSearch)}
            disabled={!receiptIdSearch}
          >
            Search
          </Button>
        </div>
        {foundReceipt && (
          <div className="mt-4 p-4 rounded-lg border border-sky-800/60 bg-sky-950/40">
            <h3 className="text-lg font-semibold mb-2 text-white">Found Receipt</h3>
            <img
              src={foundReceipt.image_url || "/placeholder.svg"}
              alt={foundReceipt.vendor_name || "Receipt"}
              className="w-28 h-28 rounded border object-cover mb-3"
            />
            <div className="mb-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(foundReceipt.image_url || "/placeholder.svg", "_blank", "noopener,noreferrer")}
              >
                Open full size
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-slate-400">ID</p>
                <p className="font-medium">{foundReceipt.id}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Owner</p>
                <p className="font-medium">{foundReceipt.user_email}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Vendor</p>
                <p className="font-medium">{foundReceipt.vendor_name || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Date</p>
                <p className="font-medium">
                  {format(new Date(foundReceipt.purchase_date || foundReceipt.created_at), "PPP")}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Total</p>
                <p className="font-medium">
                  {foundReceipt.total_amount ? `$${foundReceipt.total_amount.toFixed(2)}` : "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Type</p>
                <p className="font-medium">{foundReceipt.type || "-"}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-sm text-slate-400">Line items</p>
                {readLineItems(foundReceipt.line_items).length > 0 ? (
                  <ul className="list-disc ml-5">
                    {readLineItems(foundReceipt.line_items).map((li, idx) => (
                      <li key={`${foundReceipt.id}-li-${idx}`} className="text-sm">
                        {li.description || "Item"}
                        {typeof li.amount === "number" ? ` - $${li.amount.toFixed(2)}` : ""}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="font-medium">-</p>
                )}
              </div>
              <div>
                <p className="text-sm text-slate-400">Location</p>
                <div className="font-medium">
                  {foundReceipt.location_name ? (
                    <>
                      <p>{foundReceipt.location_name}</p>
                      {foundReceipt.latitude && foundReceipt.longitude && (
                        <a
                          href={`https://www.openstreetmap.org/?mlat=${foundReceipt.latitude}&mlon=${foundReceipt.longitude}&zoom=15`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          View on Map
                        </a>
                      )}
                    </>
                  ) : (
                    "-"
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Input
          placeholder="Search vendor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={adminShellInputClass}
        />
        <select
          value={selectedClient}
          onChange={(e) => setSelectedClient(e.target.value)}
          className={adminShellSelectClass}
        >
          <option value="">All Clients</option>
          {clients.map((client) => (
            <option key={client} value={client}>{client}</option>
          ))}
        </select>
        <select
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
          className={adminShellSelectClass}
        >
          <option value="">All Users</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.email}
            </option>
          ))}
        </select>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className={adminShellSelectClass}
        >
          <option value="">All Types</option>
          {types.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
        <div className="flex gap-2">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            placeholder="From"
            className={cn("min-w-0 flex-1", adminShellInputClass)}
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            placeholder="To"
            className={cn("min-w-0 flex-1", adminShellInputClass)}
          />
        </div>
        <select
          value={dateSort}
          onChange={(e) => setDateSort(e.target.value as "newest" | "oldest")}
          className={`md:col-span-1 ${adminShellSelectClass}`}
        >
          <option value="newest">Date: Newest first</option>
          <option value="oldest">Date: Oldest first</option>
        </select>
      </div>

      {/* Receipts Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-600 bg-slate-900/50">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-600 hover:bg-transparent">
              <TableHead className="text-slate-300">Receipt ID</TableHead>
              <TableHead className="text-slate-300">Owner Email</TableHead>
              <TableHead className="text-slate-300">Vendor</TableHead>
              <TableHead className="text-slate-300">Date</TableHead>
              <TableHead className="text-slate-300">Total</TableHead>
              <TableHead className="text-slate-300">Type</TableHead>
              <TableHead className="text-slate-300">Client</TableHead>
              <TableHead className="text-slate-300">Location</TableHead>
              <TableHead className="text-slate-300">Line Items</TableHead>
              <TableHead className="text-slate-300">Tags</TableHead>
              <TableHead className="text-slate-300">Warranty</TableHead>
              <TableHead className="text-slate-300">Image</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredReceipts.map((receipt) => (
              <TableRow key={receipt.id} className="border-slate-700/80 hover:bg-slate-800/60">
                <TableCell>{receipt.id}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm text-slate-400">{receipt.user_email}</span>
                  </div>
                </TableCell>
                <TableCell>{receipt.vendor_name || "-"}</TableCell>
                <TableCell>
                  {format(new Date(receipt.purchase_date || receipt.created_at), "PPP")}
                </TableCell>
                <TableCell>
                  {receipt.total_amount ? `$${receipt.total_amount.toFixed(2)}` : "-"}
                </TableCell>
                <TableCell>{receipt.type || "-"}</TableCell>
                <TableCell>{receipt.client_name || "-"}</TableCell>
                <TableCell>
                  {receipt.location_name ? (
                    <div className="flex flex-col">
                      <span className="text-sm">{receipt.location_name}</span>
                      {receipt.latitude && receipt.longitude && (
                        <a
                          href={`https://www.openstreetmap.org/?mlat=${receipt.latitude}&mlon=${receipt.longitude}&zoom=15`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          View on Map
                        </a>
                      )}
                    </div>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell>
                  {readLineItems(receipt.line_items).length > 0 ? (
                    <div className="max-w-[260px] text-xs space-y-1">
                      {readLineItems(receipt.line_items).slice(0, 3).map((li, idx) => (
                        <div key={`${receipt.id}-tbl-li-${idx}`} className="truncate">
                          {li.description || "Item"}
                          {typeof li.amount === "number" ? ` - $${li.amount.toFixed(2)}` : ""}
                        </div>
                      ))}
                      {readLineItems(receipt.line_items).length > 3 && (
                        <div className="text-slate-400">+{readLineItems(receipt.line_items).length - 3} more</div>
                      )}
                    </div>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {receipt.receipt_tags?.map((rt) => (
                      <Badge key={rt.tags.id} variant="outline" className={getTagColor(rt.tags.name)}>
                        {rt.tags.name}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  {receipt.warranty ? (
                    <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Yes</span>
                  ) : (
                    <span className="inline-block px-2 py-1 bg-slate-800 text-slate-300 rounded text-xs">No</span>
                  )}
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-slate-500 bg-slate-950 text-slate-100 hover:bg-slate-800 hover:text-white"
                    onClick={() => previewReceiptImage(receipt)}
                  >
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{previewTitle}</DialogTitle>
            <DialogDescription>Receipt image preview loaded on demand.</DialogDescription>
          </DialogHeader>
          <img
            src={previewImageUrl}
            alt={previewTitle}
            className="w-full max-h-[70vh] object-contain rounded border"
          />
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => window.open(previewImageUrl, "_blank", "noopener,noreferrer")}
            >
              Open full size
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminReceipts; 