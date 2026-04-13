'use client';

import { useEffect, useState } from 'react';

interface QuickRepliesProps {
  options: string[];
  onSelect: (option: string) => void;
  disabled?: boolean;
}

export default function QuickReplies({ options, onSelect, disabled }: QuickRepliesProps) {
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    // #region agent log
    fetch('/api/debug-log',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'ebb559',runId:'pre-fix',hypothesisId:'H1',location:'src/components/QuickReplies.tsx:useEffect:options',message:'Quick reply options changed',data:{selectedBeforeReset:selected,options,selectedStillPresent:selected ? options.includes(selected) : false},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  }, [options, selected]);

  const handleClick = (option: string) => {
    // #region agent log
    fetch('/api/debug-log',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'ebb559',runId:'pre-fix',hypothesisId:'H2',location:'src/components/QuickReplies.tsx:handleClick',message:'Quick reply clicked',data:{option,optionsAtClick:options,selectedBeforeClick:selected},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
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
            selected === option && options.includes(selected)
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
