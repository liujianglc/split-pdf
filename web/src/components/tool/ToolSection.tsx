'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { uploadPDF, processPDF, getProgress, getDownloadUrl, getPDFUrl } from '@/lib/api'
import { getPDFJS } from '@/lib/pdfjs'
import PDFCanvas from './PDFCanvas'

interface Selection {
  x: number; y: number; w: number; h: number
}

type ToastType = 'success' | 'error' | null

export default function ToolSection() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [fileId, setFileId] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')
  const [pageWidth, setPageWidth] = useState(0)
  const [pageHeight, setPageHeight] = useState(0)
  const [pageCount, setPageCount] = useState(0)
  const [cols, setCols] = useState(2)
  const [selection, setSelection] = useState<Selection>({ x: 0, y: 0, w: 0, h: 0 })
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [downloadId, setDownloadId] = useState<string | null>(null)
  const [resultPages, setResultPages] = useState(0)
  const [toast, setToast] = useState<{ msg: string; type: ToastType }>({ msg: '', type: null })

  const showToast = (msg: string, type: ToastType) => {
    setToast({ msg, type })
    setTimeout(() => setToast({ msg: '', type: null }), 4000)
  }

  const handleFile = useCallback(async (file: File) => {
    setDownloadId(null)
    try {
      const data = await uploadPDF(file)
      setFileId(data.file_id)
      setPageWidth(data.page_width)
      setPageHeight(data.page_height)
      setPageCount(data.page_count)
      setFileName(file.name)

      if (data.page_width && data.page_height) {
        setSelection({
          x: data.page_width * 0.15,
          y: 10,
          w: data.page_width * 0.83,
          h: data.page_height - 20,
        })
      }
    } catch (err: any) {
      showToast(err.message || '上传失败', 'error')
    }
  }, [])

  const handleProcess = useCallback(async () => {
    if (!fileId) return
    setProcessing(true)
    setProgress(0)
    setDownloadId(null)

    const sel = selection
    const sx = Math.min(sel.x, sel.x + sel.w)
    const sy = Math.min(sel.y, sel.y + sel.h)
    const ex = Math.max(sel.x, sel.x + sel.w)
    const ey = Math.max(sel.y, sel.y + sel.h)

    if (ex - sx < 10 || ey - sy < 10) {
      showToast('选区太小，请重新框选', 'error')
      setProcessing(false)
      return
    }

    try {
      const { task_id } = await processPDF({
        file_id: fileId,
        x0: sx, y0: sy,
        x1: ex, y1: ey,
        cols,
      })

      const poll = setInterval(async () => {
        try {
          const pdata = await getProgress(task_id)
          setProgress(pdata.progress)

          if (pdata.status === 'done' && pdata.output_id) {
            clearInterval(poll)
            setDownloadId(pdata.output_id)
            setResultPages(pdata.page_count || 0)
            setProcessing(false)
            showToast('处理完成！', 'success')
            window.open(getDownloadUrl(pdata.output_id), '_blank')
          } else if (pdata.status === 'error') {
            clearInterval(poll)
            setProcessing(false)
            showToast(pdata.error || '处理失败', 'error')
          } else if (pdata.status === 'timeout') {
            clearInterval(poll)
            setProcessing(false)
            showToast('处理超时，请重试', 'error')
          }
        } catch {
          clearInterval(poll)
          setProcessing(false)
          showToast('查询进度失败', 'error')
        }
      }, 500)
    } catch (err: any) {
      setProcessing(false)
      showToast(err.message || '处理失败', 'error')
    }
  }, [fileId, selection, cols])

  const needsUpload = !fileId

  return (
    <div>
      {toast.type && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-lg text-white text-sm shadow-lg ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-700'}`}>
          {toast.msg}
        </div>
      )}

      {needsUpload ? (
        <div className="py-16 text-center">
          <div className="max-w-md mx-auto p-10 border-2 border-dashed border-gray-200 rounded-2xl hover:border-primary/40 transition-colors">
            <svg className="w-12 h-12 text-gray-300 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="mt-4 text-gray-600">点击上传试卷 PDF</p>
            <p className="mt-1 text-sm text-gray-400">支持双面打印的试卷，最大 50MB</p>
            <button onClick={() => fileRef.current?.click()} className="mt-6 px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
              选择文件
            </button>
            <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={e => {
              const f = e.target.files?.[0]
              if (f) handleFile(f)
              e.target.value = ''
            }} />
          </div>
        </div>
      ) : (
        <div>
          <div className="flex flex-wrap items-center gap-3 p-4 bg-white rounded-xl shadow-sm border border-gray-100 mb-4">
            <button onClick={() => fileRef.current?.click()} className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-dark transition-colors">
              打开PDF
            </button>
            <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={e => {
              const f = e.target.files?.[0]
              if (f) handleFile(f)
              e.target.value = ''
            }} />
            <span className="text-sm text-gray-500">{fileName}（共 {pageCount} 页）</span>

            <div className="ml-auto flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">切分:</span>
                {[1, 2, 3].map(n => (
                  <label key={n} className="flex items-center gap-1 cursor-pointer">
                    <input type="radio" name="cols" checked={cols === n} onChange={() => setCols(n)} className="accent-primary" />
                    {n}栏
                  </label>
                ))}
              </div>

              <button
                onClick={handleProcess}
                disabled={processing}
                className="px-5 py-2 bg-success text-white text-sm rounded-lg hover:bg-success-dark transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {processing ? '处理中...' : '生成A4打印版'}
              </button>
            </div>
          </div>

          {processing && (
            <div className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border border-gray-100 mb-4">
              <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-success to-green-400 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-sm text-gray-600 min-w-[3ch] text-right">{Math.round(progress)}%</span>
            </div>
          )}

          {downloadId && (
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-200 mb-4">
              <span className="text-sm text-green-800">处理完成！共 {resultPages} 页</span>
              <a href={getDownloadUrl(downloadId)} download className="ml-auto px-4 py-1.5 bg-success text-white text-sm rounded-lg hover:bg-success-dark transition-colors">
                重新下载
              </a>
              <button onClick={() => { setFileId(null); setDownloadId(null) }} className="px-4 py-1.5 border border-primary text-primary text-sm rounded-lg hover:bg-blue-50 transition-colors">
                继续切题
              </button>
            </div>
          )}

          <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-100">
            <PDFCanvas
              fileId={fileId}
              pageWidth={pageWidth}
              pageHeight={pageHeight}
              selection={selection}
              cols={cols}
              onSelectionChange={setSelection}
            />
          </div>
        </div>
      )}
    </div>
  )
}
