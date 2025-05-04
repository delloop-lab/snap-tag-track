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
  const [inputValue, setInputValue] = useState("");
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
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

  const createAndAddTag = async () => {
    if (!user || !inputValue.trim()) return;
    try {
      // Check if tag already exists
      const { data: existingTags } = await supabase
        .from("tags")
        .select("*")
        .eq("name", inputValue.trim())
        .eq("user_id", user.id);
      let tag = existingTags && existingTags.length > 0 ? existingTags[0] : null;
      if (!tag) {
        // Create new tag
        const { data: newTag, error: createError } = await supabase
          .from("tags")
          .insert({ name: inputValue.trim(), user_id: user.id })
          .select()
          .single();
        if (createError) throw createError;
        tag = newTag;
      }
      // Link tag to receipt
      const { error: linkError } = await supabase
        .from("receipt_tags")
        .insert({ receipt_id: receiptId, tag_id: tag.id });
      if (linkError) throw linkError;
      setInputValue("");
      await fetchTags(); // Re-fetch tags after adding
      if (onTagsChange) onTagsChange(selectedTags);
      toast({ title: "Tag added", description: `Added tag '${tag.name}'` });
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
            setInputValue("");
            // Try to add the standard tag
            setInputValue(tagName);
            await createAndAddTag();
            e.target.value = "";
          }}
        >
          <option value="">Add standard tag...</option>
          {STANDARD_TAGS.filter(tag =>
            !selectedTags.some(t => t.name.toLowerCase() === tag.name.toLowerCase())
          ).map(tag => (
            <option key={tag.name} value={tag.name}>{tag.name}</option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          placeholder="Add a tag..."
          className="border rounded px-2 py-1"
        />
        <Button onClick={createAndAddTag} disabled={!inputValue.trim()}>
          Add Tag
        </Button>
      </div>
    </div>
  );
}

export default TagInput;
