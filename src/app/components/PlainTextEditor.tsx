import React from 'react';

interface PlainTextEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export const PlainTextEditor = ({ value, onChange }: PlainTextEditorProps) => {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="plain-text-editor-container">
      <textarea
        className="plain-text-editor"
        value={value}
        onChange={handleChange}
        placeholder="Write your journal entry here..."
        rows={15}
      />
      <style jsx>{`
        .plain-text-editor-container {
          width: 100%;
        }
        
        .plain-text-editor {
          width: 100%;
          padding: 1rem;
          font-size: 1rem;
          line-height: 1.5;
          border: 1px solid #e2e8f0;
          border-radius: 0.375rem;
          background-color: #fff;
          color: #1a202c;
          resize: vertical;
          min-height: 200px;
          outline: none;
          transition: border-color 0.2s ease;
        }
        
        .plain-text-editor:focus {
          border-color: #4299e1;
          box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.15);
        }
        
        /* Dark mode support */
        :global(.dark) .plain-text-editor {
          background-color: #2d3748;
          border-color: #4a5568;
          color: #e2e8f0;
        }
        
        :global(.dark) .plain-text-editor:focus {
          border-color: #63b3ed;
        }
      `}</style>
    </div>
  );
};
