
import React, { useEffect, useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tag, Plus } from 'lucide-react';
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/components/AuthProvider";

interface TagSuggestionProps {
  receiptId: string;
  textContent: string | null;
  onTagAdded: () => void;
}

interface KeywordTag {
  keyword: string;
  tag: string;
}

// Define keyword-to-tag mappings
const keywordTagMappings: KeywordTag[] = [
  { keyword: 'starbucks', tag: 'Coffee' },
  { keyword: 'coffee', tag: 'Coffee' },
  { keyword: 'cafe', tag: 'Coffee' },
  { keyword: 'walmart', tag: 'Shopping' },
  { keyword: 'target', tag: 'Shopping' },
  { keyword: 'amazon', tag: 'Shopping' },
  { keyword: 'pizza', tag: 'Dining' },
  { keyword: 'restaurant', tag: 'Dining' },
  { keyword: 'mcdonald', tag: 'Fast Food' },
  { keyword: 'burger king', tag: 'Fast Food' },
  { keyword: 'wendy', tag: 'Fast Food' },
  { keyword: 'shell', tag: 'Fuel' },
  { keyword: 'bp', tag: 'Fuel' },
  { keyword: 'exxon', tag: 'Fuel' },
  { keyword: 'gas', tag: 'Fuel' },
  { keyword: 'chevron', tag: 'Fuel' },
  { keyword: 'costco', tag: 'Wholesale' },
  { keyword: 'sam\'s club', tag: 'Wholesale' },
  { keyword: 'uber', tag: 'Transportation' },
  { keyword: 'lyft', tag: 'Transportation' },
  { keyword: 'taxi', tag: 'Transportation' },
  { keyword: 'pharmacy', tag: 'Healthcare' },
  { keyword: 'doctor', tag: 'Healthcare' },
  { keyword: 'clinic', tag: 'Healthcare' },
  { keyword: 'cvs', tag: 'Healthcare' },
  { keyword: 'walgreens', tag: 'Healthcare' },
];

const TagSuggestion: React.FC<TagSuggestionProps> = ({ receiptId, textContent, onTagAdded }) => {
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (textContent) {
      analyzeTags(textContent);
    }
  }, [textContent]);

  const analyzeTags = (text: string) => {
    const lowercaseText = text.toLowerCase();
    const suggestions = new Set<string>();
    
    keywordTagMappings.forEach(mapping => {
      if (lowercaseText.includes(mapping.keyword.toLowerCase())) {
        suggestions.add(mapping.tag);
      }
    });
    
    setSuggestedTags(Array.from(suggestions));
  };

  const addTagToReceipt = async (tagName: string) => {
    if (!user) return;

    setLoading(true);
    try {
      // Check if tag already exists
      const { data: existingTags, error: fetchError } = await supabase
        .from("tags")
        .select("*")
        .eq("name", tagName)
        .eq("user_id", user.id);

      if (fetchError) throw fetchError;

      let tagId;

      // Create tag if it doesn't exist
      if (!existingTags || existingTags.length === 0) {
        const { data: newTag, error: createError } = await supabase
          .from("tags")
          .insert({ name: tagName, user_id: user.id })
          .select()
          .single();

        if (createError) throw createError;
        tagId = newTag?.id;
      } else {
        tagId = existingTags[0]?.id;
      }

      if (!tagId) throw new Error("Failed to obtain tag ID");

      // Check if tag is already associated with this receipt
      const { data: existingLinks, error: linkFetchError } = await supabase
        .from("receipt_tags")
        .select("*")
        .eq("receipt_id", receiptId)
        .eq("tag_id", tagId);

      if (linkFetchError) throw linkFetchError;

      // Only add if not already linked
      if (!existingLinks || existingLinks.length === 0) {
        const { error: linkError } = await supabase
          .from("receipt_tags")
          .insert({
            receipt_id: receiptId,
            tag_id: tagId
          });

        if (linkError) throw linkError;
      }

      // Remove from suggestions
      setSuggestedTags(prev => prev.filter(t => t !== tagName));
      
      // Notify parent component to refresh tags
      onTagAdded();

      toast({
        title: "Tag added",
        description: `Added "${tagName}" tag to receipt`,
      });
    } catch (error) {
      console.error("Error adding tag:", error);
      toast({
        title: "Error",
        description: "Failed to add tag",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (suggestedTags.length === 0) {
    return null;
  }

  return (
    <div className="mt-2">
      <p className="text-sm font-medium mb-2">Suggested tags:</p>
      <div className="flex flex-wrap gap-2">
        {suggestedTags.map(tag => (
          <Badge key={tag} variant="success" className="cursor-pointer hover:bg-green-200 transition-colors">
            <Tag className="h-3 w-3 mr-1" />
            {tag}
            <Button
              size="sm"
              variant="ghost"
              className="h-4 w-4 p-0 ml-1"
              disabled={loading}
              onClick={() => addTagToReceipt(tag)}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </Badge>
        ))}
      </div>
    </div>
  );
};

export default TagSuggestion;
