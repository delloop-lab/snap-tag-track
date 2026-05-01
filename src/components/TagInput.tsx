import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
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

function chipRemoveButtonClassName() {
  return (
    "ml-0.5 shrink-0 rounded-full p-0.5 leading-none hover:bg-black/15 " +
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/30"
  );
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
      setInputValue("");
      await fetchTags(); // Re-fetch tags after adding
      if (onTagsChange) onTagsChange([...selectedTags, tag]);
      toast({
        title: "Tag added",
        description: `Added tag '${tag.name}' to this receipt.`,
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
    return <div className="text-sm text-slate-400">Loading tags...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 mb-2">
        {selectedTags.map((tag) => (
          <span
            key={tag.id}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border border-slate-900/10 px-2.5 py-0.5 text-xs font-semibold shadow-sm",
              getTagColor(tag.name)
            )}
          >
            {tag.name}
            <button
              type="button"
              className={chipRemoveButtonClassName()}
              onClick={() => removeTag(tag.id)}
              aria-label={`Remove tag ${tag.name}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="relative mb-2 max-w-xs w-full">
        <select
          className={cn(
            "w-full cursor-pointer appearance-none rounded-md border border-sky-500 py-2 pl-3 pr-9 text-sm font-medium shadow-sm",
            "focus:outline-none focus:ring-2 focus:ring-sky-300/60",
            /* !important beats iOS/WebKit UA white styling on dark shells */
            "!bg-sky-600 !text-white hover:!bg-sky-700"
          )}
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
        <ChevronDown
          className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-white opacity-95"
          aria-hidden
        />
      </div>
      <div className="flex gap-2 flex-wrap">
        <input
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          placeholder="Add a tag..."
          autoComplete="off"
          className={cn(
            "min-w-0 flex-1 rounded-md border border-slate-500 px-3 py-2 text-sm shadow-sm",
            "[color-scheme:dark]",
            "!bg-slate-800 !text-slate-100 placeholder:!text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400/50"
          )}
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
        <Button
          type="button"
          className="bg-sky-700 text-white hover:bg-sky-600 disabled:opacity-40"
          onClick={() => createAndAddTag()}
          disabled={!inputValue.trim()}
        >
          Add Tag
        </Button>
      </div>
    </div>
  );
}

export default TagInput;
