import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { backfillMissingReceiptThumbnails } from "@/lib/backfillReceiptThumbnails";
import { COUNTRY_DISPLAY_NAMES_EN } from "@/lib/countryDisplayNames";
import { notifyUserShoppingPrefsChanged } from "@/lib/userShoppingPreferences";
import { cn } from "@/lib/utils";
import type { User } from "@supabase/supabase-js";

const AVATAR_BUCKET = "avatars";

function namesFromAuthMetadata(authUser: User): { first: string; last: string } {
  const m = authUser.user_metadata as Record<string, unknown>;
  const s = (k: string): string =>
    typeof m[k] === "string" ? (m[k] as string).trim() : "";
  const fn = s("first_name");
  const ln = s("last_name");
  if (fn || ln) return { first: fn, last: ln };
  const full = s("full_name") || s("name");
  if (full) {
    const parts = full.split(/\s+/).filter(Boolean);
    return { first: parts[0] ?? "", last: parts.slice(1).join(" ") };
  }
  return { first: "", last: "" };
}

/** OAuth / identity provider avatar (full URL only). */
function avatarUrlFromAuthMetadata(authUser: User): string {
  const m = authUser.user_metadata as Record<string, unknown>;
  const raw = (m.avatar_url ?? m.picture) as unknown;
  return typeof raw === "string" && /^https?:\/\//i.test(raw) ? raw.trim() : "";
}

function looksLikeAbsoluteUrl(str: string): boolean {
  return /^https?:\/\//i.test(str.trim());
}

type WarrantyDurationUnit = "years" | "months";

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [country, setCountry] = useState("");
  const [avatarPath, setAvatarPath] = useState(""); // Storage object path or legacy full URL persisted in DB
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loadWarning, setLoadWarning] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [thumbBackfill, setThumbBackfill] = useState<{
    running: boolean;
    done: number;
    total: number;
    last?: { created: number; skipped: number; failed: number };
  }>({ running: false, done: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  /** When true: never attach location to new receipts; skips capture-time prompt. */
  const [receiptLocationDisabled, setReceiptLocationDisabled] = useState(false);
  const [receiptLocationPrefSaving, setReceiptLocationPrefSaving] = useState(false);

  const [warrantyDurationUnit, setWarrantyDurationUnit] = useState<WarrantyDurationUnit>("years");
  const [warrantyDurationAmount, setWarrantyDurationAmount] = useState("3");
  const [returnWindowDaysInput, setReturnWindowDaysInput] = useState("30");
  const [regionalShoppingSaving, setRegionalShoppingSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const fetchProfile = async () => {
      setLoadWarning("");

      const fromMeta = namesFromAuthMetadata(user);
      const metaPic = avatarUrlFromAuthMetadata(user);

      let data:
        | {
            first_name: string | null;
            last_name: string | null;
            avatar_url: string | null;
            country?: string | null;
            receipt_location_disabled?: boolean | null;
            warranty_default_months?: number | null;
            return_window_days?: number | null;
          }
        | null = null;
      let selErr: { message: string } | null = null;

      let res = await supabase
        .from("users")
        .select(
          "first_name, last_name, avatar_url, country, receipt_location_disabled, warranty_default_months, return_window_days",
        )
        .eq("id", user.id)
        .maybeSingle();

      if (res.error) {
        const prefMsg = res.error.message ?? "";
        if (/warranty_default_months|return_window_days/i.test(prefMsg)) {
          setLoadWarning(
            (w) =>
              w ||
              "Run the latest database migration to save warranty length and return-window preferences on the server.",
          );
        }
        res = await supabase
          .from("users")
          .select("first_name, last_name, avatar_url, country, receipt_location_disabled")
          .eq("id", user.id)
          .maybeSingle();
      }

      if (res.error) {
        selErr = res.error;
        const fallbackNoLocPref = await supabase
          .from("users")
          .select("first_name, last_name, avatar_url, country")
          .eq("id", user.id)
          .maybeSingle();
        if (!fallbackNoLocPref.error) {
          data = fallbackNoLocPref.data;
          selErr = null;
          const msg = res.error.message ?? "";
          if (/receipt_location_disabled|does not exist|schema cache/i.test(msg)) {
            setLoadWarning(
              (w) =>
                w ||
                "Run the latest database migration to save receipt location preferences on the server.",
            );
          }
        } else {
          selErr = fallbackNoLocPref.error;
          const withoutCountry = await supabase
            .from("users")
            .select("first_name, last_name, avatar_url")
            .eq("id", user.id)
            .maybeSingle();
          if (!withoutCountry.error) {
            data = withoutCountry.data;
            selErr = null;
          } else {
            data = withoutCountry.data;
            selErr = withoutCountry.error;
          }
        }
      } else {
        data = res.data;
      }

      if (cancelled) return;

      if (selErr) {
        setLoadWarning("Could not load saved profile from the database. Showing what we can from your account.");
      }

      const fn = data?.first_name?.trim() || fromMeta.first;
      const ln = data?.last_name?.trim() || fromMeta.last;
      setFirstName(fn);
      setLastName(ln);
      const countryCol = data && "country" in data ? (data.country as string | null | undefined) : undefined;
      setCountry(typeof countryCol === "string" ? countryCol : "");

      const locOpt =
        data && "receipt_location_disabled" in data
          ? data.receipt_location_disabled
          : undefined;
      setReceiptLocationDisabled(locOpt === true);

      const wdMonths =
        data && "warranty_default_months" in data ? data.warranty_default_months : undefined;
      const rWindow =
        data && "return_window_days" in data ? data.return_window_days : undefined;

      if (typeof wdMonths === "number" && wdMonths >= 1 && wdMonths <= 600) {
        if (wdMonths % 12 === 0) {
          setWarrantyDurationUnit("years");
          setWarrantyDurationAmount(String(wdMonths / 12));
        } else {
          setWarrantyDurationUnit("months");
          setWarrantyDurationAmount(String(wdMonths));
        }
      } else {
        setWarrantyDurationUnit("years");
        setWarrantyDurationAmount("3");
      }

      if (typeof rWindow === "number" && rWindow >= 0 && rWindow <= 365) {
        setReturnWindowDaysInput(String(rWindow));
      } else {
        setReturnWindowDaysInput("30");
      }

      const stored = data?.avatar_url?.trim() || "";
      if (stored && looksLikeAbsoluteUrl(stored)) {
        setAvatarPath(stored);
        setAvatarUrl(stored);
      } else if (stored) {
        setAvatarPath(stored);
        const { data: signedData, error: signedError } = await supabase.storage
          .from(AVATAR_BUCKET)
          .createSignedUrl(stored, 60 * 60);
        if (cancelled) return;
        if (!signedError && signedData?.signedUrl) {
          setAvatarUrl(signedData.signedUrl);
        } else {
          setAvatarUrl(metaPic);
          if (stored) {
            setLoadWarning(
              (w) => w || "Could not load your saved profile photo; showing your login photo if available.",
            );
          }
        }
      } else {
        setAvatarPath("");
        setAvatarUrl(metaPic);
      }
    };

    void fetchProfile();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setSuccess("");
    setError("");
    const fn = firstName.trim();
    const ln = lastName.trim();
    const ctr = country.trim();
    if (!fn || !ln || !ctr) {
      setError("First name, last name, and country are required.");
      setLoading(false);
      return;
    }
    if (!COUNTRY_DISPLAY_NAMES_EN.includes(ctr)) {
      setError("Please choose a valid country from the list.");
      setLoading(false);
      return;
    }
    const payload = {
      first_name: fn,
      last_name: ln,
      country: ctr,
      avatar_url: avatarPath || null,
    };
    const legacyPayload = {
      first_name: fn,
      last_name: ln,
      avatar_url: avatarPath || null,
    };

    // Prefer UPDATE (existing profile row). Fallbacks handle schema/policy drift.
    let { error } = await supabase
      .from("users")
      .update(payload)
      .eq("id", user.id);

    const missingCountryColumn =
      !!error && /country|column|schema cache|does not exist/i.test(error.message || "");

    if (missingCountryColumn) {
      const fallbackUpdate = await supabase
        .from("users")
        .update(legacyPayload)
        .eq("id", user.id);
      error = fallbackUpdate.error;
      if (!error) {
        setLoadWarning("Your database is missing the country column; other profile fields were saved.");
      }
    }

    // If update still fails (e.g. no row), attempt an upsert.
    if (error) {
      const upsertPayload = missingCountryColumn
        ? {
            id: user.id,
            email: user.email ?? "",
            ...legacyPayload,
          }
        : {
            id: user.id,
            email: user.email ?? "",
            ...payload,
          };
      const upsertResult = await supabase
        .from("users")
        .upsert(upsertPayload, { onConflict: "id" });
      error = upsertResult.error;
    }
    setLoading(false);
    if (error) {
      setError(`Failed to update profile: ${error.message}`);
    } else {
      setSuccess("Profile updated successfully!");
      if (!missingCountryColumn) setLoadWarning("");
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError("");
    setSuccess("");
    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage.from(AVATAR_BUCKET).upload(filePath, file, { upsert: true });
    if (error) {
      setError("Failed to upload avatar. Please try again.");
      setLoading(false);
      return;
    }
    // Store the file path (not signed URL)
    setAvatarPath(filePath);
    
    // Generate signed URL for display
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage.from(AVATAR_BUCKET).createSignedUrl(filePath, 60 * 60); // 1 hour expiry
    if (signedUrlError) {
      setError("Failed to generate avatar URL.");
      setLoading(false);
      return;
    }
    setAvatarUrl(signedUrlData.signedUrl);
    setLoading(false);
    setSuccess("Avatar uploaded! Click Save to update your profile.");
  };

  const runThumbBackfill = async () => {
    if (!user || thumbBackfill.running) return;
    setThumbBackfill({ running: true, done: 0, total: 0 });
    const result = await backfillMissingReceiptThumbnails({
      userId: user.id,
      concurrency: 2,
      onProgress: (p) => setThumbBackfill((s) => ({ ...s, done: p.done, total: p.total })),
    });
    setThumbBackfill((s) => ({ ...s, running: false, last: result }));
    toast({
      title: "Thumbnail Scans",
      description: `Created ${result.created}. Skipped ${result.skipped} (already had thumbnails). Failed ${result.failed}.`,
    });
  };

  const RECEIPT_LOCATION_PREF_EVENT =
    /* keep in sync with ReceiptUpload SNAP_RECEIPT_LOCATION_PREF_EVENT */
    "snap:receipt-location-pref-changed";

  const applyReceiptLocationOptOut = async (nextDisabled: boolean) => {
    if (!user || receiptLocationPrefSaving) return;
    setReceiptLocationPrefSaving(true);
    setSuccess("");
    setError("");
    try {
      const { error } = await supabase
        .from("users")
        .update({ receipt_location_disabled: nextDisabled })
        .eq("id", user.id);
      if (error) throw error;
      setReceiptLocationDisabled(nextDisabled);
      window.dispatchEvent(new CustomEvent(RECEIPT_LOCATION_PREF_EVENT));
      toast({
        title: nextDisabled ? "Location off for new captures" : "Location choice enabled",
        description: nextDisabled
          ? "New receipt photos will not use photo or device GPS. You can turn this back on anytime."
          : "You will be asked whether to include location each time you capture a receipt photo.",
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not update preference.";
      toast({
        title: "Could not save",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setReceiptLocationPrefSaving(false);
    }
  };

  const applyRegionalShoppingDefaults = async () => {
    if (!user || regionalShoppingSaving) return;
    setRegionalShoppingSaving(true);
    setSuccess("");
    setError("");

    const rawAmt = warrantyDurationAmount.trim();
    const amt = Number.parseInt(rawAmt, 10);
    if (!Number.isFinite(amt) || amt < 1) {
      toast({
        title: "Check warranty length",
        description: "Enter a whole number of 1 or more.",
        variant: "destructive",
      });
      setRegionalShoppingSaving(false);
      return;
    }

    let warrantyMonths = warrantyDurationUnit === "years" ? amt * 12 : amt;
    if (warrantyDurationUnit === "years") {
      if (amt > 50) {
        toast({
          title: "Check warranty length",
          description: "Use at most 50 years (adjust to months if you need a longer window).",
          variant: "destructive",
        });
        setRegionalShoppingSaving(false);
        return;
      }
    }
    if (warrantyMonths > 600 || warrantyMonths < 1) {
      toast({
        title: "Check warranty length",
        description: "The maximum supported default is 600 months.",
        variant: "destructive",
      });
      setRegionalShoppingSaving(false);
      return;
    }

    const retRaw = returnWindowDaysInput.trim();
    const ret = Number.parseInt(retRaw, 10);
    if (!Number.isFinite(ret) || ret < 0 || ret > 365) {
      toast({
        title: "Check return window",
        description: "Enter whole days between 0 and 365 (0 hides the reminder on receipts).",
        variant: "destructive",
      });
      setRegionalShoppingSaving(false);
      return;
    }

    try {
      const { error } = await supabase
        .from("users")
        .update({ warranty_default_months: warrantyMonths, return_window_days: ret })
        .eq("id", user.id);
      if (error) throw error;
      notifyUserShoppingPrefsChanged();
      toast({
        title: "Regional defaults saved",
        description: "Warranty length and return window will apply across Summary, Intelligence, and receipt detail.",
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not update preferences.";
      toast({
        title: "Could not save",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setRegionalShoppingSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:py-10">
      <header className="mx-auto mb-8 max-w-2xl text-center">
        <p className="mb-3 inline-flex items-center rounded-full border border-[#7CB87E]/40 bg-[#7CB87E]/10 px-3 py-1 text-xs font-medium text-[#7CB87E]">
          Account settings
        </p>
        <h1 className="text-balance text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Profile
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
          Update your details and manage profile tools in one place.
        </p>
      </header>

      <div className="space-y-8 rounded-2xl border border-slate-600 bg-slate-900/70 p-6 text-slate-100 shadow-xl shadow-black/20 backdrop-blur-sm sm:p-8">
      {loadWarning && (
        <p
          className="text-sm rounded-md border border-amber-600/60 bg-amber-950/40 px-3 py-2 text-amber-100"
          role="status"
        >
          {loadWarning}
        </p>
      )}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex h-24 w-24 flex-col items-center justify-center overflow-hidden rounded-full border border-slate-500 bg-slate-800/80">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Your profile photo"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-2xl font-medium text-slate-300" aria-hidden>
                {(firstName?.[0] ?? lastName?.[0] ?? user?.email?.[0] ?? "?").toUpperCase()}
              </span>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            className="mt-2 border-slate-500 bg-slate-800 px-2 py-1 text-xs text-slate-100 hover:bg-slate-700 hover:text-white"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
          >
            {avatarUrl ? "Change" : "Add"} Photo
          </Button>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            className="hidden"
            onChange={handleAvatarChange}
            disabled={loading}
          />
        </div>
        <div>
          <label className="block mb-1 font-medium" htmlFor="profile-first-name">
            First name <span className="text-sm font-normal text-red-400">required</span>
          </label>
          <Input
            id="profile-first-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="First name"
            disabled={loading}
            required
            aria-required="true"
            autoComplete="given-name"
            className="border-slate-500 bg-slate-800/90 text-slate-50 ring-offset-slate-900 placeholder:text-slate-300"
          />
        </div>
        <div>
          <label className="block mb-1 font-medium" htmlFor="profile-last-name">
            Last name <span className="text-sm font-normal text-red-400">required</span>
          </label>
          <Input
            id="profile-last-name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Last name"
            disabled={loading}
            required
            aria-required="true"
            autoComplete="family-name"
            className="border-slate-500 bg-slate-800/90 text-slate-50 ring-offset-slate-900 placeholder:text-slate-300"
          />
        </div>
        <div>
          <label className="block mb-1 font-medium" htmlFor="profile-country">
            Country <span className="text-sm font-normal text-red-400">required</span>
          </label>
          <select
            id="profile-country"
            className={cn(
              "flex h-10 w-full rounded-md border border-slate-500 bg-slate-800 px-3 py-2 text-sm text-slate-50 ring-offset-slate-900",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/40 focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            disabled={loading}
            required
            aria-required="true"
            autoComplete="country-name"
          >
            <option value="">Select country…</option>
            {COUNTRY_DISPLAY_NAMES_EN.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
        {success && <div className="text-center text-green-400">{success}</div>}
        {error && <div className="text-center text-red-400">{error}</div>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </form>

      <div className="border-t border-slate-600 pt-6">
        <h3 className="mb-4 text-lg font-semibold text-white">Settings</h3>
        <div className="space-y-6">
          <div className="space-y-3 rounded-md border border-slate-600 bg-slate-950/25 p-4">
            <p className="font-medium text-slate-100">Receipt location</p>
            <p className="text-sm text-slate-300">
              When you capture a receipt photo, we can use GPS from the image or from this device. Turn the switch on
              to never attach location and skip that step for new captures. If you leave it off, we will ask each time
              you add a receipt photo.
            </p>
            <div className="flex items-center justify-between gap-3 rounded-md border border-slate-600/80 bg-slate-900/40 px-3 py-3">
              <label htmlFor="receipt-loc-opt-out" className="cursor-pointer text-sm text-slate-200">
                Never attach location to new receipts
              </label>
              <Switch
                id="receipt-loc-opt-out"
                checked={receiptLocationDisabled}
                disabled={loading || receiptLocationPrefSaving || !user}
                onCheckedChange={(c) => void applyReceiptLocationOptOut(c)}
              />
            </div>
          </div>
          <div className="space-y-3 rounded-md border border-slate-600 bg-slate-950/25 p-4">
            <p className="font-medium text-slate-100">Warranty and returns</p>
            <p className="text-sm text-slate-300">
              Typical warranty coverage where you shop, and how long you plan to return unwanted items without hassle.
              We use warranty length whenever a receipt has a purchase date but no saved warranty end date; the return
              window appears as a reminder on receipt detail. For your planning only — not legal advice.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <label htmlFor="warranty-duration-amt" className="block text-sm font-medium text-slate-200">
                  Default warranty duration
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    id="warranty-duration-amt"
                    type="number"
                    min={1}
                    step={1}
                    inputMode="numeric"
                    value={warrantyDurationAmount}
                    onChange={(e) => setWarrantyDurationAmount(e.target.value)}
                    disabled={loading || regionalShoppingSaving || !user}
                    aria-label="Warranty duration amount"
                    className="max-w-[120px] border-slate-500 bg-slate-800/90 text-slate-50 ring-offset-slate-900"
                  />
                  <select
                    id="warranty-duration-unit"
                    value={warrantyDurationUnit}
                    onChange={(e) =>
                      setWarrantyDurationUnit(e.target.value === "months" ? "months" : "years")
                    }
                    disabled={loading || regionalShoppingSaving || !user}
                    aria-label="Warranty duration unit"
                    className={cn(
                      "flex h-10 rounded-md border border-slate-500 bg-slate-800 px-3 py-2 text-sm text-slate-50 ring-offset-slate-900",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/40 focus-visible:ring-offset-2",
                      "disabled:cursor-not-allowed disabled:opacity-50",
                    )}
                  >
                    <option value="years">Years</option>
                    <option value="months">Months</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label htmlFor="return-window-days" className="block text-sm font-medium text-slate-200">
                  Return window (days after purchase)
                </label>
                <Input
                  id="return-window-days"
                  type="number"
                  min={0}
                  max={365}
                  step={1}
                  inputMode="numeric"
                  value={returnWindowDaysInput}
                  onChange={(e) => setReturnWindowDaysInput(e.target.value)}
                  disabled={loading || regionalShoppingSaving || !user}
                  aria-label="Days allowed for hassle-free returns"
                  className="max-w-[120px] border-slate-500 bg-slate-800/90 text-slate-50 ring-offset-slate-900"
                />
                <p className="text-xs text-slate-400">Use 0 to hide the return reminder on receipts.</p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full border-slate-500 bg-slate-800 text-slate-100 hover:bg-slate-700 hover:text-white"
              onClick={() => void applyRegionalShoppingDefaults()}
              disabled={loading || regionalShoppingSaving || !user}
            >
              {regionalShoppingSaving ? "Saving…" : "Save warranty & return settings"}
            </Button>
          </div>
          <div className="space-y-3 rounded-md border border-slate-600 bg-slate-950/25 p-4">
            <p className="font-medium text-slate-100">AI Rescan</p>
            <p className="text-sm text-slate-300">
              Bulk rescan receipts with AI from the Receipts Summary page (including &ldquo;Rescan All with AI&rdquo;).
            </p>
            <Button
              type="button"
              variant="outline"
              className="w-full border-slate-500 bg-slate-800 text-slate-100 hover:bg-slate-700 hover:text-white"
              onClick={() => navigate("/summary")}
            >
              AI Rescan
            </Button>
          </div>
          <div className="space-y-3 rounded-md border border-slate-600 bg-slate-950/25 p-4">
            <p className="font-medium text-slate-100">Thumbnail Scans</p>
            <p className="text-sm text-slate-300">
              Generate small preview images for receipts uploaded before thumbnail support. Safe to run more than once; existing thumbnails are skipped.
            </p>
            {thumbBackfill.total > 0 && (
              <p className="text-sm text-slate-200">
                Progress: {thumbBackfill.done} / {thumbBackfill.total}
              </p>
            )}
            {thumbBackfill.last && !thumbBackfill.running && (
              <p className="text-xs text-slate-400">
                Last run: created {thumbBackfill.last.created}, skipped {thumbBackfill.last.skipped}, failed{" "}
                {thumbBackfill.last.failed}.
              </p>
            )}
            <Button
              type="button"
              variant="outline"
              className="w-full border-slate-500 bg-slate-800 text-slate-100 hover:bg-slate-700 hover:text-white"
              onClick={runThumbBackfill}
              disabled={loading || thumbBackfill.running || !user}
            >
              {thumbBackfill.running ? "Scanning thumbnails…" : "Run thumbnail scan"}
            </Button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default Profile; 