import React, { useEffect, useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format, addYears, isValid } from "date-fns";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { useLocation, useNavigate } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle, ChevronDown, ChevronUp, Loader2, ShieldCheck, Tag, X, Printer } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { getTagColor } from "./TagInput";

// Tag color palette
const tagColors = [
  'bg-blue-200 text-blue-800',
  'bg-green-200 text-green-800',
  'bg-yellow-200 text-yellow-800',
  'bg-purple-200 text-purple-800',
  'bg-pink-200 text-pink-800',
  'bg-red-200 text-red-800',
  'bg-indigo-200 text-indigo-800',
  'bg-teal-200 text-teal-800',
  'bg-orange-200 text-orange-800',
];

interface Tag {
  id: string;
  name: string;
}

interface ReceiptTag {
  tag_id: string;
  tags: Tag;
}

interface Receipt {
  id: string;
  receipt_tags: ReceiptTag[];
  vendor_name: string | null;
  purchase_date: string | null;
  total_amount: number | null;
  type: string | null;
  client_name: string | null;
  notes: string | null;
  warranty: boolean;
  image_path: string | null;
  text_content: string | null;
  created_at: string;
  updated_at: string;
}

const ReceiptSummaryList = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [imageUrls, setImageUrls] = useState<{ [key: string]: string }>({});
  const [loadingImages, setLoadingImages] = useState<{ [key: string]: boolean }>({});
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [minTotal, setMinTotal] = useState("");
  const [maxTotal, setMaxTotal] = useState("");
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [tagNames, setTagNames] = useState<string[]>([]);
  const [modalText, setModalText] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("Extracted Text");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedClient, setSelectedClient] = useState("");
  const [showWarrantyOnly, setShowWarrantyOnly] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [imageLoaded, setImageLoaded] = useState<{ [key: string]: boolean }>({});
  const [showMobileBanner, setShowMobileBanner] = useState(true);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchDeltaX, setTouchDeltaX] = useState(0);
  const [loading, setLoading] = useState(true);

  // Get the highlight ID from URL query params
  const highlightId = new URLSearchParams(location.search).get("highlight");

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const fetchData = async () => {
      const { data: receiptsData } = await supabase
        .from("receipts")
        .select("*, receipt_tags(tag_id, tags:tag_id(id, name))")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      const { data: tagsData } = await supabase
        .from("tags")
        .select("*")
        .eq("user_id", user.id);

      setReceipts(receiptsData || []);
      setAllTags(tagsData || []);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isMobile) setShowMobileBanner(true);
  }, [isMobile]);

  // Get unique client names from receipts for client filter
  const clients = Array.from(new Set(receipts.map(r => r.client_name).filter(Boolean)));
  clients.sort();

  // Get unique tags from receipts for tag filter (case-insensitive, lowercase)
  const tagNameSet = new Set();
  receipts.forEach(r => {
    (r.receipt_tags || []).forEach(rt => {
      if (rt.tags && rt.tags.name) {
        tagNameSet.add(rt.tags.name.toLowerCase());
      }
    });
  });
  const uniqueTagNames = Array.from(tagNameSet);
  uniqueTagNames.sort();

  // Get unique notes from receipts for notes filter
  const uniqueNotes = Array.from(new Set(receipts.map(r => r.notes).filter(Boolean)));
  uniqueNotes.sort();

  // Filtering logic
  const filteredReceipts = receipts.filter((r) => {
    if (search && r.vendor_name && !r.vendor_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (selectedType && r.type !== selectedType) return false;
    if (selectedClient && r.client_name !== selectedClient) return false;
    if (selectedYear && (!r.purchase_date || !r.purchase_date.startsWith(selectedYear))) return false;
    if (dateFrom && (!r.purchase_date || r.purchase_date < dateFrom)) return false;
    if (dateTo && (!r.purchase_date || r.purchase_date > dateTo)) return false;
    if (minTotal && (!r.total_amount || r.total_amount < parseFloat(minTotal))) return false;
    if (maxTotal && (!r.total_amount || r.total_amount > parseFloat(maxTotal))) return false;
    if (selectedTags.length > 0) {
      const receiptTagNames = (r.receipt_tags || []).map(rt => rt.tags?.name?.toLowerCase());
      if (!selectedTags.every(tag => 
        receiptTagNames.includes(tag.name.toLowerCase())
      )) return false;
    }
    if (showWarrantyOnly && !r.warranty) return false;
    return true;
  });

  // Calculate total for filtered receipts
  const totalFiltered = filteredReceipts.reduce((sum, r) => sum + (r.total_amount || 0), 0);

  // Get unique years from receipts for year filter
  const years = Array.from(new Set(receipts.map(r => r.purchase_date && r.purchase_date.slice(0, 4)).filter(Boolean)));
  years.sort((a, b) => b.localeCompare(a));

  // Determine if we should show the Warranty End Date column
  const showWarrantyEndDate = showWarrantyOnly || filteredReceipts.some(r => r.warranty);

  const handleTagFilter = (tagName: string) => {
    const tag: Tag = { id: Date.now().toString(), name: tagName };
    setSelectedTags((prev) => {
      const tagNameLower = tagName.toLowerCase();
      return prev.some(t => t.name.toLowerCase() === tagNameLower)
        ? prev.filter(t => t.name.toLowerCase() !== tagNameLower)
        : [...prev, tag];
    });
  };

  const removeTagFilter = (tagId: string) => {
    setSelectedTags(prev => prev.filter(t => t.id !== tagId));
  };

  const handleViewText = (text) => {
    setModalText(text);
    setModalTitle("Extracted Text");
    setShowModal(true);
  };

  const handleViewNotes = (notes) => {
    setModalText(notes || "No notes");
    setModalTitle("Notes");
    setShowModal(true);
  };

  const CHART_COLORS = ["#f97316","#3b82f6","#22c55e","#a855f7","#ec4899","#14b8a6","#eab308","#ef4444"];

  const monthlyData = useMemo(() => {
    const map: Record<string, number> = {};
    receipts.forEach(r => {
      if (!r.purchase_date || !r.total_amount) return;
      const key = r.purchase_date.slice(0, 7);
      map[key] = (map[key] || 0) + r.total_amount;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, total]) => ({ month: month.replace(/^(\d{4})-(\d{2})$/, (_, y, m) => `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][+m-1]} ${y.slice(2)}`), total: parseFloat(total.toFixed(2)) }));
  }, [receipts]);

  const tagSpendData = useMemo(() => {
    const map: Record<string, number> = {};
    receipts.forEach(r => {
      (r.receipt_tags || []).forEach(rt => {
        if (rt.tags?.name && r.total_amount) {
          map[rt.tags.name] = (map[rt.tags.name] || 0) + r.total_amount;
        }
      });
    });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }));
  }, [receipts]);

  if (isMobile) {
    return (
      <div className="pt-1 px-2">
        {showMobileBanner && (
          <div
            className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-2 text-center relative"
            onTouchStart={e => setTouchStartX(e.touches[0].clientX)}
            onTouchMove={e => {
              if (touchStartX !== null) {
                setTouchDeltaX(e.touches[0].clientX - touchStartX);
              }
            }}
            onTouchEnd={() => {
              if (touchDeltaX < -50) setShowMobileBanner(false); // swipe left
              setTouchStartX(null);
              setTouchDeltaX(0);
            }}
            style={{ transform: touchDeltaX < 0 ? `translateX(${touchDeltaX}px)` : undefined, transition: 'transform 0.2s' }}
          >
            <p className="text-yellow-800 text-sm">
              For the best experience, we recommend viewing the receipt summary on a larger screen.<br />
              You can still view and filter your receipts here, but some features may be limited.
            </p>
          </div>
        )}
        <h2 className="text-xl font-bold mb-2 text-center">Receipt Summary</h2>
        {/* Summary stats */}
        <div className="flex gap-3 overflow-x-auto pb-2 mb-4 snap-x">
          <div className="min-w-[140px] bg-blue-50 rounded-lg p-3 flex flex-col items-center justify-center snap-center">
            <div className="text-xs text-muted-foreground">Total Spent</div>
            <div className="text-lg font-bold">${totalFiltered.toFixed(2)}</div>
          </div>
          <div className="min-w-[140px] bg-green-50 rounded-lg p-3 flex flex-col items-center justify-center snap-center">
            <div className="text-xs text-muted-foreground">Receipts</div>
            <div className="text-lg font-bold">{filteredReceipts.length}</div>
          </div>
          <button
            type="button"
            className={`min-w-[140px] rounded-lg p-3 flex flex-col items-center justify-center snap-center border-2 transition-colors ${showWarrantyOnly ? 'border-green-600 bg-green-200' : 'bg-yellow-50 border-transparent'}`}
            onClick={() => setShowWarrantyOnly(v => !v)}
            aria-pressed={showWarrantyOnly}
            title="Show only receipts with warranty"
          >
            <div className="text-xs text-muted-foreground">Warranty</div>
            <div className="text-lg font-bold">{filteredReceipts.filter(r => r.warranty).length}</div>
          </button>
        </div>
        {/* Filters */}
        <Button variant="outline" className="w-full mb-3 flex items-center justify-between" onClick={() => setShowFiltersMobile(v => !v)}>
          Filters {showFiltersMobile ? <ChevronUp className="ml-2 w-4 h-4" /> : <ChevronDown className="ml-2 w-4 h-4" />}
        </Button>
        {showFiltersMobile && (
          <div className="bg-muted/50 rounded-lg p-3 mb-4 space-y-3">
            <Input placeholder="Search vendor..." value={search} onChange={e => setSearch(e.target.value)} className="w-full" />
            <select 
              value={selectedClient} 
              onChange={e => setSelectedClient(e.target.value)} 
              className="w-full border rounded px-2 py-1"
            >
              <option value="">All Clients</option>
              {clients.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select 
              value={selectedType} 
              onChange={e => setSelectedType(e.target.value)} 
              className="w-full border rounded px-2 py-1"
            >
              <option value="">All Types</option>
              <option value="Personal">Personal</option>
              <option value="Business">Business</option>
            </select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full flex justify-between items-center">
                  {selectedTags.length === 0 ? "Filter by tags" : selectedTags.map(tag => tag.name).join(", ")}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[200px]">
                {uniqueTagNames.map((tagName: string, idx: number) => (
                  <DropdownMenuCheckboxItem
                    key={tagName}
                    checked={selectedTags.some(t => t.name.toLowerCase() === tagName.toLowerCase())}
                    onCheckedChange={() => handleTagFilter(tagName)}
                    className="flex items-center gap-2"
                  >
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${getTagColor(tagName)}`}>
                      {tagName}
                    </span>
                  </DropdownMenuCheckboxItem>
                ))}
                {uniqueTagNames.length === 0 && (
                  <DropdownMenuCheckboxItem disabled>No tags available</DropdownMenuCheckboxItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
        {/* Loading state */}
        {loading ? (
          <div className="flex flex-col gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow p-3 flex flex-col gap-2">
                <div className="flex items-start gap-3">
                  {/* No image skeleton in mobile */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Skeleton className="h-8 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : receipts.length === 0 ? (
          <div className="text-center text-muted-foreground py-10 text-lg">
            There Are No Receipts to Show
          </div>
        ) : filteredReceipts.length === 0 ? (
          <div className="text-center text-muted-foreground py-10 text-lg">
            There Are No Receipts to Show
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredReceipts.map(r => (
              <div key={r.id} className="bg-white rounded-lg shadow p-2 flex flex-col gap-1 transition-all duration-300 cursor-pointer"
                onClick={() => setExpanded(e => ({ ...e, [r.id]: !e[r.id] }))}
              >
                <div className="flex items-start gap-2 justify-between">
                  {/* No image in mobile summary */}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{r.vendor_name || "Unknown Vendor"}</div>
                    <div className="text-xs text-muted-foreground truncate">{r.purchase_date ? format(new Date(r.purchase_date), 'MMM d, yyyy') : "No date"}</div>
                    <div className="font-bold mt-1 text-xs">{r.total_amount != null ? `$${r.total_amount.toFixed(2)}` : "-"}</div>
                    {r.warranty && <span className="inline-flex items-center gap-1 text-green-700 bg-green-100 rounded px-2 py-0.5 text-xs mt-1"><ShieldCheck className="w-3 h-3" /> Warranty</span>}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(r.receipt_tags || []).map((rt: ReceiptTag) => rt.tags && (
                        <Badge key={rt.tags.id} variant="outline" className={`text-xs ${getTagColor(rt.tags.name)}`}>
                          {rt.tags.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button 
                    size={expanded[r.id] ? "sm" : "sm"}
                    variant="outline" 
                    className={expanded[r.id] ? "text-base ml-2" : "text-xs ml-2"}
                    onClick={e => {
                      e.stopPropagation();
                      sessionStorage.setItem('scrollPosition', window.scrollY.toString());
                      navigate(`/receipt/${r.id}`, { state: { fromSummary: true } });
                    }}
                  >
                    Show Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Receipt Summary</h2>
      <div className="flex flex-wrap gap-3 md:gap-4 items-center mb-4 sticky top-0 z-20 bg-white border-b border-gray-200 py-2">
        <Input placeholder="Search vendor..." value={search} onChange={e => setSearch(e.target.value)} className="w-40 min-w-[140px]" />
        <div className="flex items-center gap-1">
          <select value={selectedType} onChange={e => setSelectedType(e.target.value)} className="border rounded px-2 py-1 w-36 min-w-[120px]">
            <option value="">All Types</option>
            <option value="Personal">Personal</option>
            <option value="Business">Business</option>
          </select>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="ml-1 cursor-pointer text-muted-foreground"><HelpCircle size={16} /></span>
              </TooltipTrigger>
              <TooltipContent>Choose whether this is a personal or business receipt.</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex items-center gap-1">
          <select 
            value={selectedClient} 
            onChange={e => setSelectedClient(e.target.value)} 
            className="border rounded px-2 py-1 w-36 min-w-[120px]"
          >
            <option value="">All Clients</option>
            {clients.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="ml-1 cursor-pointer text-muted-foreground"><HelpCircle size={16} /></span>
              </TooltipTrigger>
              <TooltipContent>Select a client for business receipts.</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="border rounded px-2 py-1 w-28 min-w-[100px]">
          <option value="">All Years</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <div className="flex gap-2 items-center">
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-36 min-w-[120px]" />
          <span className="text-muted-foreground text-xs">to</span>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-36 min-w-[120px]" />
        </div>
        <div className="flex items-center gap-1">
          <Input type="number" placeholder="Min total" value={minTotal} onChange={e => setMinTotal(e.target.value)} className="w-28 min-w-[90px]" />
          <span className="text-muted-foreground text-xs">to</span>
          <Input type="number" placeholder="Max total" value={maxTotal} onChange={e => setMaxTotal(e.target.value)} className="w-28 min-w-[90px]" />
        </div>
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full flex justify-between items-center">
                {selectedTags.length === 0 ? "Filter by tags" : selectedTags.map(tag => tag.name).join(", ")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[200px]">
              {uniqueTagNames.map((tagName: string, idx: number) => (
                <DropdownMenuCheckboxItem
                  key={tagName}
                  checked={selectedTags.some(t => t.name.toLowerCase() === tagName.toLowerCase())}
                  onCheckedChange={() => handleTagFilter(tagName)}
                  className="flex items-center gap-2"
                >
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${getTagColor(tagName)}`}>
                    {tagName}
                  </span>
                </DropdownMenuCheckboxItem>
              ))}
              {uniqueTagNames.length === 0 && (
                <DropdownMenuCheckboxItem disabled>No tags available</DropdownMenuCheckboxItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="ml-1 cursor-pointer text-muted-foreground"><HelpCircle size={16} /></span>
              </TooltipTrigger>
              <TooltipContent>Tags help you categorize and filter receipts (e.g., Power, Water, Gas, etc.).</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant={showWarrantyOnly ? "default" : "outline"}
            onClick={() => setShowWarrantyOnly(v => !v)}
            className="h-9 min-w-[160px] mt-2 md:mt-0"
          >
            {showWarrantyOnly ? "Showing Warranty Only" : "Show Warranty Only"}
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="ml-1 cursor-pointer text-muted-foreground"><HelpCircle size={16} /></span>
              </TooltipTrigger>
              <TooltipContent>Show only receipts with a warranty. Warranty end date is purchase date + 3 years.</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button
            variant="default"
            className="h-9 min-w-[120px] mt-2 md:mt-0 ml-2 bg-blue-600 hover:bg-blue-700 text-white font-bold"
            onClick={() => window.print()}
          >
            <Printer className="w-4 h-4 mr-2" /> Print
          </Button>
        </div>
      </div>
      <div className="mb-4 text-lg font-semibold">
        Total for filtered receipts: <span className="text-primary">${totalFiltered.toFixed(2)}</span>
      </div>

      {/* Charts */}
      {receipts.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
          {/* Monthly spend bar chart */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Monthly Spend</h3>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthlyData} margin={{ top: 0, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <RechartTooltip formatter={(v: number) => [`${v.toFixed(2)}`, "Spend"]} />
                  <Bar dataKey="total" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-400 text-center py-10">Not enough data yet</p>
            )}
          </div>

          {/* Spend by tag donut */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Spend by Tag</h3>
            {tagSpendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={tagSpendData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {tagSpendData.map((_, idx) => (
                      <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartTooltip formatter={(v: number) => [`${v.toFixed(2)}`, "Spend"]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-400 text-center py-10">Tag receipts to see breakdown</p>
            )}
          </div>
        </div>
      )}

      {filteredReceipts.length === 0 ? (
        <div className="text-center text-muted-foreground py-10 text-lg">
          There Are No Receipts to Show
        </div>
      ) : (
        <div className="overflow-x-auto w-full">
          <table className="min-w-full border text-xs md:text-sm">
            <thead>
              <tr className="bg-muted">
                <th className="p-1 md:p-2 border">Vendor</th>
                <th className="p-1 md:p-2 border">Date</th>
                <th className="p-1 md:p-2 border">Total</th>
                <th className="p-1 md:p-2 border">Type</th>
                <th className="p-1 md:p-2 border">Client</th>
                <th className="p-1 md:p-2 border">Tags</th>
                <th className="p-1 md:p-2 border">Warranty</th>
                {showWarrantyEndDate && <th className="p-1 md:p-2 border">Warranty End Date</th>}
                <th className="p-1 md:p-2 border">Image</th>
                <th className="p-1 md:p-2 border">Text</th>
                <th className="p-1 md:p-2 border">Notes</th>
              </tr>
            </thead>
            <tbody>
              {filteredReceipts.map(r => (
                <tr 
                  key={r.id}
                  className={highlightId === r.id ? "bg-blue-50 cursor-pointer" : "cursor-pointer"}
                  onClick={() => navigate(`/receipt/${r.id}`)}
                >
                  <td className="p-1 md:p-2 border">{r.vendor_name || "-"}</td>
                  <td className="p-1 md:p-2 border">{r.purchase_date ? format(new Date(r.purchase_date), "PPP") : "-"}</td>
                  <td className="p-1 md:p-2 border">{r.total_amount != null ? `$${r.total_amount.toFixed(2)}` : "-"}</td>
                  <td className="p-1 md:p-2 border">{r.type || "-"}</td>
                  <td className="p-1 md:p-2 border">{r.client_name || "-"}</td>
                  <td className="p-1 md:p-2 border">
                    {(r.receipt_tags || []).map((rt: ReceiptTag) => rt.tags && (
                      <Badge key={rt.tags.id} variant="outline" className={`text-xs ${getTagColor(rt.tags.name)}`}>
                        {rt.tags.name}
                      </Badge>
                    ))}
                  </td>
                  <td className="p-1 md:p-2 border text-center">
                    {r.warranty ? <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Yes</span> : <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">No</span>}
                  </td>
                  {showWarrantyEndDate && (
                    <td className="p-1 md:p-2 border text-center">
                      {r.warranty && r.purchase_date && isValid(new Date(r.purchase_date))
                        ? format(addYears(new Date(r.purchase_date), 3), "PPP")
                        : "-"}
                    </td>
                  )}
                  <td className="p-1 md:p-2 border">
                    <Button size="sm" variant="outline" onClick={async () => {
                      if (r.image_path) {
                        const { data } = await supabase.storage.from('receipts').createSignedUrl(r.image_path, 60 * 60);
                        if (data?.signedUrl) window.open(data.signedUrl, '_blank');
                      }
                    }}>View Image</Button>
                  </td>
                  <td className="p-1 md:p-2 border">
                    <Button size="sm" variant="outline" onClick={() => handleViewText(r.text_content || "No text extracted")}>View Text</Button>
                  </td>
                  <td className="p-1 md:p-2 border">
                    {r.notes ? (
                      <Button size="sm" variant="outline" onClick={() => handleViewNotes(r.notes)}>View Notes</Button>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg max-w-lg w-full">
            <h3 className="text-lg font-bold mb-2">{modalTitle}</h3>
            <pre className="whitespace-pre-wrap max-h-96 overflow-y-auto mb-4">{modalText}</pre>
            <Button onClick={() => setShowModal(false)}>Close</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceiptSummaryList; 