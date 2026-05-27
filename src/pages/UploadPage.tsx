import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, CheckCircle2, FileText, Loader2, Search, Upload } from 'lucide-react'
import { useStore } from '@/store/useStore'

const supportedTypes = [
    { icon: FileText, label: 'PDF selectable text', tone: 'bg-amber-50 text-amber-700 border-amber-100' },
    { icon: FileText, label: 'DOCX', tone: 'bg-blue-50 text-blue-700 border-blue-100' },
    { icon: FileText, label: 'TXT', tone: 'bg-teal-50 text-teal-700 border-teal-100' },
    { icon: FileText, label: 'Scanned PDF chưa hỗ trợ', tone: 'bg-slate-50 text-slate-600 border-slate-100' },
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

        const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(file.name)
        if (isImage) {
            setStatus('error')
            setMessage('OCR/image upload chưa thuộc MVP 0.1. Hãy dùng PDF có selectable text, DOCX hoặc TXT.')
            return
        }
        const result = await translateFile(file)

        if (result) {
            setStatus('success')
            setMessage('Đã lưu file vào backend và đưa tài liệu vào Reader.')
        } else {
            setStatus('error')
            setMessage('Không đọc được file này. Hãy dùng TXT/DOCX/PDF có text selectable.')
        }
    }

    return (
        <div className="flex min-h-full flex-col gap-6 pb-8">
            <section className="glass custom-shadow rounded-3xl border border-white p-6">
                <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
                    <div className="flex items-start gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-600 text-white custom-shadow">
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
                className={`group relative cursor-pointer overflow-hidden rounded-3xl border-2 border-dashed bg-white/85 p-10 text-center custom-shadow transition-all ${
                    dragOver ? 'border-teal-400 bg-teal-50' : 'border-teal-200 hover:bg-teal-50/60'
                }`}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept=".txt,.pdf,.docx"
                    className="hidden"
                    onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (file) handleFile(file)
                    }}
                />

                {isTranslatingFile ? (
                    <div className="flex flex-col items-center gap-4 py-10">
                        <Loader2 className="h-12 w-12 animate-spin text-teal-600" />
                        <div>
                            <p className="text-lg font-black text-slate-900">Đang trích xuất văn bản...</p>
                            <p className="mt-1 text-sm font-semibold text-slate-500">{selectedFile?.name}</p>
                        </div>
                    </div>
                ) : status === 'success' ? (
                    <div className="flex flex-col items-center gap-4 py-8">
                        <CheckCircle2 className="h-14 w-14 text-emerald-500" />
                        <div>
                            <p className="text-lg font-black text-emerald-700">Xử lý thành công</p>
                            <p className="mt-1 text-sm font-semibold text-slate-500">{message}</p>
                        </div>
                        <button
                            onClick={(event) => {
                                event.stopPropagation()
                                navigate('/reader')
                            }}
                            className="rounded-xl bg-teal-600 px-6 py-3 text-sm font-black text-white custom-shadow hover:bg-teal-700"
                        >
                            Mở trong Reader
                        </button>
                    </div>
                ) : status === 'error' ? (
                    <div className="flex flex-col items-center gap-4 py-8">
                        <AlertCircle className="h-14 w-14 text-red-500" />
                        <div>
                            <p className="text-lg font-black text-red-600">Không xử lý được</p>
                            <p className="mt-1 text-sm font-semibold text-slate-500">{message}</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-4 py-10">
                        <div className="rounded-2xl bg-teal-100 p-5 text-teal-700 transition-transform group-hover:-translate-y-1">
                            <Upload className="h-10 w-10" />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-slate-900">Kéo thả hoặc chọn file</p>
                            <p className="mt-2 text-sm font-semibold text-slate-500">PDF, DOCX, TXT là luồng chính của MVP.</p>
                        </div>
                        <button className="rounded-xl bg-teal-600 px-8 py-3.5 text-sm font-black text-white custom-shadow hover:bg-teal-700">
                            Chọn file
                        </button>
                    </div>
                )}
            </section>

            <section className="custom-shadow overflow-hidden rounded-2xl border border-teal-100 bg-white">
                <div className="flex flex-col justify-between gap-3 border-b border-teal-100 bg-teal-50/40 p-4 md:flex-row md:items-center">
                    <div>
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
