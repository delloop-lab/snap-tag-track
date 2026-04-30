import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { toast } from "@/components/ui/use-toast";

interface Tag {
  id: string;
  name: string;
  user_id: string;
}

interface TagInputProps {
  receiptId: string;
  onTagsChange?: (tags: Tag[]) => void;
}

const STANDARD_TAGS = [
  { name: "Power" },
  { name: "Water" },
  { name: "Gas" },
  { name: "Fuel" },
  { name: "Groceries" },
  { name: "Internet" },
  { name: "Rent" },
  { name: "Dining" },
  { name: "Shopping" },
];

function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = Array(b.length + 1)
    .fill(null)
    .map(() => Array(a.length + 1).fill(null));
  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const sub = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + sub
      );
    }
  }
  return matrix[b.length][a.length];
}

// Consistent color palette for tags
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

// Deterministically assign a color to a tag name
export function getTagColor(tagName: string) {
  let hash = 0;
  for (let i = 0; i < tagName.length; i++) {
    hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % tagColors.length;
  return tagColors[idx];
}

export function TagInput({ receiptId, onTagsChange }: TagInputProps) {
  const formatTagName = (value: string): string => {
    const trimmed = value.trim().replace(/\s+/g, " ");
    if (!trimmed) return "";
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  };

  const [inputValue, setInputValue] = useState("");
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [allUserTags, setAllUserTags] = useState<Tag[]>([]);
  const [applyToSimilar, setApplyToSimilar] = useState(true);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Helper to fetch tags for this receipt
  const fetchTags = async () => {
    if (!user || !receiptId) {
      setLoading(false);
      return;
    }
    try {
      // Fetch tags already associated with this receipt
      const { data: receiptTags, error: receiptTagsError } = await supabase
        .from("receipt_tags")
        .select("tag_id, tags:tag_id(id, name, user_id)")
        .eq("receipt_id", receiptId);
      if (receiptTagsError) throw receiptTagsError;
      const tags = (receiptTags || []).map((rt: any) => rt.tags);
      setSelectedTags(tags);
      const { data: tagsData } = await supabase
        .from("tags")
        .select("*")
        .eq("user_id", user.id)
        .order("name", { ascending: true });
      setAllUserTags(tagsData || []);
    } catch (error) {
      console.error("Error fetching tags:", error);
      toast({
        title: "Error",
        description: "Failed to load tags",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, receiptId]);

  const addTagToSimilarReceipts = async (tagId: string) => {
    if (!user) return 0;
    const normalize = (s: string) =>
      s.toLowerCase().trim().replace(/[^\w\s]/g, "");
    try {
      const { data: thisReceipt } = await supabase
        .from("receipts")
        .select("id,vendor_name")
        .eq("id", receiptId)
        .single();
      const baseVendor = thisReceipt?.vendor_name;
      if (!baseVendor) return 0;
      const baseNorm = normalize(baseVendor);

      const { data: receipts } = await supabase
        .from("receipts")
        .select("id,vendor_name")
        .eq("user_id", user.id)
        .not("vendor_name", "is", null);
      if (!receipts?.length) return 0;

      const similarReceiptIds = receipts
        .filter((r: any) => {
          if (!r.vendor_name) return false;
          const currentNorm = normalize(r.vendor_name);
          const maxLen = Math.max(baseNorm.length, currentNorm.length);
          if (maxLen === 0) return false;
          const similarity = 1 - levenshteinDistance(baseNorm, currentNorm) / maxLen;
          return similarity >= 0.7;
        })
        .map((r: any) => r.id);

      if (similarReceiptIds.length === 0) return 0;
      const { data: existingLinks } = await supabase
        .from("receipt_tags")
        .select("receipt_id")
        .eq("tag_id", tagId)
        .in("receipt_id", similarReceiptIds);
      const existingSet = new Set((existingLinks || []).map((r: any) => r.receipt_id));
      const missingPayload = similarReceiptIds
        .filter((id: string) => !existingSet.has(id))
        .map((id: string) => ({ receipt_id: id, tag_id: tagId }));
      if (missingPayload.length > 0) {
        const { error } = await supabase.from("receipt_tags").insert(missingPayload);
        if (error) throw error;
      }
      return Math.max(0, missingPayload.filter((p) => p.receipt_id !== receiptId).length);
    } catch (e) {
      console.error("Error auto-tagging similar receipts:", e);
      return 0;
    }
  };

  const createAndAddTag = async (rawName?: string | React.MouseEvent) => {
    if (!user) return;
    const candidate = typeof rawName === "string" ? rawName : inputValue;
    const tagName = formatTagName(candidate);
    if (!tagName) return;
    if (selectedTags.some((t) => t.name.toLowerCase() === tagName.toLowerCase())) {
      setInputValue("");
      return;
    }
    try {
      // Check if tag already exists
      const { data: existingTags } = await supabase
        .from("tags")
        .select("*")
        .ilike("name", tagName)
        .eq("user_id", user.id);
      let tag = existingTags && existingTags.length > 0 ? existingTags[0] : null;
      if (!tag) {
        // Create new tag
        const { data: newTag, error: createError } = await supabase
          .from("tags")
          .insert({ name: tagName, user_id: user.id })
          .select()
          .single();
        if (createError) throw createError;
        tag = newTag;
      }
      // Link tag to receipt if not already linked (avoid RLS issues with upsert)
      const { data: existingLink } = await supabase
        .from("receipt_tags")
        .select("receipt_id")
        .eq("receipt_id", receiptId)
        .eq("tag_id", tag.id)
        .maybeSingle();
      if (!existingLink) {
        const { error: linkError } = await supabase
          .from("receipt_tags")
          .insert({ receipt_id: receiptId, tag_id: tag.id });
        if (linkError) throw linkError;
      }
      const propagatedCount = applyToSimilar
        ? await addTagToSimilarReceipts(tag.id)
        : 0;
      setInputValue("");
      await fetchTags(); // Re-fetch tags after adding
      if (onTagsChange) onTagsChange([...selectedTags, tag]);
      toast({
        title: "Tag added",
        description:
          !applyToSimilar
            ? `Added tag '${tag.name}' to this receipt only.`
            : propagatedCount > 0
            ? `Added '${tag.name}' and auto-tagged ${propagatedCount} similar receipt${propagatedCount === 1 ? "" : "s"}.`
            : `Added tag '${tag.name}'.`,
      });
    } catch (error) {
      console.error("Error adding tag:", error);
      toast({
        title: "Error",
        description: "Failed to add tag",
        variant: "destructive",
      });
    }
  };

  const removeTag = async (tagId: string) => {
    if (!tagId || !receiptId) return;
    try {
      const { error } = await supabase
        .from("receipt_tags")
        .delete()
        .eq("receipt_id", receiptId)
        .eq("tag_id", tagId);
      if (error) throw error;
      await fetchTags(); // Re-fetch tags after removing
      if (onTagsChange) onTagsChange(selectedTags);
    } catch (error) {
      console.error("Error removing tag:", error);
      toast({
        title: "Error",
        description: "Failed to remove tag",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading tags...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 mb-2">
        {selectedTags.map(tag => (
          <Badge key={tag.id} variant="secondary" className={`flex items-center gap-1 ${getTagColor(tag.name)}`}>
            {tag.name}
            <button
              className="ml-1 rounded-full outline-none focus:shadow-outline hover:bg-gray-300/20"
              onClick={() => removeTag(tag.id)}
              type="button"
            >
              ×
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-2 mb-2">
        <select
          className="border rounded px-2 py-1"
          defaultValue=""
          onChange={async (e) => {
            const tagName = e.target.value;
            if (!tagName) return;
            await createAndAddTag(tagName);
            e.target.value = "";
          }}
        >
          <option value="">Add tag from list...</option>
          {[...STANDARD_TAGS.map((t) => t.name), ...allUserTags.map((t) => t.name)]
            .filter((name, idx, arr) => arr.findIndex((n) => n.toLowerCase() === name.toLowerCase()) === idx)
            .filter((name) => !selectedTags.some((t) => t.name.toLowerCase() === name.toLowerCase()))
            .sort((a, b) => a.localeCompare(b))
            .map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
        </select>
      </div>
      <label className="inline-flex items-center gap-2 text-xs text-slate-300">
        <input
          type="checkbox"
          checked={applyToSimilar}
          onChange={(e) => setApplyToSimilar(e.target.checked)}
        />
        Apply to similar receipts (dropdown + typed tags)
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          placeholder="Add a tag..."
          className="border rounded px-2 py-1"
          list="known-tag-suggestions"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              createAndAddTag();
            }
          }}
        />
        <datalist id="known-tag-suggestions">
          {allUserTags.map((tag) => (
            <option key={tag.id} value={tag.name} />
          ))}
        </datalist>
        <Button onClick={() => createAndAddTag()} disabled={!inputValue.trim()}>
          Add Tag
        </Button>
      </div>
    </div>
  );
}

export default TagInput;
