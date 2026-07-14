let pdfjsLib: typeof import('pdfjs-dist') | null = null
let loadingPromise: Promise<typeof import('pdfjs-dist')> | null = null

export async function getPDFJS(): Promise<typeof import('pdfjs-dist')> {
  if (pdfjsLib) return pdfjsLib
  if (!loadingPromise) {
    loadingPromise = (async () => {
      const pdfjs = await import('pdfjs-dist')
      pdfjs.GlobalWorkerOptions.workerSrc =
        `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`
      pdfjsLib = pdfjs
      return pdfjs
    })()
  }
  return loadingPromise
}
