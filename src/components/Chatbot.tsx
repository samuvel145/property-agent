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

export default function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Safety: Force typing to stop after 10 seconds max
  useEffect(() => {
    if (isTyping) {
      const timeout = setTimeout(() => {
        setIsTyping(false);
      }, 10000);
      return () => clearTimeout(timeout);
    }
  }, [isTyping]);

  useEffect(() => {
    const welcomeMessage: Message = {
      id: '1',
      role: 'bot',
      text: "Welcome! I'm your Property Assistant. With access to 40,000+ premium properties across India's top cities, I can help you find your perfect space. Ask me anything about real estate — property search, market trends, investment tips, home loans, or just tell me what you're looking for! 🏠",
    };
    setMessages([welcomeMessage]);
    setQuickReplies(['Buy a Home', 'Rent a Property', 'Commercial Space', 'Investment Advice']);
  }, []);

  const generateUniqueId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const handleQuickReply = (reply: string) => {
    const userMessage: Message = {
      id: generateUniqueId(),
      role: 'user',
      text: reply,
    };
    setMessages(prev => [...prev, userMessage]);
    setQuickReplies([]);
    processWithAI([...messages, userMessage]);
  };

  /**
   * Core AI processing: sends the full conversation to Groq,
   * gets a natural response, and optionally triggers a property search.
   */
  const processWithAI = async (conversationHistory: Message[]) => {
    setIsTyping(true);

    try {
      // Send conversation to Groq AI
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: conversationHistory.map(m => ({
            role: m.role,
            text: m.text,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();

      // Add the AI's conversational response
      const botMessage: Message = {
        id: generateUniqueId(),
        role: 'bot',
        text: data.message,
      };
      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);

      // Set contextual quick replies from AI
      if (data.quick_replies && data.quick_replies.length > 0) {
        setQuickReplies(data.quick_replies);
      } else {
        setQuickReplies([]);
      }

      // If AI determined we should search properties, do it
      if (data.action === 'search_properties' && data.search_params?.city) {
        await searchProperties(data.search_params);
      }
    } catch (error) {
      console.error('AI processing error:', error);
      setIsTyping(false);

      // Fallback: still give a helpful response, don't just loop
      const fallbackMessage: Message = {
        id: generateUniqueId(),
        role: 'bot',
        text: "I'm having a little trouble connecting right now, but I'm still here to help! Could you try again? Whether you're looking to buy, rent, or just need some property advice, I've got you covered. 😊",
      };
      setMessages(prev => [...prev, fallbackMessage]);
      setQuickReplies(['Buy a Home', 'Rent a Property', 'Ask a Question']);
    }
  };

  /**
   * Search JLL API for properties and display cards
   */
  const searchProperties = async (params: {
    city?: string;
    location?: string;
    property_type?: string;
    config?: string;
    intent?: string;
  }) => {
    const searchMessageId = generateUniqueId();
    const locationLabel = params.location && params.location !== 'null' 
      ? `${params.location}, ${params.city}` 
      : params.city;

    // Show searching message
    const searchMessage: Message = {
      id: searchMessageId,
      role: 'bot',
      text: `🔍 Searching properties in ${locationLabel}...`,
    };
    setMessages(prev => [...prev, searchMessage]);

    const fetchWithTimeout = (url: string, timeout = 5000) => {
      return Promise.race([
        fetch(url),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), timeout)
        ),
      ]) as Promise<Response>;
    };

    try {
      const searchParams = new URLSearchParams();
      if (params.city && params.city !== 'null') searchParams.append('city', params.city);
      if (params.location && params.location !== 'null') searchParams.append('location', params.location);
      if (params.property_type && params.property_type !== 'null') searchParams.append('property_type', params.property_type);

      const response = await fetchWithTimeout(
        `${process.env.NEXT_PUBLIC_JLL_API_BASE_URL}/user/search/projects?${searchParams}`
      );

      if (!response.ok) throw new Error('API request failed');

      const data = await response.json();
      const properties = data.data || [];

      if (properties.length === 0) {
        setMessages(prev =>
          prev.map(msg =>
            msg.id === searchMessageId
              ? { ...msg, text: `I couldn't find exact matches in ${locationLabel} right now. Let me know if you'd like to try a different area or expand the search criteria! 🔄` }
              : msg
          )
        );
        setQuickReplies(['Try Different Area', 'Change City', 'Broaden Search']);
        return;
      }

      // Update search message with results count
      setMessages(prev =>
        prev.map(msg =>
          msg.id === searchMessageId
            ? { ...msg, text: `✅ Found ${properties.length} properties in ${locationLabel}! Here are the top picks:` }
            : msg
        )
      );

      // Build property cards
      const propertyCards = properties.slice(0, 5).map((prop: any, index: number) => {
        let price = 'Price on request';
        if (prop.configs && prop.configs[0]) {
          const finalPrice = prop.configs[0].FinalPrice || prop.configs[0].Price || prop.configs[0].price;
          if (finalPrice) {
            price = `₹${(finalPrice / 100000).toFixed(1)}L`;
          }
        } else if (prop.Price || prop.price) {
          price = `₹${((prop.Price || prop.price) / 100000).toFixed(1)}L`;
        }

        let area = 'Area on request';
        if (prop.configs && prop.configs[0]) {
          area = prop.configs[0].Super_Built_Up_Area || prop.configs[0].Area || 'Area on request';
        } else if (prop.Super_Built_Up_Area || prop.Area) {
          area = prop.Super_Built_Up_Area || prop.Area;
        }

        let developer = 'Premium Developer';
        if (prop.developer && prop.developer[0]) {
          developer = prop.developer[0].Connection_Name || prop.developer[0].name || 'Premium Developer';
        } else if (prop.Developer || prop.developer_name) {
          developer = prop.Developer || prop.developer_name;
        }

        const title = prop.Project_Name_Original || prop.Project_Name || prop.name || `Property ${index + 1}`;
        const location = prop.Location || prop.location || 'Prime Location';
        const city = prop.City || prop.city || params.city;

        let image = '/property-placeholder.jpg';
        if (prop.files && prop.files[0]) {
          image = prop.files[0].Project_File_Path || prop.files[0].url || '/property-placeholder.jpg';
        } else if (prop.Image || prop.image) {
          image = prop.Image || prop.image;
        }

        return {
          id: prop.id || prop._id || prop.Project_ID || `prop-${index}`,
          title,
          location: `${location}, ${city}`,
          price,
          type: prop.Project_Type || prop.Type || params.property_type || 'Apartment',
          area,
          status: prop.State_Of_Construction || prop.Status || 'Available',
          image,
          developer,
          rera: prop.RERA_No || prop.RERA || 'RERA Registered',
        };
      });

      const resultsMessage: Message = {
        id: generateUniqueId(),
        role: 'bot',
        text: 'Here are the best matches:',
        cards: propertyCards,
      };

      setMessages(prev => [...prev, resultsMessage]);
      setQuickReplies(['View More', 'Refine Search', 'Different City', 'Contact Agent']);
    } catch (error) {
      console.error('Search error:', error);

      setMessages(prev =>
        prev.map(msg =>
          msg.id === searchMessageId
            ? { ...msg, text: `I had trouble fetching live listings right now. But I can still help! Tell me more about what you're looking for and I'll guide you with my knowledge. 💡` }
            : msg
        )
      );
      setQuickReplies(['Try Again', 'Ask a Question', 'Different City']);
    }
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: generateUniqueId(),
      role: 'user',
      text: inputValue,
    };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputValue;
    setInputValue('');
    setQuickReplies([]);
    processWithAI([...messages, userMessage]);
  };

  const handleRestart = () => {
    setMessages([
      {
        id: '1',
        role: 'bot',
        text: "Hi! Welcome back to JLL Properties. I'm here to help you with anything related to real estate — buying, renting, investing, or just getting advice. What's on your mind? 🏡",
      },
    ]);
    setQuickReplies(['Buy a Home', 'Rent a Property', 'Commercial Space', 'Investment Advice']);
    setInputValue('');
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-sm">JLL</span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Property Assistant</h3>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-xs text-gray-500">Online</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full">AI Powered</span>
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
      {quickReplies.length > 0 && (
        <div className="px-4 py-2 bg-white border-t border-gray-200">
          <QuickReplies options={quickReplies} onSelect={handleQuickReply} />
        </div>
      )}

      {/* Input Bar */}
      <div className="bg-white border-t border-gray-200 px-4 py-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
            N
          </div>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type a message or ask anything..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
