/**
 * Standalone mock of /summary (desktop + mobile) for advert screenshots. Not linked anywhere.
 * URL: /ad-summary-mock · Delete page + route + App chrome exception when finished.
 */

import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { format, addYears, isValid } from "date-fns";
import { HelpCircle, Printer, RefreshCcw, ChevronDown, ChevronUp, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { getTagColor } from "@/components/TagInput";

const VENDORS = ["Intermarché", "Leroy Merlin", "Continente", "Bricomarché", "Max Mat", "Galp"] as const;

const CATEGORY_CYCLE = ["Hardware", "Food", "Paint", "Tiles", "Fuel"] as const;

const AMOUNTS = [
  47.89, 118.32, 31.45, 67.12, 23.75, 95.06, 42.31, 88.94, 55.58, 120.54, 71.03, 29.91, 102.67, 36.84,
  84.41,
];

const DATES_ISO = [
  "2026-03-06",
  "2026-02-18",
  "2026-04-02",
  "2026-01-29",
  "2026-04-21",
  "2026-02-05",
  "2026-03-27",
  "2026-01-14",
  "2026-04-09",
  "2026-03-02",
  "2026-02-22",
  "2026-04-26",
  "2026-01-07",
  "2026-03-19",
  "2026-02-11",
];

const CHART_COLORS = [
  "#f97316",
  "#3b82f6",
  "#22c55e",
  "#a855f7",
  "#ec4899",
  "#14b8a6",
  "#eab308",
  "#ef4444",
];

type MockReceipt = {
  id: string;
  vendor_name: string;
  purchase_date: string;
  total_amount: number;
  type: string;
  client_name: string;
  tag: string;
  warranty: boolean;
  notesHint: boolean;
};

type FilterTag = { id: string; name: string };

const MOCK_RECEIPTS: MockReceipt[] = (() => {
  let catIdx = 0;
  return AMOUNTS.map((amount, i) => {
    const vendor = VENDORS[i % VENDORS.length];
    const isLeroy = vendor === "Leroy Merlin";
    const tag = isLeroy ? "Warranty only" : CATEGORY_CYCLE[catIdx++ % CATEGORY_CYCLE.length];
    return {
      id: `ad-mock-${i}`,
      vendor_name: vendor,
      purchase_date: DATES_ISO[i]!,
      total_amount: amount,
      type: i % 2 === 0 ? "Personal" : "Business",
      client_name:
        i % 2 === 0 ? "-" : i % 4 === 1 ? "Casa Norte Lda" : "Algarve Build",
      tag,
      warranty: isLeroy,
      notesHint: i % 5 === 0,
    };
  });
})();

const MOBILE_BREAKPOINT_PX = 768;

function buildTagSpendData(rows: MockReceipt[]) {
  const map: Record<string, number> = {};
  rows.forEach((r) => {
    map[r.tag] = (map[r.tag] || 0) + r.total_amount;
  });
  return Object.entries(map)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }));
}

function buildMonthlyData(rows: MockReceipt[]) {
  const map: Record<string, number> = {};
  rows.forEach((r) => {
    const key = r.purchase_date.slice(0, 7);
    map[key] = (map[key] || 0) + r.total_amount;
  });
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, total]) => ({
      month: month.replace(/^(\d{4})-(\d{2})$/, (_, y, m) =>
        `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][+m - 1]} ${y.slice(2)}`,
      ),
      total: parseFloat(total.toFixed(2)),
    }));
}

export default function AdSummaryMock() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT_PX,
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT_PX);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const clients = useMemo(() => {
    const s = Array.from(new Set(MOCK_RECEIPTS.map((r) => r.client_name).filter(Boolean)));
    s.sort();
    return s;
  }, []);

  const uniqueTagNames = useMemo(() => {
    const names = Array.from(new Set(MOCK_RECEIPTS.map((r) => r.tag)));
    names.sort((a, b) => a.localeCompare(b));
    return names;
  }, []);

  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedTags, setSelectedTags] = useState<FilterTag[]>([]);
  const [showWarrantyOnly, setShowWarrantyOnly] = useState(false);
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const handleTagFilter = (tagName: string) => {
    const tl = tagName.toLowerCase();
    setSelectedTags((prev) => {
      if (prev.some((t) => t.name.toLowerCase() === tl)) {
        return prev.filter((t) => t.name.toLowerCase() !== tl);
      }
      const tag: FilterTag = { id: `${tagName}-${prev.length}`, name: tagName };
      return [...prev, tag];
    });
  };

  const filteredReceipts = useMemo(() => {
    return MOCK_RECEIPTS.filter((r) => {
      if (search.trim() && r.vendor_name && !r.vendor_name.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      if (selectedType && r.type !== selectedType) return false;
      if (selectedClient && r.client_name !== selectedClient) return false;
      if (selectedTags.length > 0) {
        const receiptTagLower = [r.tag.toLowerCase()];
        if (!selectedTags.every((t) => receiptTagLower.includes(t.name.toLowerCase()))) {
          return false;
        }
      }
      if (showWarrantyOnly && !r.warranty) return false;
      return true;
    });
  }, [search, selectedClient, selectedType, selectedTags, showWarrantyOnly]);

  const totalFiltered = useMemo(
    () => filteredReceipts.reduce((s, r) => s + r.total_amount, 0),
    [filteredReceipts],
  );

  /** Full-set spend by tag — matches ReceiptSummaryList (pie uses `receipts`, not filtered). */
  const tagSpendDataFull = useMemo(() => buildTagSpendData(MOCK_RECEIPTS), []);
  const monthlyDataFull = useMemo(() => buildMonthlyData(MOCK_RECEIPTS), []);

  const showWarrantyEndDate = MOCK_RECEIPTS.some((r) => r.warranty);

  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="pt-1 px-2">
          <h2 className="text-xl font-bold mb-2 text-center">Receipt Summary</h2>

          {MOCK_RECEIPTS.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm mb-3">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 text-center md:text-left">
                Spend by Tag
              </h3>
              {tagSpendDataFull.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={tagSpendDataFull}
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={78}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {tagSpendDataFull.map((_, idx) => (
                        <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartTooltip formatter={(v: number) => [`${v.toFixed(2)}`, "Spend"]} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-400 text-center py-6">Tag receipts to see breakdown</p>
              )}
            </div>
          )}

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
              className={`min-w-[140px] rounded-lg p-3 flex flex-col items-center justify-center snap-center border-2 transition-colors ${
                showWarrantyOnly ? "border-green-600 bg-green-200" : "bg-yellow-50 border-transparent"
              }`}
              onClick={() => setShowWarrantyOnly((v) => !v)}
              aria-pressed={showWarrantyOnly}
              title="Show only receipts with warranty"
            >
              <div className="text-xs text-muted-foreground">Warranty</div>
              <div className="text-lg font-bold">{filteredReceipts.filter((r) => r.warranty).length}</div>
            </button>
          </div>

          <Button
            variant="outline"
            className="w-full mb-3 flex items-center justify-between"
            type="button"
            onClick={() => setShowFiltersMobile((v) => !v)}
          >
            Filters {showFiltersMobile ? <ChevronUp className="ml-2 w-4 h-4" /> : <ChevronDown className="ml-2 w-4 h-4" />}
          </Button>
          {showFiltersMobile && (
            <div className="bg-muted/50 rounded-lg p-3 mb-4 space-y-3">
              <Input
                placeholder="Search vendor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full"
              />
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="w-full border rounded px-2 py-1"
              >
                <option value="">All Clients</option>
                {clients.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full border rounded px-2 py-1"
              >
                <option value="">All Types</option>
                <option value="Personal">Personal</option>
                <option value="Business">Business</option>
              </select>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full flex justify-between items-center">
                    {selectedTags.length === 0 ? "Filter by tags" : selectedTags.map((t) => t.name).join(", ")}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[200px]">
                  {uniqueTagNames.map((tagName) => (
                    <DropdownMenuCheckboxItem
                      key={tagName}
                      checked={selectedTags.some((t) => t.name.toLowerCase() === tagName.toLowerCase())}
                      onCheckedChange={() => handleTagFilter(tagName)}
                      className="flex items-center gap-2"
                    >
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${getTagColor(tagName)}`}
                      >
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

          {filteredReceipts.length === 0 ? (
            <div className="text-center text-muted-foreground py-10 text-lg">
              There Are No Receipts to Show
            </div>
          ) : (
            <div className="flex flex-col gap-3 pb-8">
              {filteredReceipts.map((r) => (
                <div
                  key={r.id}
                  className="bg-white rounded-lg shadow p-2 flex flex-col gap-1 transition-all duration-300 cursor-pointer"
                  onClick={() =>
                    setExpanded((e) => ({
                      ...e,
                      [r.id]: !e[r.id],
                    }))
                  }
                >
                  <div className="flex items-start gap-2 justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{r.vendor_name || "Unknown Vendor"}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {r.purchase_date ? format(new Date(`${r.purchase_date}T12:00:00`), "MMM d, yyyy") : "No date"}
                      </div>
                      <div className="font-bold mt-1 text-xs">${r.total_amount.toFixed(2)}</div>
                      {r.warranty && (
                        <span className="inline-flex items-center gap-1 text-green-700 bg-green-100 rounded px-2 py-0.5 text-xs mt-1">
                          <ShieldCheck className="w-3 h-3" /> Warranty
                        </span>
                      )}
                      <div className="flex flex-wrap gap-1 mt-1">
                        <Badge variant="outline" className={`text-xs ${getTagColor(r.tag)}`}>
                          {r.tag}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className={expanded[r.id] ? "text-base ml-2" : "text-xs ml-2"}
                      type="button"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Show Details
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="text-xs ml-2"
                      type="button"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Edit
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4">
        <h2 className="text-2xl font-bold mb-4">Receipt Summary</h2>
        <div className="flex flex-wrap gap-3 md:gap-4 items-center mb-4 sticky top-0 z-20 bg-white border-b border-gray-200 py-2">
          <Input
            readOnly
            placeholder="Search vendor..."
            defaultValue=""
            className="w-40 min-w-[140px] pointer-events-none bg-white"
            tabIndex={-1}
            aria-hidden
          />
          <div className="flex items-center gap-1">
            <select
              defaultValue=""
              className="border rounded px-2 py-1 w-36 min-w-[120px] bg-white pointer-events-none"
              tabIndex={-1}
              aria-hidden
            >
              <option value="">All Types</option>
              <option value="Personal">Personal</option>
              <option value="Business">Business</option>
            </select>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="ml-1 text-muted-foreground">
                    <HelpCircle size={16} />
                  </span>
                </TooltipTrigger>
                <TooltipContent>Choose whether this is a personal or business receipt.</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-center gap-1">
            <select
              defaultValue=""
              className="border rounded px-2 py-1 w-36 min-w-[120px] bg-white pointer-events-none"
              tabIndex={-1}
              aria-hidden
            >
              <option value="">All Clients</option>
            </select>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="ml-1 text-muted-foreground">
                    <HelpCircle size={16} />
                  </span>
                </TooltipTrigger>
                <TooltipContent>Select a client for business receipts.</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <select
            defaultValue=""
            className="border rounded px-2 py-1 w-28 min-w-[100px] bg-white pointer-events-none"
            tabIndex={-1}
            aria-hidden
          >
            <option value="">All Years</option>
            <option value="2026">2026</option>
          </select>
          <div className="flex gap-2 items-center">
            <Input
              type="date"
              readOnly
              defaultValue=""
              className="w-36 min-w-[120px] pointer-events-none bg-white"
              tabIndex={-1}
              aria-hidden
            />
            <span className="text-muted-foreground text-xs">to</span>
            <Input
              type="date"
              readOnly
              defaultValue=""
              className="w-36 min-w-[120px] pointer-events-none bg-white"
              tabIndex={-1}
              aria-hidden
            />
          </div>
          <div className="flex items-center gap-1">
            <Input
              type="number"
              readOnly
              placeholder="Min total"
              className="w-28 min-w-[90px] pointer-events-none bg-white"
              tabIndex={-1}
              aria-hidden
            />
            <span className="text-muted-foreground text-xs">to</span>
            <Input
              type="number"
              readOnly
              placeholder="Max total"
              className="w-28 min-w-[90px] pointer-events-none bg-white"
              tabIndex={-1}
              aria-hidden
            />
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" className="min-w-[140px] justify-between pointer-events-none" tabIndex={-1}>
              Filter by tags
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="ml-1 text-muted-foreground">
                    <HelpCircle size={16} />
                  </span>
                </TooltipTrigger>
                <TooltipContent>Tags help you categorize and filter receipts (e.g., Power, Water, Gas, etc.).</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            <Button variant="outline" className="h-9 min-w-[160px] mt-2 md:mt-0 pointer-events-none" tabIndex={-1}>
              Show Warranty Only
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="ml-1 text-muted-foreground">
                    <HelpCircle size={16} />
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  Show only receipts with a warranty. Warranty end date is purchase date + 3 years.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button
              variant="default"
              className="h-9 min-w-[120px] mt-2 md:mt-0 ml-2 bg-blue-600 hover:bg-blue-700 text-white font-bold pointer-events-none opacity-95"
              tabIndex={-1}
            >
              <Printer className="w-4 h-4 mr-2" /> Print
            </Button>
            <Button variant="outline" className="h-9 min-w-[140px] mt-2 md:mt-0 ml-2 pointer-events-none" tabIndex={-1}>
              <RefreshCcw className="w-4 h-4 mr-2" />
              Rescan All with AI
            </Button>
          </div>
        </div>

        <div className="mb-4 text-lg font-semibold">
          Total for filtered receipts:{" "}
          <span className="text-primary">${MOCK_RECEIPTS.reduce((s, r) => s + r.total_amount, 0).toFixed(2)}</span>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Monthly Spend</h3>
            {monthlyDataFull.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthlyDataFull} margin={{ top: 0, right: 8, left: -10, bottom: 0 }}>
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

          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Spend by Tag</h3>
            {tagSpendDataFull.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={tagSpendDataFull}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {tagSpendDataFull.map((_, idx) => (
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
                <th className="p-1 md:p-2 border">Edit</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_RECEIPTS.map((r) => (
                <tr key={r.id} className="cursor-default hover:bg-muted/30">
                  <td className="p-1 md:p-2 border">{r.vendor_name}</td>
                  <td className="p-1 md:p-2 border">
                    {format(new Date(`${r.purchase_date}T12:00:00`), "PPP")}
                  </td>
                  <td className="p-1 md:p-2 border">${r.total_amount.toFixed(2)}</td>
                  <td className="p-1 md:p-2 border">{r.type}</td>
                  <td className="p-1 md:p-2 border">{r.client_name}</td>
                  <td className="p-1 md:p-2 border">
                    <Badge variant="outline" className={`text-xs ${getTagColor(r.tag)}`}>
                      {r.tag}
                    </Badge>
                  </td>
                  <td className="p-1 md:p-2 border text-center">
                    {r.warranty ? (
                      <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Yes</span>
                    ) : (
                      <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">No</span>
                    )}
                  </td>
                  {showWarrantyEndDate && (
                    <td className="p-1 md:p-2 border text-center">
                      {r.warranty && isValid(new Date(`${r.purchase_date}T12:00:00`))
                        ? format(addYears(new Date(`${r.purchase_date}T12:00:00`), 3), "PPP")
                        : "-"}
                    </td>
                  )}
                  <td className="p-1 md:p-2 border">
                    <Button size="sm" variant="outline" className="pointer-events-none" tabIndex={-1}>
                      View Image
                    </Button>
                  </td>
                  <td className="p-1 md:p-2 border">
                    <Button size="sm" variant="outline" className="pointer-events-none" tabIndex={-1}>
                      View Text
                    </Button>
                  </td>
                  <td className="p-1 md:p-2 border">
                    {r.notesHint ? (
                      <Button size="sm" variant="outline" className="pointer-events-none" tabIndex={-1}>
                        View Notes
                      </Button>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="p-1 md:p-2 border">
                    <Button size="sm" variant="secondary" className="pointer-events-none" tabIndex={-1}>
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
