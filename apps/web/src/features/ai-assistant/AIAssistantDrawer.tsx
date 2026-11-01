import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '../../api/client';
import { BuildingModel } from '@buildplanner/building-model';
import { Button } from '../../components/ui/Button';
import { Sparkles, Send, Bot, User, CheckCircle2, AlertCircle } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'USER' | 'AI';
  text: string;
  commandSummary?: string;
}

interface AIAssistantDrawerProps {
  projectId: string;
  model: BuildingModel;
  activeLevelIndex: number;
  onModelUpdate: (updatedModel: BuildingModel) => void;
}

export const AIAssistantDrawer: React.FC<AIAssistantDrawerProps> = ({
  projectId,
  model,
  activeLevelIndex,
  onModelUpdate
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'AI',
      text: 'Hello! I am your BuildPlanner AI copilot. I modify the actual parametric BuildingModel instead of generating images. Try asking me to resize rooms, adjust staircases, or add balconies.'
    }
  ]);
  const [inputPrompt, setInputPrompt] = useState('');

  const chatMutation = useMutation({
    mutationFn: async (messageText: string) => {
      const res: any = await apiFetch(`/projects/${projectId}/ai/chat`, {
        method: 'POST',
        body: JSON.stringify({
          message: messageText,
          activeLevelIndex
        })
      });
      return res;
    },
    onSuccess: (data, variables) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg_ai_${Date.now()}`,
          sender: 'AI',
          text: data.reply,
          commandSummary: data.operationApplied ? 'Blueprint Model Updated' : undefined
        }
      ]);

      if (data.operationApplied && data.buildingModel) {
        onModelUpdate(data.buildingModel);
      }
    },
    onError: (err: any) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg_err_${Date.now()}`,
          sender: 'AI',
          text: `Error executing command: ${err.message || 'Geometric conflict'}`
        }
      ]);
    }
  });

  const handleSend = (textToSend?: string) => {
    const prompt = textToSend || inputPrompt;
    if (!prompt.trim() || chatMutation.isPending) return;

    setMessages((prev) => [
      ...prev,
      {
        id: `msg_user_${Date.now()}`,
        sender: 'USER',
        text: prompt
      }
    ]);
    setInputPrompt('');
    chatMutation.mutate(prompt);
  };

  const quickPrompts = [
    'Make master bedroom 12 by 14 feet',
    'Add a balcony to the first floor',
    'Make staircase U-shaped'
  ];

  return (
    <div className="h-full flex flex-col bg-slate-900/95 border-l border-slate-800 text-slate-100">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center gap-2">
        <div className="h-7 w-7 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">AI Architecture Copilot</h3>
          <p className="text-[10px] text-slate-400 font-mono">Parametric Model Mutation Active</p>
        </div>
      </div>

      {/* Message Stream */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex items-start gap-2.5 ${m.sender === 'USER' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <div
              className={`h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs ${
                m.sender === 'USER'
                  ? 'bg-sky-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-sky-400 border border-slate-700'
              }`}
            >
              {m.sender === 'USER' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </div>

            <div
              className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                m.sender === 'USER'
                  ? 'bg-sky-500 text-white rounded-tr-none'
                  : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-none font-mono whitespace-pre-wrap'
              }`}
            >
              {m.text}
              {m.commandSummary && (
                <div className="mt-2 pt-2 border-t border-slate-800 flex items-center gap-1 text-[11px] text-emerald-400 font-sans font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>{m.commandSummary}</span>
                </div>
              )}
            </div>
          </div>
        ))}

        {chatMutation.isPending && (
          <div className="flex items-center gap-2 text-xs text-sky-400 font-mono animate-pulse">
            <Bot className="h-4 w-4" />
            <span>Calculating geometric mutations & checking setbacks...</span>
          </div>
        )}
      </div>

      {/* Quick Prompts */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
        <span className="text-[10px] uppercase font-mono text-slate-500 block mb-1.5 font-semibold">Suggested Operations</span>
        <div className="flex flex-wrap gap-1.5">
          {quickPrompts.map((qp) => (
            <button
              key={qp}
              onClick={() => handleSend(qp)}
              className="px-2 py-1 rounded bg-slate-800/70 hover:bg-slate-700/80 border border-slate-700 text-[10px] text-slate-300 transition-colors text-left"
            >
              {qp}
            </button>
          ))}
        </div>
      </div>

      {/* Input Form */}
      <div className="p-3 border-t border-slate-800 flex items-center gap-2">
        <input
          type="text"
          value={inputPrompt}
          onChange={(e) => setInputPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSend();
          }}
          placeholder="e.g. Make master bedroom 12 by 14 feet..."
          className="flex-1 rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
        />
        <Button
          size="sm"
          onClick={() => handleSend()}
          disabled={!inputPrompt.trim() || chatMutation.isPending}
          className="px-3"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
