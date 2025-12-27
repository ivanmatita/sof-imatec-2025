
import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, X, Bot, User, Minimize2, Maximize2, Loader2 } from 'lucide-react';
import { getAIBusinessAssistantResponse } from '../services/geminiService';
import { Invoice, Purchase, Client } from '../types';

interface AIAssistantProps {
  invoices: Invoice[];
  purchases: Purchase[];
  clients: Client[];
}

const AIAssistant: React.FC<AIAssistantProps> = ({ invoices, purchases, clients }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'bot', content: string }[]>([
    { role: 'bot', content: 'Olá! Sou o FaturaPro AI. Como posso ajudar com a gestão do seu negócio hoje?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const response = await getAIBusinessAssistantResponse(userMsg, { invoices, purchases, clients });
      setMessages(prev => [...prev, { role: 'bot', content: response || 'Não recebi uma resposta.' }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'bot', content: 'Erro ao conectar com a IA.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 z-[60] bg-indigo-600 text-white p-4 rounded-full shadow-2xl hover:bg-indigo-700 transition-all transform hover:scale-110 animate-bounce flex items-center gap-2 group"
      >
        <Sparkles size={24}/>
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 font-bold whitespace-nowrap">Assistente AI</span>
      </button>
    );
  }

  return (
    <div className={`fixed bottom-6 left-6 z-[60] bg-white rounded-2xl shadow-2xl border border-indigo-100 flex flex-col transition-all duration-300 ${isMinimized ? 'h-16 w-64' : 'h-[500px] w-[380px]'} overflow-hidden`}>
      <div className="bg-indigo-600 text-white p-4 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <div className="bg-white/20 p-1.5 rounded-lg"><Bot size={18}/></div>
          <span className="font-bold text-sm">FaturaPro AI</span>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setIsMinimized(!isMinimized)} className="p-1 hover:bg-white/10 rounded">
            {isMinimized ? <Maximize2 size={16}/> : <Minimize2 size={16}/>}
          </button>
          <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/10 rounded"><X size={16}/></button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 custom-scrollbar">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                  msg.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-tr-none' 
                  : 'bg-white text-slate-700 border border-slate-200 shadow-sm rounded-tl-none'
                }`}>
                  <p className="whitespace-pre-line">{msg.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-slate-200 shadow-sm flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-indigo-600"/>
                  <span className="text-xs text-slate-400">A pensar...</span>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t bg-white">
            <div className="flex gap-2 bg-slate-100 p-2 rounded-xl border border-slate-200">
              <input 
                className="flex-1 bg-transparent text-sm outline-none px-2"
                placeholder="Pergunte algo sobre o seu negócio..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
              />
              <button 
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                <Send size={18}/>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AIAssistant;
