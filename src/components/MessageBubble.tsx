'use client';

import PropertyCard from './PropertyCard';

interface MessageBubbleProps {
  role: 'bot' | 'user';
  text: string;
  cards?: Array<Record<string, unknown>>;
}

export default function MessageBubble({ role, text, cards }: MessageBubbleProps) {
  const isBot = role === 'bot';

  return (
    <div className="mb-4">
      {/* Message Bubble */}
      <div className={`flex ${isBot ? 'justify-start' : 'justify-end'}`}>
        <div className={`flex ${isBot ? 'space-x-2' : 'space-x-2'} max-w-[75%]`}>
          {isBot && (
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
              <span className="text-white font-bold text-xs">JLL</span>
            </div>
          )}
          <div className={`${isBot ? 'bg-white border border-gray-200' : 'bg-blue-600 text-white'} 
            rounded-2xl px-4 py-3 ${isBot ? 'rounded-bl-sm' : 'rounded-br-sm'} 
            shadow-sm`}>
            <p className={`text-sm leading-relaxed ${isBot ? 'text-gray-800' : 'text-white'}`}>
              {text}
            </p>
          </div>
        </div>
      </div>
      
      {/* Property Cards - Full Width Below Message */}
      {cards && cards.length > 0 && (
        <div className={`mt-3 ${isBot ? 'ml-10' : 'mr-4'}`}>
          <div className="flex space-x-4 overflow-x-auto pb-2">
            {cards.map((property, index) => (
              <div key={property.id || index} className="flex-shrink-0">
                <PropertyCard project={property} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
