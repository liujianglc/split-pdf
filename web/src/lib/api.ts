const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

export interface UploadResult {
  file_id: string
  page_count: number
  page_width: number
  page_height: number
}

export interface ProcessResult {
  task_id: string
}

export interface ProgressResult {
  status: 'pending' | 'running' | 'done' | 'error' | 'timeout'
  progress: number
  output_id: string | null
  page_count: number | null
  error: string | null
}

export async function uploadPDF(file: File): Promise<UploadResult> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${API_BASE}/upload`, { method: 'POST', body: formData })
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data
}

export function getPDFUrl(fileId: string): string {
  return `${API_BASE}/pdf/${fileId}`
}

export async function processPDF(params: {
  file_id: string
  x0: number; y0: number
  x1: number; y1: number
  cols: number
}): Promise<ProcessResult> {
  const res = await fetch(`${API_BASE}/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data
}

export async function getProgress(taskId: string): Promise<ProgressResult> {
  const res = await fetch(`${API_BASE}/progress/${taskId}`)
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data
}

export function getDownloadUrl(outputId: string): string {
  return `${API_BASE}/download/${outputId}`
}
