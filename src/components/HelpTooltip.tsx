'use client';

import { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';

interface HelpTooltipProps {
  title: string;
  content: string | string[];
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export default function HelpTooltip({ title, content, position = 'top' }: HelpTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  const contentArray = Array.isArray(content) ? content : [content];

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-gray-800',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-gray-800',
    left: 'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-gray-800',
    right: 'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-gray-800',
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className="text-gray-400 hover:text-blue-400 transition-colors"
        aria-label="Help"
      >
        <HelpCircle className="w-4 h-4" />
      </button>

      {isOpen && (
        <div
          className={`absolute z-50 ${positionClasses[position]} w-72`}
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h4 className="font-medium text-white text-sm">{title}</h4>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white flex-shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-2">
              {contentArray.map((text, idx) => (
                <p key={idx} className="text-xs text-gray-300 leading-relaxed">
                  {text}
                </p>
              ))}
            </div>
          </div>
          <div className={`absolute w-0 h-0 border-8 ${arrowClasses[position]}`} />
        </div>
      )}
    </div>
  );
}
