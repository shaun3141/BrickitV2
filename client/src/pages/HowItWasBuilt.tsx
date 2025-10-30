import { useState, useEffect } from 'react';
import { BarChart3, MessageSquare, Coins, User, Bot, TrendingUp, Clock, Zap, Code2, Timer, FileText, Wrench, Database, Brain, Search, Download } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ConversationMetadata {
  export_date: string;
  project: string;
  total_conversations: number;
  total_messages: number;
  total_tokens: {
    input: number;
    output: number;
    total: number;
  };
  estimated_total_cost_usd: number;
  secrets_scrubbed: number;
  total_ai_time_seconds?: number;
}

interface Message {
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  tokens: {
    input: number;
    output: number;
    thinking?: number;
  };
  model: string;
  fulfillmentTime?: number; // For user messages: time to last AI response in seconds
  context_usage?: {
    tokens_used: number;
    token_limit: number;
    percentage_remaining: number;
  };
  response_time_ms?: number;
  files_attached?: number;
  tool_calls?: number;
  codebase_chunks?: number;
  thinking?: {
    text: string;
    duration_ms: number;
  };
}

interface Conversation {
  workspace_id: string;
  title: string;
  message_count: number;
  user_messages: number;
  assistant_messages: number;
  tokens: {
    input: number;
    output: number;
    total: number;
  };
  estimated_cost_usd: number;
  messages: Message[];
  total_ai_time_seconds?: number; // Total time for all user requests in this conversation
}

interface ConversationsData {
  metadata: ConversationMetadata;
  conversations: Conversation[];
}

export default function HowItWasBuilt() {
  const [data, setData] = useState<ConversationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [expandedMessages, setExpandedMessages] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate fulfillment times for all messages
  const calculateFulfillmentTimes = (conversations: Conversation[]): Conversation[] => {
    let totalAiTimeSeconds = 0;

    const processedConversations = conversations.map(conv => {
      const messages = [...conv.messages];
      let conversationAiTime = 0;

      // Process each message
      for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        
        // Only process user messages
        if (msg.role === 'user') {
          // Find all subsequent assistant messages until the next user message
          let lastAssistantIdx = -1;
          for (let j = i + 1; j < messages.length; j++) {
            if (messages[j].role === 'assistant') {
              lastAssistantIdx = j;
            } else if (messages[j].role === 'user') {
              break; // Stop at next user message
            }
          }

          // Calculate time from user message to last assistant response
          if (lastAssistantIdx !== -1) {
            const userTime = new Date(msg.timestamp).getTime();
            const lastAssistantTime = new Date(messages[lastAssistantIdx].timestamp).getTime();
            const fulfillmentSeconds = Math.floor((lastAssistantTime - userTime) / 1000);
            
            messages[i] = { ...msg, fulfillmentTime: fulfillmentSeconds };
            conversationAiTime += fulfillmentSeconds;
          }
        }
      }

      totalAiTimeSeconds += conversationAiTime;

      return {
        ...conv,
        messages,
        total_ai_time_seconds: conversationAiTime
      };
    });

    return processedConversations;
  };

  useEffect(() => {
    fetch('/api/conversations/brickit')
      .then(res => res.json())
      .then(data => {
        // Sort conversations chronologically (earliest first)
        const sortedConversations = [...data.conversations].sort((a, b) => {
          const aTime = new Date(a.messages[0]?.timestamp || 0).getTime();
          const bTime = new Date(b.messages[0]?.timestamp || 0).getTime();
          return aTime - bTime;
        });

        // Calculate fulfillment times
        const conversationsWithTimes = calculateFulfillmentTimes(sortedConversations);
        
        // Calculate total AI time across all conversations
        const totalAiTime = conversationsWithTimes.reduce((sum, conv) => 
          sum + (conv.total_ai_time_seconds || 0), 0
        );

        setData({ 
          ...data, 
          conversations: conversationsWithTimes,
          metadata: {
            ...data.metadata,
            total_ai_time_seconds: totalAiTime
          }
        });

        // Check for hash in URL to jump to specific conversation
        const hash = window.location.hash;
        if (hash && hash.startsWith('#conv-')) {
          const workspaceId = hash.replace('#conv-', '');
          const targetConv = conversationsWithTimes.find(c => c.workspace_id === workspaceId);
          if (targetConv) {
            setSelectedConv(targetConv);
            // Scroll to the conversation in the sidebar
            setTimeout(() => {
              const element = document.getElementById(hash.substring(1));
              element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
          } else {
            // Default to first conversation
            setSelectedConv(conversationsWithTimes[0]);
          }
        } else if (conversationsWithTimes.length > 0) {
          // Auto-select the first conversation
          setSelectedConv(conversationsWithTimes[0]);
        }
        
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const toggleMessage = (index: number) => {
    const newExpanded = new Set(expandedMessages);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedMessages(newExpanded);
  };

  // Filter conversations based on search query
  const filteredConversations = data?.conversations.filter(conv =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Download JSON file
  const downloadJSON = () => {
    const link = document.createElement('a');
    link.href = '/api/conversations/brickit';
    link.download = 'brickit_conversations_public.json';
    link.click();
  };

  // Format time duration in seconds to human readable
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    }
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Format large time durations (for totals)
  const formatLargeDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    
    if (hours === 0) {
      return `${mins}m`;
    }
    return `${hours}h ${mins}m`;
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string): string => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600 mx-auto mb-4"></div>
            <Code2 className="w-6 h-6 text-purple-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          </div>
          <p className="text-slate-700 font-medium">Loading AI conversation history...</p>
          <p className="text-slate-500 text-sm mt-2">Analyzing thousands of messages</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Data</h2>
          <p className="text-slate-600">{error}</p>
          <p className="text-sm text-slate-500 mt-4">
            Make sure to run the conversation export notebook first.
          </p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <TooltipProvider>
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Animated Background Pattern */}
      <div className="fixed inset-0 opacity-30 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.1),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(168,85,247,0.1),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(236,72,153,0.1),transparent_50%)]"></div>
      </div>

      {/* Header */}
      <div className="relative bg-white/80 backdrop-blur-sm border-b border-purple-200 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-start justify-between gap-4 animate-fade-in">
            <div className="flex items-start gap-4">
              <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-3 rounded-2xl shadow-lg">
                <Code2 className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-5xl font-extrabold bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 bg-clip-text text-transparent mb-3">
                  How BrickIt Was Built
                </h1>
                <p className="text-slate-600 text-xl font-medium">
                  100% of this app was written by AI
                </p>
                <p className="text-slate-500 mt-2">
                  Every line of code, every feature, every bug fix—fully documented across {data?.metadata.total_conversations || 66} conversations.
                </p>
              </div>
            </div>
            <button
              onClick={downloadJSON}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all duration-200 font-medium"
            >
              <Download className="w-4 h-4" />
              Download JSON
            </button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Conversations Card */}
          <div className="group relative bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-xl p-6 transform hover:scale-105 transition-all duration-300 hover:shadow-2xl overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-3">
                <MessageSquare className="w-6 h-6 text-white/80" />
                <p className="text-sm font-medium text-white/90 uppercase tracking-wide">Conversations</p>
              </div>
              <p className="text-4xl font-extrabold text-white mb-1">
                {data.metadata.total_conversations}
              </p>
              <p className="text-white/70 text-sm">AI coding sessions</p>
            </div>
          </div>

          {/* Messages Card */}
          <div className="group relative bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-xl p-6 transform hover:scale-105 transition-all duration-300 hover:shadow-2xl overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-3">
                <TrendingUp className="w-6 h-6 text-white/80" />
                <p className="text-sm font-medium text-white/90 uppercase tracking-wide">Total Messages</p>
              </div>
              <p className="text-4xl font-extrabold text-white mb-1">
                {data.metadata.total_messages.toLocaleString()}
              </p>
              <p className="text-white/70 text-sm">Prompts and responses</p>
            </div>
          </div>

          {/* Tokens Card */}
          <div className="group relative bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl shadow-xl p-6 transform hover:scale-105 transition-all duration-300 hover:shadow-2xl overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-3">
                <Zap className="w-6 h-6 text-white/80" />
                <p className="text-sm font-medium text-white/90 uppercase tracking-wide">Total Tokens</p>
              </div>
              <p className="text-4xl font-extrabold text-white mb-1">
                {(data.metadata.total_tokens.total / 1_000_000).toFixed(1)}M
              </p>
              <p className="text-white/70 text-sm">{data.metadata.total_tokens.total.toLocaleString()} tokens processed</p>
            </div>
          </div>

          {/* AI Time Card */}
          <div className="group relative bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-xl p-6 transform hover:scale-105 transition-all duration-300 hover:shadow-2xl overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-3">
                <Timer className="w-6 h-6 text-white/80" />
                <p className="text-sm font-medium text-white/90 uppercase tracking-wide">Total AI Time</p>
              </div>
              <p className="text-4xl font-extrabold text-white mb-1">
                {data.metadata.total_ai_time_seconds 
                  ? formatLargeDuration(data.metadata.total_ai_time_seconds)
                  : '0m'}
              </p>
              <p className="text-white/70 text-sm">Time spent fulfilling requests</p>
            </div>
          </div>
        </div>

        {/* Main Content: Sidebar + Detail View */}
        <div className="flex gap-6 h-[calc(100vh-600px)] min-h-[600px] overflow-x-hidden">
          {/* Left Sidebar - Conversation List */}
          <div className="w-96 flex-shrink-0 bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden border border-purple-100 flex flex-col">
            <div className="px-6 py-5 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-b border-purple-200 flex-shrink-0">
              <div className="flex items-center gap-3 mb-2">
                <BarChart3 className="w-5 h-5 text-purple-600" />
                <h2 className="text-xl font-bold text-slate-900">
                  Conversations
                </h2>
                <span className="px-2.5 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                  {filteredConversations.length}
                </span>
              </div>
              {/* Search Bar */}
              <div className="relative mt-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="divide-y divide-slate-200 overflow-y-auto overflow-x-visible custom-scrollbar flex-1">
              {filteredConversations.map((conv, idx) => {
                const firstMessageTime = conv.messages[0]?.timestamp 
                  ? formatTimestamp(conv.messages[0].timestamp)
                  : '';
                
                return (
                <button
                  key={conv.workspace_id}
                  id={`conv-${conv.workspace_id}`}
                  onClick={() => {
                    setSelectedConv(conv);
                    window.history.pushState(null, '', `#conv-${conv.workspace_id}`);
                  }}
                  className={`w-full px-6 py-4 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 transition-all duration-200 text-left group border-l-4 ${
                    selectedConv?.workspace_id === conv.workspace_id
                      ? 'border-purple-500 bg-gradient-to-r from-purple-50 to-pink-50'
                      : 'border-transparent'
                  }`}
                >
                  <div className="flex items-start gap-3 mb-2">
                    <span className={`flex items-center justify-center w-7 h-7 bg-gradient-to-br from-purple-100 to-pink-100 text-purple-700 rounded-lg text-xs font-bold flex-shrink-0 group-hover:scale-110 transition-transform ${
                      selectedConv?.workspace_id === conv.workspace_id ? 'scale-110' : ''
                    }`}>
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-900 group-hover:text-purple-700 transition-colors line-clamp-2 mb-1">
                        {conv.title}
                      </p>
                      {firstMessageTime && (
                        <p className="text-xs text-slate-500 flex items-center gap-1 mb-2">
                          <Clock className="w-3 h-3" />
                          {firstMessageTime}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 ml-10 text-xs text-slate-600">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="flex items-center gap-1 bg-blue-50 px-1.5 py-0.5 rounded cursor-help">
                          <MessageSquare className="w-3 h-3 text-blue-600" />
                          <span className="font-medium text-blue-700">{conv.message_count}</span>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{conv.message_count} message{conv.message_count !== 1 ? 's' : ''} in this conversation</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="flex items-center gap-1 bg-purple-50 px-1.5 py-0.5 rounded cursor-help">
                          <Zap className="w-3 h-3 text-purple-600" />
                          <span className="font-medium text-purple-700">{(conv.tokens.total / 1000).toFixed(0)}K</span>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{conv.tokens.total.toLocaleString()} tokens ({conv.tokens.input.toLocaleString()} in, {conv.tokens.output.toLocaleString()} out)</p>
                      </TooltipContent>
                    </Tooltip>
                    {conv.total_ai_time_seconds && conv.total_ai_time_seconds > 0 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="flex items-center gap-1 bg-emerald-50 px-1.5 py-0.5 rounded cursor-help">
                            <Timer className="w-3 h-3 text-emerald-600" />
                            <span className="font-medium text-emerald-700">{formatLargeDuration(conv.total_ai_time_seconds)}</span>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Total AI time: {formatLargeDuration(conv.total_ai_time_seconds)} spent fulfilling requests</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </button>
                );
              })}
            </div>
          </div>

          {/* Right Side - Conversation Detail */}
          {selectedConv ? (
          <div className="flex-1 bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden border-2 border-purple-200 animate-slide-up flex flex-col">
            <div className="px-8 py-6 bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 text-white relative overflow-hidden flex-shrink-0">
              <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
              <div className="relative z-10">
                <div className="flex items-start justify-between gap-4 min-w-0">
                  <div className="flex items-start gap-3 min-w-0">
                    <Code2 className="w-6 h-6 mt-1 flex-shrink-0" />
                    <div className="min-w-0">
                      <h2 className="text-2xl font-bold mb-2 break-words">{selectedConv.title}</h2>
                      <div className="flex flex-wrap gap-4 text-sm font-medium text-white/90">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-4 h-4" />
                          {selectedConv.message_count} messages
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Zap className="w-4 h-4" />
                          {selectedConv.tokens.total.toLocaleString()} tokens
                        </span>
                        {selectedConv.total_ai_time_seconds && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Timer className="w-4 h-4" />
                              {formatLargeDuration(selectedConv.total_ai_time_seconds)} AI time
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-8 py-6 overflow-y-auto overflow-x-visible custom-scrollbar bg-gradient-to-b from-slate-50 to-white flex-1">
              {selectedConv.messages.map((msg, idx) => {
                return (
                <div
                  key={idx}
                  className={`mb-6 animate-fade-in ${
                    msg.role === 'user' ? 'ml-0 mr-12' : 'ml-12 mr-0'
                  }`}
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div
                    className={`rounded-2xl p-5 shadow-md transform hover:scale-[1.02] transition-all duration-200 overflow-visible ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200'
                        : 'bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3 gap-2 min-w-0">
                      <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
                        <div className={`p-2 rounded-lg flex-shrink-0 ${
                          msg.role === 'user' ? 'bg-blue-200' : 'bg-purple-200'
                        }`}>
                          {msg.role === 'user' ? (
                            <User className="w-4 h-4 text-blue-700" />
                          ) : (
                            <Bot className="w-4 h-4 text-purple-700" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className={`font-bold text-sm block ${
                            msg.role === 'user' ? 'text-blue-700' : 'text-purple-700'
                          }`}>
                            {msg.role === 'user' ? '👤 You' : '🤖 AI Assistant'}
                          </span>
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3 flex-shrink-0" />
                            {formatTimestamp(msg.timestamp)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs flex-wrap flex-shrink-0">
                        {msg.role === 'user' && msg.fulfillmentTime && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md font-medium flex items-center gap-1 cursor-help">
                                <Timer className="w-3 h-3" />
                                {formatDuration(msg.fulfillmentTime)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Time until AI completed response</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {msg.tokens.input + msg.tokens.output > 0 && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="bg-white/80 text-slate-600 px-2 py-1 rounded-md font-medium flex items-center gap-1 cursor-help">
                                <Zap className="w-3 h-3" />
                                {(msg.tokens.input + msg.tokens.output).toLocaleString()}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Tokens: {msg.tokens.input.toLocaleString()} in + {msg.tokens.output.toLocaleString()} out</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {msg.thinking && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-md font-medium flex items-center gap-1 cursor-help">
                                <Brain className="w-3 h-3" />
                                {formatDuration(Math.floor(msg.thinking.duration_ms / 1000))}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Extended thinking - AI spent {formatDuration(Math.floor(msg.thinking.duration_ms / 1000))} reasoning</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {msg.response_time_ms && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="bg-amber-50 text-amber-700 px-2 py-1 rounded-md font-medium flex items-center gap-1 cursor-help">
                                <Clock className="w-3 h-3" />
                                {formatDuration(Math.floor(msg.response_time_ms / 1000))}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Total response time from request to completion</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {msg.context_usage && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span 
                                className={`px-2 py-1 rounded-md font-medium flex items-center gap-1 cursor-help ${
                                  msg.context_usage.percentage_remaining < 50 
                                    ? 'bg-red-100 text-red-700' 
                                    : msg.context_usage.percentage_remaining < 80 
                                    ? 'bg-yellow-100 text-yellow-700' 
                                    : 'bg-green-100 text-green-700'
                                }`}
                              >
                                <Database className="w-3 h-3" />
                                {(msg.context_usage.tokens_used / 1000).toFixed(0)}K
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Context: {msg.context_usage.tokens_used.toLocaleString()} / {msg.context_usage.token_limit.toLocaleString()} tokens ({(100 - msg.context_usage.percentage_remaining).toFixed(1)}% full)</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {msg.files_attached && msg.files_attached > 0 && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-md font-medium flex items-center gap-1 cursor-help">
                                <FileText className="w-3 h-3" />
                                {msg.files_attached}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{msg.files_attached} file{msg.files_attached > 1 ? 's' : ''} attached to this request</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {msg.tool_calls && msg.tool_calls > 0 && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-md font-medium flex items-center gap-1 cursor-help">
                                <Wrench className="w-3 h-3" />
                                {msg.tool_calls}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{msg.tool_calls} tool call{msg.tool_calls > 1 ? 's' : ''} (terminal, file operations, etc.)</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {msg.codebase_chunks && msg.codebase_chunks > 0 && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="bg-teal-100 text-teal-700 px-2 py-1 rounded-md font-medium flex items-center gap-1 cursor-help">
                                <Code2 className="w-3 h-3" />
                                {msg.codebase_chunks}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{msg.codebase_chunks} codebase search result{msg.codebase_chunks > 1 ? 's' : ''} included</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-slate-800 leading-relaxed break-words overflow-wrap-anywhere">
                      {expandedMessages.has(idx) || msg.text.length < 300 ? (
                        <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                      ) : (
                        <>
                          <p className="whitespace-pre-wrap break-words">{msg.text.slice(0, 300)}...</p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleMessage(idx);
                            }}
                            className="mt-3 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-medium rounded-lg hover:shadow-lg transition-all"
                          >
                            Show more →
                          </button>
                        </>
                      )}
                      {expandedMessages.has(idx) && msg.text.length >= 300 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleMessage(idx);
                          }}
                          className="mt-3 px-4 py-2 bg-slate-200 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-300 transition-all"
                        >
                          Show less ←
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          </div>
          ) : (
            <div className="flex-1 bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl border-2 border-purple-200 flex items-center justify-center">
              <div className="text-center px-8 py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full mb-4">
                  <MessageSquare className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Select a Conversation</h3>
                <p className="text-slate-600">
                  Click on a conversation from the list to view its details
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </TooltipProvider>
  );
}

