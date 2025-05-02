
import React, { useState, useEffect, useRef } from "react";
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, Plus, Tag, X } from "lucide-react";
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

export function TagInput({ receiptId, onTagsChange }: TagInputProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch available tags and selected tags
  useEffect(() => {
    const fetchTags = async () => {
      if (!user || !receiptId) {
        setLoading(false);
        return;
      }
      
      try {
        // Fetch all user tags
        const { data: userTags, error: tagError } = await supabase
          .from("tags")
          .select("*")
          .eq("user_id", user.id);

        if (tagError) throw tagError;
        
        // Fetch tags already associated with this receipt
        const { data: receiptTags, error: receiptTagsError } = await supabase
          .from("receipt_tags")
          .select("tag_id")
          .eq("receipt_id", receiptId);

        if (receiptTagsError) throw receiptTagsError;
        
        const selectedTagIds = receiptTags?.map(rt => rt.tag_id) || [];
        
        const selectedTagsData = (userTags || []).filter(tag => 
          selectedTagIds.includes(tag.id)
        );
        
        const availableTagsData = (userTags || []).filter(tag => 
          !selectedTagIds.includes(tag.id)
        );
        
        setAvailableTags(availableTagsData);
        setSelectedTags(selectedTagsData);
        
        if (onTagsChange) {
          onTagsChange(selectedTagsData);
        }
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

    fetchTags();
  }, [user, receiptId, onTagsChange]);

  const createTag = async (name: string) => {
    if (!user || !name.trim()) return null;
    
    try {
      // First check if a tag with this name already exists
      const { data: existingTags } = await supabase
        .from("tags")
        .select("*")
        .eq("name", name.trim())
        .eq("user_id", user.id);
      
      if (existingTags && existingTags.length > 0) {
        return existingTags[0];
      }
      
      // Create a new tag
      const { data, error } = await supabase
        .from("tags")
        .insert({ name: name.trim(), user_id: user.id })
        .select()
        .single();
      
      if (error) throw error;
      
      // Update available tags
      if (data) {
        setAvailableTags(prev => [...prev, data]);
      }
      
      return data;
    } catch (error) {
      console.error("Error creating tag:", error);
      toast({
        title: "Error",
        description: "Failed to create tag",
        variant: "destructive",
      });
      return null;
    }
  };

  const addTagToReceipt = async (tag: Tag) => {
    if (!tag || !tag.id || !receiptId) return false;
    
    try {
      const { error } = await supabase
        .from("receipt_tags")
        .insert({
          receipt_id: receiptId,
          tag_id: tag.id,
        });
      
      if (error) throw error;
      
      // Update UI
      setSelectedTags(prev => [...prev, tag]);
      setAvailableTags(prev => prev.filter(t => t.id !== tag.id));
      
      if (onTagsChange) {
        onTagsChange([...selectedTags, tag]);
      }
      
      return true;
    } catch (error) {
      console.error("Error adding tag to receipt:", error);
      toast({
        title: "Error",
        description: "Failed to add tag to receipt",
        variant: "destructive",
      });
      return false;
    }
  };

  const removeTagFromReceipt = async (tagId: string) => {
    if (!tagId || !receiptId) return false;
    
    try {
      const { error } = await supabase
        .from("receipt_tags")
        .delete()
        .eq("receipt_id", receiptId)
        .eq("tag_id", tagId);
      
      if (error) throw error;
      
      // Update UI
      const tagToRemove = selectedTags.find(t => t.id === tagId);
      if (tagToRemove) {
        setAvailableTags(prev => [...prev, tagToRemove]);
      }
      
      setSelectedTags(prev => prev.filter(t => t.id !== tagId));
      
      if (onTagsChange) {
        onTagsChange(selectedTags.filter(t => t.id !== tagId));
      }
      
      return true;
    } catch (error) {
      console.error("Error removing tag from receipt:", error);
      toast({
        title: "Error",
        description: "Failed to remove tag",
        variant: "destructive",
      });
      return false;
    }
  };

  const handleSelect = async (value: string) => {
    setOpen(false);
    setInputValue("");
    
    if (value === "create-new" && inputValue.trim()) {
      const newTag = await createTag(inputValue);
      if (newTag) {
        await addTagToReceipt(newTag);
      }
    } else {
      const selectedTag = availableTags.find(tag => tag.id === value);
      if (selectedTag) {
        await addTagToReceipt(selectedTag);
      }
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading tags...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 mb-2">
        {selectedTags.map(tag => (
          <Badge key={tag.id} variant="secondary" className="flex items-center gap-1">
            <Tag className="h-3 w-3" />
            {tag.name}
            <button 
              className="ml-1 rounded-full outline-none focus:shadow-outline hover:bg-gray-300/20"
              onClick={() => removeTagFromReceipt(tag.id)}
              type="button"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            role="combobox" 
            aria-expanded={open} 
            className="w-full justify-between"
            onClick={() => {
              setOpen(true);
              setTimeout(() => inputRef.current?.focus(), 0);
            }}
            type="button"
          >
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              <span>Add tags...</span>
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          {/* Using a key to force remount of Command component when open state changes */}
          {open && (
            <Command key={`command-${open}`}>
              <CommandInput 
                placeholder="Search or create tag..." 
                ref={inputRef}
                value={inputValue}
                onValueChange={setInputValue}
              />
              <CommandList>
                <CommandEmpty>
                  {inputValue.trim() ? (
                    <CommandItem
                      value="create-new"
                      className="flex items-center gap-2 text-sm"
                      onSelect={() => handleSelect("create-new")}
                    >
                      <Plus className="h-4 w-4" />
                      Create "{inputValue.trim()}"
                    </CommandItem>
                  ) : (
                    <p className="py-2 px-4 text-sm">No tags found</p>
                  )}
                </CommandEmpty>
                {availableTags.length > 0 && (
                  <CommandGroup heading="Available Tags">
                    {availableTags.map(tag => (
                      <CommandItem 
                        key={tag.id}
                        value={tag.id}
                        onSelect={handleSelect}
                        className="flex items-center gap-2"
                      >
                        <Tag className="h-4 w-4 flex-shrink-0" />
                        {tag.name}
                        <Check 
                          className={`ml-auto h-4 w-4 ${
                            selectedTags.some(t => t.id === tag.id) ? "opacity-100" : "opacity-0"
                          }`}
                        />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default TagInput;
