'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Upload, FileAudio, CheckCircle, Loader2, Play, AlertCircle, ChevronRight, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

interface Evaluation {
  id: string
  call_id: string
  status: 'processing' | 'completed' | 'failed'
  score: number | null
  overall_score: number | null
  overall_feedback?: string | null
  issues: string[]
  suggestions: string[]
  error_message?: string | null
  processed_at?: string | null
  created_at: string
  ai_calls: {
    call_id: string
    agent_id: string
    customer_number: string | null
    status: string
    call_type: string
    duration: number
    created_at: string
    outcome?: string | null
    agent_config?: { filename?: string }
    ai_agents: { name: string }
  }
}

export default function UploadsPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [loading, setLoading] = useState(true)

  const fetchEvaluations = useCallback(async () => {
    try {
      const response = await fetch('/api/ai-agents/evaluations?agent_id=MANUAL_UPLOAD&_t=' + Date.now(), { cache: 'no-store' })
      if (!response.ok) throw new Error('Failed to fetch')
      const result = await response.json()
      setEvaluations(result.evaluations || [])
    } catch (error) {
      console.error('Error fetching uploads:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchEvaluations()
    const interval = setInterval(fetchEvaluations, 10000)
    return () => clearInterval(interval)
  }, [fetchEvaluations])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!file) return
    
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/admin/uploads', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Upload failed')
      }

      toast.success('File uploaded! Evaluation started.')
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      await fetchEvaluations()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Manual Call Uploads</h1>
        <p className="text-gray-600">
          Upload audio recordings of calls to run them through the AI Evaluation pipeline.
        </p>
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Recording</h2>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition w-full">
            {file ? (
              <>
                <FileAudio className="w-8 h-8 text-purple-500 mb-2" />
                <span className="text-sm font-medium text-gray-900">{file.name}</span>
                <span className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
              </>
            ) : (
              <>
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-sm text-gray-600">Click to upload or drag and drop</span>
                <span className="text-xs text-gray-400 mt-1">MP3, WAV, OGG, M4A up to 25MB</span>
              </>
            )}
            <input 
              ref={fileInputRef}
              type="file" 
              accept="audio/*" 
              onChange={handleFileChange} 
              className="hidden" 
            />
          </label>

          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full sm:w-auto px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {uploading ? <><Loader2 className="w-5 h-5 animate-spin" /> Uploading...</> : 'Analyze Recording'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Uploaded Evaluations</h2>
          <button onClick={() => fetchEvaluations()} className="p-2 hover:bg-gray-200 rounded text-gray-500 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        
        {loading ? (
          <div className="p-12 flex justify-center text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : evaluations.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <FileAudio className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p>No manual uploads found.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {evaluations.map((evalRecord) => (
              <div key={evalRecord.id} className="p-4 hover:bg-gray-50 transition flex items-center justify-between group">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      {evalRecord.ai_calls.agent_config?.filename || 'Uploaded File'}
                    </span>
                    {evalRecord.status === 'processing' && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        <Loader2 className="w-3 h-3 animate-spin" /> Processing
                      </span>
                    )}
                    {evalRecord.status === 'completed' && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                        <CheckCircle className="w-3 h-3" /> Completed
                      </span>
                    )}
                    {evalRecord.status === 'failed' && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium bg-red-100 text-red-700 px-2 py-0.5 rounded-full" title={evalRecord.error_message || ''}>
                        <AlertCircle className="w-3 h-3" /> Failed
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 flex gap-3">
                    <span>Uploaded: {new Date(evalRecord.created_at).toLocaleString()}</span>
                    {evalRecord.overall_score !== null && (
                      <span className="font-medium text-purple-600">Score: {Math.round(evalRecord.overall_score)}/100</span>
                    )}
                  </div>
                </div>
                <Link
                  href={`/admin/ai-calling-agents/evaluations/${evalRecord.id}`}
                  className="p-2 text-gray-400 hover:text-purple-600 bg-gray-50 hover:bg-purple-50 rounded-lg transition"
                >
                  <ChevronRight className="w-5 h-5" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
