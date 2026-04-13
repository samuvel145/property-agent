'use client';

import { useState, useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';
import QuickReplies from './QuickReplies';
import TypingIndicator from './TypingIndicator';

interface Message {
  id: string;
  role: 'bot' | 'user';
  text: string;
  cards?: any[];
}

interface ConvState {
  step: 'GREETING' | 'CITY' | 'LOCATION' | 'PROPERTY_TYPE' | 'CONFIG' | 'RESULTS';
  city?: string;
  location?: string;
  propertyType?: string;
  config?: string;
}

export default function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [convState, setConvState] = useState<ConvState>({ step: 'GREETING' });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, quickReplies]);

  useEffect(() => {
    startWelcomeFlow();
  }, []);

  const generateUniqueId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const addBotMessage = (text: string, cards?: any[]) => {
    setMessages(prev => [...prev, { id: generateUniqueId(), role: 'bot', text, cards }]);
  };

  const startWelcomeFlow = () => {
    setMessages([
      {
        id: generateUniqueId(),
        role: 'bot',
        text: "Hi! Welcome to JLL Properties. I'm here to help you find your dream home. What are you looking for?",
      },
    ]);
    setQuickReplies(['Buy a Home', 'Rent a Property', 'Commercial Space', 'Just Exploring']);
    setConvState({ step: 'GREETING' });
  };

  // Phase 2 Logic: Rule-Based Guided Flow
  const handleQuickReply = async (reply: string) => {
    // Add user message
    setMessages(prev => [...prev, { id: generateUniqueId(), role: 'user', text: reply }]);
    setQuickReplies([]); // Hide immediately
    
    // Check if we are in the rule-based structured flow (Phase 2 step 9)
    if (convState.step === 'GREETING') {
      addBotMessage("Great! Which city are you looking in?");
      setQuickReplies(["Chennai", "Bangalore", "Mumbai", "Hyderabad", "Other"]);
      setConvState({ ...convState, step: 'CITY' });
      return;
    }

    if (convState.step === 'CITY') {
      const city = reply === 'Other' ? 'All' : reply;
      setConvState({ ...convState, step: 'LOCATION', city });
      
      setIsTyping(true);
      try {
        const res = await fetch(`/api/properties?action=getLocations&city=${encodeURIComponent(city)}`);
        const data = await res.json();
        setIsTyping(false);
        addBotMessage(`Which area in ${city}?`);
        setQuickReplies([...(data.data || []).slice(0, 10), "Any Area"]);
      } catch (e) {
        setIsTyping(false);
        addBotMessage(`Which area in ${city}?`);
        setQuickReplies(["Any Area"]);
      }
      return;
    }

    if (convState.step === 'LOCATION') {
      const location = reply === 'Any Area' ? undefined : reply;
      setConvState({ ...convState, step: 'PROPERTY_TYPE', location });
      addBotMessage("What type of property?");
      setQuickReplies(["Apartments", "Villas", "Villaments", "Commercial"]);
      return;
    }

    if (convState.step === 'PROPERTY_TYPE') {
      setConvState({ ...convState, step: 'CONFIG', propertyType: reply });
      addBotMessage("Any preference on size?");
      setQuickReplies(["2 BHK", "3 BHK", "4 BHK", "Any"]);
      return;
    }

    if (convState.step === 'CONFIG') {
      const config = reply === 'Any' ? undefined : reply;
      const finalState = { ...convState, step: 'RESULTS' as const, config };
      setConvState(finalState);
      
      // TRIGGER SEARCH
      await executeSearch(finalState);
      return;
    }

    // Step 10: Retry flows
    if (convState.step === 'RESULTS') {
      if (reply === 'Try Different Area') {
        setConvState({ ...convState, step: 'LOCATION', location: undefined });
        setIsTyping(true);
        try {
          const res = await fetch(`/api/properties?action=getLocations&city=${encodeURIComponent(convState.city || '')}`);
          const data = await res.json();
          setIsTyping(false);
          addBotMessage(`Which area in ${convState.city}?`);
          setQuickReplies([...(data.data || []).slice(0, 10), "Any Area"]);
        } catch (e) {
          setIsTyping(false);
          addBotMessage(`Which area in ${convState.city}?`);
          setQuickReplies(["Any Area"]);
        }
        return;
      }
      if (reply === 'Try Different Type') {
        setConvState({ ...convState, step: 'PROPERTY_TYPE', propertyType: undefined });
        addBotMessage("What type of property?");
        setQuickReplies(["Apartments", "Villas", "Villaments", "Commercial"]);
        return;
      }
      if (reply.startsWith('Search All of')) {
        const resetState = { ...convState, step: 'RESULTS' as const, location: undefined, propertyType: undefined, config: undefined };
        setConvState(resetState);
        await executeSearch(resetState);
        return;
      }
    }

    // If it's a quick reply but not part of guided flow (e.g. from an AI suggestion), send to Groq
    await processWithGroq(reply);
  };

  const processWithGroq = async (text: string) => {
    setIsTyping(true);
    setQuickReplies([]);

    try {
      // Step 16: Send only last 10 messages
      const historyToSend = messages.slice(-10).map(m => ({
        role: m.role === 'bot' ? 'assistant' : m.role,
        content: m.text || (m.cards ? `(Displayed ${m.cards.length} property results)` : '')
      }));
      // Append new message
      historyToSend.push({ role: 'user', content: text });

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: historyToSend }),
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();
      setIsTyping(false);

      if (data.type === 'error') {
        addBotMessage(data.message);
        setQuickReplies(['Try Again']);
        return;
      }

      addBotMessage(data.message);

      if (data.type === 'properties' && data.data && data.data.length > 0) {
        // Render property cards
        const propertyCards = data.data.slice(0, 5).map((prop: any, index: number) => {
          let price = 'Price on request';
          if (prop.configs?.[0]?.FinalPrice) {
            price = `₹${(prop.configs[0].FinalPrice / 100000).toFixed(1)}L`;
          }

          let area = prop.configs?.[0]?.Super_Built_Up_Area || 'Area on request';
          let developer = prop.developer?.[0]?.Connection_Name || 'Premium Developer';
          let title = prop.Project_Name_Original || `Property ${index + 1}`;
          let location = prop.Location || 'Prime Location';
          let city = prop.City || data.toolArgs?.city || 'City';
          let image = prop.files?.[0]?.Project_File_Path || '/property-placeholder.jpg';

          return {
            id: prop.id || `prop-${index}`,
            title,
            location: `${location}, ${city}`,
            price,
            type: prop.Project_Type || 'Apartment',
            area,
            status: prop.State_Of_Construction || 'Available',
            image,
            developer,
            rera: prop.RERA_No || 'RERA Registered',
          };
        });

        addBotMessage("Here are the top matches:", propertyCards);
      }

    } catch (error) {
      console.error('Groq API error:', error);
      setIsTyping(false);
      addBotMessage("Oops! I had trouble fetching properties. Please try again.");
      setQuickReplies(['Try Again']);
    }
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;
    const text = inputValue.trim();
    setInputValue('');
    
    setMessages(prev => [...prev, { id: generateUniqueId(), role: 'user', text }]);
    
    // Free text always skips guided flow and goes to Groq
    processWithGroq(text);
  };

  const executeSearch = async (state: ConvState) => {
    setIsTyping(true);
    try {
      const searchParams = new URLSearchParams();
      if (state.city && state.city !== 'All') searchParams.append('city', state.city);
      if (state.location) searchParams.append('location', state.location);
      if (state.propertyType) searchParams.append('property_type', state.propertyType);

      const response = await fetch(`/api/properties?${searchParams}`);
      const data = await response.json();
      setIsTyping(false);

      const properties = data.data || [];
      const locationLabel = state.location ? `${state.location}, ${state.city}` : state.city;

      if (properties.length === 0) {
        addBotMessage(`I couldn't find any ${state.propertyType || 'properties'} in ${locationLabel} right now. Would you like to try a different area or property type?`);
        setQuickReplies(['Try Different Area', 'Try Different Type', `Search All of ${state.city}`]);
        return;
      }

      addBotMessage(`Here are ${properties.length} properties matching your search in ${locationLabel}:`);

      const propertyCards = properties.slice(0, 5).map((prop: any, index: number) => {
        let price = 'Price on request';
        if (prop.configs?.[0]?.FinalPrice) {
          price = `₹${(prop.configs[0].FinalPrice / 100000).toFixed(1)}L`;
        }

        let area = prop.configs?.[0]?.Super_Built_Up_Area || 'Area on request';
        let developer = prop.developer?.[0]?.Connection_Name || 'Premium Developer';
        let title = prop.Project_Name_Original || `Property ${index + 1}`;
        let location = prop.Location || 'Prime Location';
        let city = prop.City || state.city;
        let image = prop.files?.[0]?.Project_File_Path || '/property-placeholder.jpg';

        return {
          id: prop.id || `prop-${index}`,
          title,
          location: `${location}, ${city}`,
          price,
          type: prop.Project_Type || 'Apartment',
          area,
          status: prop.State_Of_Construction || 'Available',
          image,
          developer,
          rera: prop.RERA_No || 'RERA Registered',
        };
      });

      addBotMessage("Top matches:", propertyCards);
    } catch (error) {
      setIsTyping(false);
      addBotMessage("Oops! I had trouble fetching properties. Please try again.");
      setQuickReplies(['Try Again']);
    }
  };

  const handleRestart = () => {
    // Step 18 confirmation
    if (messages[messages.length - 1]?.text === "Start a new search?") return; // Prevent double click
    addBotMessage("Start a new search?");
    setQuickReplies(["Yes", "No"]);
    
    // We hack the quick reply handler for this specifically
    const tempHandler = (reply: string) => {
      if (reply === "Yes") {
        setMessages([]);
        setInputValue('');
        startWelcomeFlow();
      } else {
        // Remove the confirmation message
        setMessages(prev => prev.slice(0, -1));
        setQuickReplies([]);
      }
    };
    
    // Override the onSelect for the restart prompt temporarily
    // React state closures make this specific case tricky, so we inject a flag into quickReplies if we could,
    // but the easiest way is to let handleQuickReply catch Yes/No if we add a top-level condition
  };

  // We add a wrapper to handle the Yes/No restart flow
  const wrapperHandleQuickReply = (reply: string) => {
    if (reply === "Yes" && messages[messages.length - 1]?.text === "Start a new search?") {
      setMessages([]);
      setInputValue('');
      startWelcomeFlow();
      return;
    }
    if (reply === "No" && messages[messages.length - 1]?.text === "Start a new search?") {
      setMessages(prev => prev.slice(0, -1));
      setQuickReplies([]);
      return;
    }
    handleQuickReply(reply);
  };

  // Mobile responsiveness handled with tailwind classes (sm: md:)
  return (
    <div className="flex flex-col h-[100dvh] sm:h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-sm">JLL</span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">JLL Property Assistant</h3>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-xs text-gray-500">Online</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full hidden sm:block">AI Powered</span>
          <button
            onClick={handleRestart}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Start over"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} {...message} />
        ))}
        {isTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Replies */}
      {quickReplies.length > 0 && !isTyping && (
        <div className="px-4 py-2 bg-white border-t border-gray-200">
          <QuickReplies options={quickReplies} onSelect={wrapperHandleQuickReply} />
        </div>
      )}

      {/* Input Bar */}
      <div className="bg-white border-t border-gray-200 px-4 py-3">
        <div className="flex items-center space-x-3">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type a message or ask anything..."
            disabled={isTyping}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 disabled:bg-gray-100 text-sm sm:text-base"
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isTyping}
            className="p-2 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 break-keep min-w-10 min-h-10 transition-colors flex items-center justify-center font-semibold"
          >
            <svg className="w-5 h-5 sm:w-4 sm:h-4 sm:mr-0 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        {isTyping && (
          <p className="text-xs text-gray-500 mt-2 text-center">JLL Assistant is thinking...</p>
        )}
      </div>
    </div>
  );
}
