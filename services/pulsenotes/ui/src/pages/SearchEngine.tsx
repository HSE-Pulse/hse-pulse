import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, Send, Bot, UserRound, Loader2, AlertCircle,
  FileText, Calendar, User, Hash, ChevronDown, ChevronUp,
  Sparkles, Zap, Brain, Server, HelpCircle, X, Cpu,
} from 'lucide-react'
import NoteTypeTag from '../components/NoteTypeTag'
import { API_BASE } from '../config'

interface RAGChunk {
  text: string
  original_text: string
  metadata: {
    subject_id: number
    hadm_id: number
    note_type: string
    charttime: string
    note_id?: string
  }
  distance: number
}

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  chunks?: RAGChunk[]
  patientId?: number | null
  hadmId?: number | null
  numChunks?: number
  totalNotes?: number
  queryType?: string
  timestamp: Date
}

interface BackendStatus {
  status: 'connecting' | 'ready' | 'error'
  stats?: { texts: number; patients: number; memory: string }
  error?: string
}

const EXAMPLE_QUERIES = [
  'What are the diagnoses for patient 13297743?',
  'Show discharge summary for patient 12606543',
  'What medications were prescribed for patient 12547294?',
  'What surgical procedures were performed on patient 11818101?',
  'Show the history of present illness for patient 18371155',
  'What are the lab results for patient 13620446?',
]

export default function SearchEngine() {
  const navigate = useNavigate()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [backendStatus, setBackendStatus] = useState<BackendStatus>({ status: 'connecting' })
  const [topK, setTopK] = useState(15)
  const [showSettings, setShowSettings] = useState(false)
  const [expandedChunks, setExpandedChunks] = useState<Set<string>>(new Set())
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Check backend status
  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/health`)
      if (res.ok) {
        const data = await res.json()
        const isReady = data.status === 'ready' || data.status === 'healthy'
        setBackendStatus({
          status: isReady ? 'ready' : 'error',
          stats: data.stats || {
            texts: data.index_size || 0,
            patients: data.patients_count || 0,
            memory: '',
          },
          error: !isReady ? 'System not initialized' : undefined,
        })
      } else {
        setBackendStatus({ status: 'error', error: `Backend returned ${res.status}` })
      }
    } catch {
      setBackendStatus({ status: 'error', error: 'Cannot connect to RAG backend' })
    }
  }, [])

  useEffect(() => {
    checkStatus()
    const interval = setInterval(checkStatus, 15000)
    return () => clearInterval(interval)
  }, [checkStatus])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const toggleChunkExpansion = (chunkId: string) => {
    setExpandedChunks((prev) => {
      const next = new Set(prev)
      if (next.has(chunkId)) next.delete(chunkId)
      else next.add(chunkId)
      return next
    })
  }

  const sendQuery = async (queryText?: string) => {
    const query = (queryText || input).trim()
    if (!query || isLoading) return

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    try {
      const res = await fetch(`${API_BASE}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      })

      const data = await res.json()

      if (!res.ok) {
        const errorMsg: Message = {
          id: `err-${Date.now()}`,
          role: 'system',
          content: data.detail || data.error || `Request failed with status ${res.status}`,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, errorMsg])
      } else {
        // Map FastAPI response format to UI format
        const chunks: RAGChunk[] = (data.source_notes || []).map((note: Record<string, unknown>) => ({
          text: (note.text_preview as string) || '',
          original_text: (note.text as string) || (note.text_preview as string) || '',
          metadata: {
            subject_id: note.subject_id as number,
            hadm_id: note.hadm_id as number,
            note_type: (note.note_type || note.category || 'Unknown') as string,
            charttime: (note.charttime as string) || '',
            note_id: (note.id || note.note_id) as string,
          },
          distance: typeof note.score === 'number' ? note.score : 0,
        }))

        const isPatientLookup = data.query_type === 'patient_lookup' || data.query_type === 'segment_extraction'
        const msgId = `asst-${Date.now()}`

        // Auto-expand evidence for patient lookups since notes ARE the result
        if (isPatientLookup && chunks.length > 0) {
          setExpandedChunks((prev) => new Set([...prev, msgId]))
        }

        const assistantMsg: Message = {
          id: msgId,
          role: 'assistant',
          content: data.answer || data.response || 'No answer available.',
          chunks: chunks.length > 0 ? chunks : data.chunks,
          patientId: data.subject_id || data.patient_id,
          hadmId: data.hadm_id,
          numChunks: chunks.length || data.num_chunks,
          totalNotes: data.total_notes,
          queryType: data.query_type,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, assistantMsg])
      }
    } catch (err) {
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        role: 'system',
        content: `Network error: ${err instanceof Error ? err.message : 'Failed to reach the RAG backend.'}`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendQuery()
    }
  }

  const clearChat = () => {
    setMessages([])
    setExpandedChunks(new Set())
  }

  const statusColor = {
    connecting: 'bg-amber-500',
    ready: 'bg-emerald-500',
    error: 'bg-red-500',
  }
  const statusLabel = {
    connecting: 'Connecting...',
    ready: 'RAG System Online',
    error: 'Backend Offline',
  }

  return (
    <div className="max-w-5xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                Medical RAG Search Engine
                <span className="text-xs font-normal text-slate-400">Bio_ClinicalBERT + FAISS + MedLLaMA2</span>
              </h2>
              <p className="text-xs text-slate-500">
                Ask questions about patient records using natural language
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Backend status */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200">
              <div className={`w-2 h-2 rounded-full ${statusColor[backendStatus.status]} ${backendStatus.status === 'connecting' ? 'animate-pulse' : ''}`} />
              <span className="text-xs font-medium text-slate-600">{statusLabel[backendStatus.status]}</span>
            </div>
            {backendStatus.status === 'ready' && backendStatus.stats && (
              <div className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-full bg-violet-50 border border-violet-200 text-xs text-violet-700">
                <span className="flex items-center gap-1"><Cpu className="w-3 h-3" />{backendStatus.stats.texts} chunks</span>
                <span className="flex items-center gap-1"><User className="w-3 h-3" />{backendStatus.stats.patients} patients</span>
              </div>
            )}
            {/* Settings toggle */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-lg transition-colors ${showSettings ? 'bg-violet-100 text-violet-700' : 'hover:bg-slate-100 text-slate-400'}`}
            >
              <Zap className="w-4 h-4" />
            </button>
            {messages.length > 0 && (
              <button onClick={clearChat} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors" title="Clear chat">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Settings panel */}
        {showSettings && (
          <div className="mt-3 pt-3 border-t border-slate-100 animate-fade-in">
            <div className="flex items-center gap-4">
              <label className="text-xs font-medium text-slate-500">Retrieved Chunks (top_k):</label>
              <input
                type="range"
                min={5}
                max={30}
                value={topK}
                onChange={(e) => setTopK(Number(e.target.value))}
                className="flex-1 max-w-48 accent-violet-600"
              />
              <span className="text-sm font-semibold text-violet-700 w-8 text-right">{topK}</span>
            </div>
            <div className="mt-2 flex items-start gap-2 text-xs text-slate-400">
              <HelpCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>
                Higher values retrieve more context but may include less relevant chunks.
                The RAG system uses Bio_ClinicalBERT for embeddings, FAISS for vector search, and MedLLaMA2 via Ollama for response generation.
              </span>
            </div>
          </div>
        )}

        {/* Backend offline warning */}
        {backendStatus.status === 'error' && (
          <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-amber-800">
              <p className="font-semibold">RAG backend not available</p>
              <p className="mt-0.5">
                {backendStatus.error}. Start the Flask server:
              </p>
              <code className="mt-1 block bg-amber-100 rounded px-2 py-1 font-mono text-amber-900">
                Ensure the PulseNotes backend service is running
              </code>
            </div>
          </div>
        )}
      </div>

      {/* Chat area */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Empty state */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center mb-6">
                <Search className="w-9 h-9 text-violet-500" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Query Clinical Records</h3>
              <p className="text-sm text-slate-500 mb-8 max-w-md">
                Ask questions about patient medical notes. The RAG system retrieves relevant clinical text using vector similarity and generates responses with an LLM.
              </p>

              {/* Example queries */}
              <div className="w-full max-w-lg">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Try an example query
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {EXAMPLE_QUERIES.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => sendQuery(q)}
                      disabled={backendStatus.status !== 'ready'}
                      className="text-left p-3 rounded-xl border border-slate-200 text-sm text-slate-600 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Sparkles className="w-3.5 h-3.5 inline mr-1.5 text-violet-400" />
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Architecture diagram */}
              <div className="mt-8 flex items-center gap-3 text-xs text-slate-400">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
                  <Search className="w-3 h-3" /> Query
                </div>
                <span>&rarr;</span>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-600">
                  <Cpu className="w-3 h-3" /> ClinicalBERT
                </div>
                <span>&rarr;</span>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 border border-purple-200 text-purple-600">
                  <Zap className="w-3 h-3" /> FAISS
                </div>
                <span>&rarr;</span>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600">
                  <Brain className="w-3 h-3" /> MedLLaMA2
                </div>
                <span>&rarr;</span>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
                  <FileText className="w-3 h-3" /> Response
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg) => (
            <div key={msg.id} className="animate-fade-in">
              {msg.role === 'user' && (
                <div className="flex justify-end">
                  <div className="flex items-start gap-3 max-w-[80%]">
                    <div className="bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-2xl rounded-br-md px-5 py-3 shadow-sm">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0 mt-1">
                      <UserRound className="w-4 h-4 text-violet-600" />
                    </div>
                  </div>
                </div>
              )}

              {msg.role === 'assistant' && (
                <div className="flex justify-start">
                  <div className="flex items-start gap-3 max-w-[85%]">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-1">
                      <Bot className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="space-y-3">
                      {/* Response */}
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl rounded-bl-md px-5 py-4 shadow-sm">
                        <div className="flex items-center gap-2 flex-wrap mb-3">
                          {msg.patientId && (
                            <button
                              onClick={() => navigate(`/patients/${msg.patientId}`)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-100 text-violet-700 text-xs font-medium hover:bg-violet-200 transition-colors"
                            >
                              <User className="w-3 h-3" />
                              Patient {msg.patientId}
                            </button>
                          )}
                          {msg.hadmId && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-100 text-blue-700 text-xs font-medium">
                              <Hash className="w-3 h-3" />
                              Admission {msg.hadmId}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                          {msg.content}
                        </div>
                        {msg.numChunks != null && (
                          <p className="mt-3 text-xs text-slate-400">
                            {msg.totalNotes && msg.totalNotes > msg.numChunks
                              ? `Showing ${msg.numChunks} of ${msg.totalNotes} total note${msg.totalNotes !== 1 ? 's' : ''}`
                              : `Based on ${msg.numChunks} retrieved note${msg.numChunks !== 1 ? 's' : ''}`}
                          </p>
                        )}
                      </div>

                      {/* Evidence chunks */}
                      {msg.chunks && msg.chunks.length > 0 && (
                        <div className="bg-white border border-slate-200 rounded-2xl p-4">
                          <button
                            onClick={() => toggleChunkExpansion(msg.id)}
                            className="flex items-center justify-between w-full text-left"
                          >
                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                              <Server className="w-3.5 h-3.5" />
                              Source Notes ({msg.chunks.length}{msg.totalNotes && msg.totalNotes > msg.chunks.length ? ` of ${msg.totalNotes}` : ''})
                            </div>
                            {expandedChunks.has(msg.id) ? (
                              <ChevronUp className="w-4 h-4 text-slate-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            )}
                          </button>

                          {expandedChunks.has(msg.id) && (
                            <div className="mt-3 space-y-2 max-h-96 overflow-y-auto animate-fade-in">
                              {msg.chunks.map((chunk, ci) => (
                                <div
                                  key={ci}
                                  className="p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-300 transition-colors"
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <span className="w-5 h-5 rounded bg-slate-200 text-slate-600 text-xs font-bold flex items-center justify-center">
                                        {ci + 1}
                                      </span>
                                      <NoteTypeTag type={chunk.metadata.note_type} />
                                      <span className="text-xs text-slate-400 flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {chunk.metadata.charttime
                                          ? new Date(chunk.metadata.charttime).toLocaleDateString()
                                          : 'N/A'}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {chunk.distance > 0 && (
                                        <span
                                          className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono"
                                          title="Similarity score (higher = more relevant)"
                                        >
                                          {chunk.distance.toFixed(3)}
                                        </span>
                                      )}
                                      {chunk.metadata.hadm_id && (
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
                                          ADM {chunk.metadata.hadm_id}
                                        </span>
                                      )}
                                      <button
                                        onClick={() => navigate(`/patients/${chunk.metadata.subject_id}`)}
                                        className="text-xs text-violet-600 hover:text-violet-800 font-medium flex items-center gap-0.5"
                                      >
                                        <Hash className="w-3 h-3" />
                                        {chunk.metadata.subject_id}
                                      </button>
                                    </div>
                                  </div>
                                  <div className="note-text text-xs">
                                    <p className="max-h-40 overflow-y-auto whitespace-pre-wrap">
                                      {expandedChunks.has(`${msg.id}-${ci}`)
                                        ? chunk.original_text
                                        : chunk.text || chunk.original_text.slice(0, 500)}
                                    </p>
                                    {chunk.original_text.length > 500 && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); toggleChunkExpansion(`${msg.id}-${ci}`) }}
                                        className="mt-1 text-violet-600 hover:text-violet-800 text-xs font-medium"
                                      >
                                        {expandedChunks.has(`${msg.id}-${ci}`) ? 'Show less' : `Show full note (${Math.round(chunk.original_text.length / 1000)}k chars)`}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {msg.role === 'system' && (
                <div className="flex justify-center">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 border border-red-200 text-xs text-red-700">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {msg.content}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start animate-fade-in">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl rounded-bl-md px-5 py-4">
                  <div className="flex items-center gap-3 text-sm text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin text-violet-500" />
                    <div>
                      <p className="font-medium">Searching medical records...</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Embedding query &rarr; FAISS retrieval &rarr; LLM generation
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-slate-200 p-4 bg-white">
          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  backendStatus.status === 'ready'
                    ? 'Ask about patient records... (e.g., "What diagnoses does patient 13297743 have?")'
                    : 'RAG backend is offline. Start Flask server to enable search.'
                }
                disabled={backendStatus.status !== 'ready'}
                rows={1}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 disabled:bg-slate-50 disabled:text-slate-400 transition-all"
                style={{ minHeight: '44px', maxHeight: '120px' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement
                  target.style.height = '44px'
                  target.style.height = Math.min(target.scrollHeight, 120) + 'px'
                }}
              />
            </div>
            <button
              onClick={() => sendQuery()}
              disabled={!input.trim() || isLoading || backendStatus.status !== 'ready'}
              className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center hover:from-violet-600 hover:to-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-400 text-center">
            Press Enter to send &middot; Shift+Enter for new line &middot; Include patient ID for targeted search
          </p>
        </div>
      </div>
    </div>
  )
}
