import React, { useState, useEffect } from 'react';
import { Tag } from '@/types/tags';
import { getTags, createTag } from '@/utils/tagUtils';

interface TagInputProps {
  selectedTags: Tag[];
  onChange: (tags: Tag[]) => void;
}

export function TagInput({ selectedTags, onChange }: TagInputProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    try {
      setLoading(true);
      const fetchedTags = await getTags();
      setTags(fetchedTags);
    } catch (error) {
      console.error('Error loading tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault();
      const newTagName = input.trim().toLowerCase();
      
      // Check if tag already exists
      let tag = tags.find(t => t.name.toLowerCase() === newTagName);
      
      if (!tag) {
        try {
          // Create new tag
          const newTag = await createTag(newTagName);
          tag = newTag;
          setTags([...tags, newTag]);
        } catch (error) {
          console.error('Error creating tag:', error);
          return;
        }
      }
      
      // Add tag if not already selected
      if (tag && !selectedTags.find(t => t.id === tag.id)) {
        const updatedTags = [...selectedTags, tag];
        onChange(updatedTags);
      }
      
      setInput('');
    }
  };

  const removeTag = (tagToRemove: Tag) => {
    const updatedTags = selectedTags.filter(tag => tag.id !== tagToRemove.id);
    onChange(updatedTags);
  };

  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[42px] bg-white dark:bg-gray-800">
        {selectedTags.map(tag => (
          <span
            key={tag.id}
            className="flex items-center gap-1 px-2 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full"
          >
            {tag.name}
            <button
              onClick={() => removeTag(tag)}
              className="w-4 h-4 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={loading ? 'Loading tags...' : 'Type a tag and press Enter...'}
          className="flex-grow min-w-[120px] p-1 bg-transparent outline-none"
          disabled={loading}
        />
      </div>
      {tags.length > 0 && input && (
        <div className="mt-1 p-2 border rounded-md bg-white dark:bg-gray-800 shadow-lg">
          {tags
            .filter(tag => 
              tag.name.toLowerCase().includes(input.toLowerCase()) &&
              !selectedTags.find(st => st.id === tag.id)
            )
            .map(tag => (
              <div
                key={tag.id}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer rounded"
                onClick={() => {
                  onChange([...selectedTags, tag]);
                  setInput('');
                }}
              >
                {tag.name}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
