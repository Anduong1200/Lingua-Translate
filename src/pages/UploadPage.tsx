import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, CheckCircle2, FileText, Loader2, Search, Upload } from 'lucide-react'
import { useStore } from '@/store/useStore'

const supportedTypes = [
    { icon: FileText, label: 'PDF selectable text', tone: 'bg-amber-50 text-amber-700 border-amber-100' },
    { icon: FileText, label: 'DOCX', tone: 'bg-blue-50 text-blue-700 border-blue-100' },
    { icon: FileText, label: 'Ảnh OCR', tone: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
    { icon: FileText, label: 'TXT', tone: 'bg-teal-50 text-teal-700 border-teal-100' },
    { icon: FileText, label: 'Scanned PDF OCR fallback', tone: 'bg-purple-50 text-purple-700 border-purple-100' },
]

export default function UploadPage() {
    const navigate = useNavigate()
    const inputRef = useRef<HTMLInputElement>(null)
    const { translateFile, isTranslatingFile, documents, setCurrentDocument } = useStore()
    const [dragOver, setDragOver] = useState(false)
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
    const [message, setMessage] = useState('')
    const [selectedFile, setSelectedFile] = useState<File | null>(null)

    const handleFile = async (file: File) => {
        setSelectedFile(file)
        setStatus('idle')
        setMessage('')

        const result = await translateFile(file)

        if (result) {
            setCurrentDocument(result)
            setStatus('success')
            setMessage('Đã xử lý thành công. File đã được lưu và trích xuất text bằng parser/OCR backend.')
        } else {
            setStatus('error')
            setMessage('Không đọc được file này. Hãy kiểm tra file hoặc cấu hình OCR Tesseract/Poppler cho ảnh/scanned PDF.')
        }
    }

    return (
        <div className="flex min-h-full flex-col gap-6 pb-8">
            <section className="shrink-0 glass custom-shadow rounded-3xl border border-white p-6">
                <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
                    <div className="flex shrink-0 items-start gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-teal-600 text-white custom-shadow">
                            <Upload className="h-7 w-7" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight text-slate-900">Tải tài liệu tiếng Trung</h1>
                            <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-slate-500">
                                MVP dùng PDF.js text layer ở frontend; backend chỉ lưu metadata, text/page và annotation.
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {supportedTypes.map((type) => (
                            <span key={type.label} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black ${type.tone}`}>
                                <type.icon className="h-4 w-4" />
                                {type.label}
                            </span>
                        ))}
                    </div>
                </div>
            </section>

            <section
                onDragOver={(event) => {
                    event.preventDefault()
                    setDragOver(true)
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(event) => {
                    event.preventDefault()
                    setDragOver(false)
                    const file = event.dataTransfer.files[0]
                    if (file) handleFile(file)
                }}
                onClick={() => !isTranslatingFile && inputRef.current?.click()}
                className={`shrink-0 group relative cursor-pointer overflow-hidden rounded-[2.5rem] border-2 border-dashed flex flex-col items-center justify-center min-h-[360px] p-10 text-center custom-shadow transition-all duration-300 ${
                    dragOver
                        ? 'border-teal-400 bg-slate-900/90 shadow-[0_0_40px_-10px_rgba(20,184,166,0.3)]'
                        : 'border-slate-700/60 bg-slate-900 shadow-xl hover:border-teal-500/50 hover:bg-slate-900/95 hover:shadow-[0_0_30px_-10px_rgba(20,184,166,0.15)]'
                }`}
            >
                <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 via-transparent to-purple-500/5 pointer-events-none" />
                <input
                    ref={inputRef}
                    type="file"
                    accept=".txt,.pdf,.docx,.png,.jpg,.jpeg,.webp"
                    className="hidden"
                    onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (file) handleFile(file)
                    }}
                />

                {isTranslatingFile ? (
                    <div className="relative z-10 flex flex-col items-center gap-5 py-10">
                        <div className="relative flex h-16 w-16 items-center justify-center">
                            <div className="absolute inset-0 rounded-full border-4 border-slate-700"></div>
                            <div className="absolute inset-0 rounded-full border-4 border-teal-500 border-t-transparent animate-spin"></div>
                            <FileText className="h-6 w-6 text-teal-400" />
                        </div>
                        <div>
                            <p className="text-xl font-black text-slate-100">Đang xử lý tài liệu...</p>
                            <p className="mt-2 text-sm font-semibold text-teal-400/80">{selectedFile?.name}</p>
                        </div>
                    </div>
                ) : status === 'success' ? (
                    <div className="relative z-10 flex flex-col items-center gap-6 py-8">
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 shadow-[0_0_30px_-5px_rgba(16,185,129,0.3)]">
                            <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-xl font-black text-emerald-400">Xử lý thành công!</p>
                            <p className="mt-2 text-sm font-medium text-slate-400">{message}</p>
                        </div>
                        <button
                            onClick={(event) => {
                                event.stopPropagation()
                                navigate('/reader')
                            }}
                            className="mt-2 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-teal-500/25 transition-all hover:scale-105 hover:shadow-teal-500/40"
                        >
                            Mở trong Reader
                        </button>
                    </div>
                ) : status === 'error' ? (
                    <div className="relative z-10 flex flex-col items-center gap-5 py-8">
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 shadow-[0_0_30px_-5px_rgba(239,68,68,0.3)]">
                            <AlertCircle className="h-10 w-10 text-red-400" />
                        </div>
                        <div>
                            <p className="text-xl font-black text-red-400">Không xử lý được</p>
                            <p className="mt-2 max-w-md text-sm font-medium text-slate-400">{message}</p>
                        </div>
                    </div>
                ) : (
                    <div className="relative z-10 flex flex-col items-center gap-6 py-10">
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-800 text-teal-400 shadow-inner transition-transform duration-500 group-hover:-translate-y-2 group-hover:scale-110 group-hover:bg-slate-800 group-hover:shadow-[0_0_25px_-5px_rgba(20,184,166,0.3)] border border-slate-700/50">
                            <Upload className="h-8 w-8" />
                        </div>
                        <div>
                            <p className="text-2xl font-black tracking-tight text-white">Kéo thả hoặc chọn file</p>
                            <p className="mt-2.5 text-sm font-medium text-slate-400">Hỗ trợ PDF, DOCX, TXT, PNG/JPG/WEBP. Giới hạn 50MB.</p>
                        </div>
                        <button className="mt-2 rounded-2xl bg-slate-800 border border-slate-600/50 px-8 py-3 text-sm font-bold text-slate-200 transition-all hover:bg-teal-500 hover:text-white hover:border-transparent hover:shadow-[0_0_20px_-5px_rgba(20,184,166,0.4)]">
                            Duyệt file
                        </button>
                    </div>
                )}
            </section>

            <section className="shrink-0 custom-shadow overflow-hidden rounded-2xl border border-teal-100 bg-white">
                <div className="flex flex-col justify-between gap-3 border-b border-teal-100 bg-teal-50/40 p-4 md:flex-row md:items-center">
                    <div className="shrink-0">
                        <h2 className="font-black text-slate-900">Workspace documents</h2>
                        <p className="text-xs font-semibold text-slate-500">Tài liệu đã import trong phiên local.</p>
                    </div>
                    <div className="relative w-full md:w-72">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            placeholder="Tìm tài liệu..."
                            className="w-full rounded-lg border border-teal-100 bg-white py-2 pl-9 pr-3 text-sm font-semibold outline-none focus:border-teal-400"
                        />
                    </div>
                </div>
                <div className="divide-y divide-teal-50">
                    {documents.map((document) => (
                        <button
                            key={document.id}
                            onClick={() => {
                                setCurrentDocument(document)
                                navigate('/reader')
                            }}
                            className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-teal-50/40"
                        >
                            <div className="flex min-w-0 items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-teal-100 bg-teal-50 text-teal-700">
                                    <FileText className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="truncate font-bold text-slate-800">{document.title}</p>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                        {document.type} · {document.sentences.length || 'N'} câu
                                    </p>
                                </div>
                            </div>
                            <span className="shrink-0 rounded-lg bg-teal-50 px-3 py-2 text-xs font-black text-teal-700">Mở</span>
                        </button>
                    ))}
                </div>
            </section>
        </div>
    )
}
