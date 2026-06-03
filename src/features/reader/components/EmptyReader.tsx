import { FilePlus2, FileText, Upload } from 'lucide-react'

export function EmptyReader({
    onUploadClick,
    onPasteClick,
}: {
    onUploadClick: () => void
    onPasteClick: () => void
}) {
    return (
        <div className="flex flex-1 items-center justify-center bg-slate-50 px-6 py-10">
            <div className="w-full max-w-xl rounded-3xl border border-dashed border-teal-200 bg-white/80 p-8 text-center shadow-sm">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-teal-700">
                    <FileText className="h-7 w-7" />
                </div>
                <h2 className="text-lg font-black text-slate-900">Chưa có tài liệu trong Reader</h2>
                <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">
                    Tải PDF/DOCX/TXT hoặc dán một bài tiếng Trung để bắt đầu tra từ, phân tích ngữ pháp và lưu flashcard.
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                    <button
                        onClick={onUploadClick}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-black text-white transition hover:bg-teal-700"
                    >
                        <Upload className="h-4 w-4" />
                        Tải tài liệu
                    </button>
                    <button
                        onClick={onPasteClick}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-teal-200 bg-white px-4 py-2.5 text-xs font-black text-teal-700 transition hover:bg-teal-50"
                    >
                        <FilePlus2 className="h-4 w-4" />
                        Dán nội dung
                    </button>
                </div>
            </div>
        </div>
    )
}

