const PDFJS_VERSION = '3.11.174'

export function getPDFJS(): Promise<any> {
  return new Promise((resolve, reject) => {
    if ((window as any).pdfjsLib) {
      resolve((window as any).pdfjsLib)
      return
    }
    const script = document.createElement('script')
    script.src = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.js`
    script.onload = () => {
      (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
        `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`
      resolve((window as any).pdfjsLib)
    }
    script.onerror = reject
    document.head.appendChild(script)
  })
}
