'use client';

import { useState, useEffect } from 'react';

interface QuickRepliesProps {
  options: string[];
  onSelect: (option: string) => void;
  disabled?: boolean;
}

export default function QuickReplies({ options, onSelect, disabled }: QuickRepliesProps) {
  const [selected, setSelected] = useState<string | null>(null);

  // Reset selected state when options change
  useEffect(() => {
    setSelected(null);
  }, [options]);

  const handleClick = (option: string) => {
    setSelected(option);
    onSelect(option);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option, index) => (
        <button
          key={`${option}-${index}`}
          onClick={() => handleClick(option)}
          disabled={disabled || false}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all transform active:scale-95 ${
            selected === option
              ? 'bg-blue-600 text-white'
              : 'bg-white text-blue-600 border border-blue-200 hover:bg-blue-50 hover:border-blue-300'
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
