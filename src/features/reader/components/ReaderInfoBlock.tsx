

export function ReaderInfoBlock({
    label,
    value,
    highlight,
    emptyText,
}: {
    label: string
    value?: string
    highlight?: boolean
    emptyText?: string
}) {
    const hasValue = Boolean(value?.trim())
    return (
        <div className={`rounded-xl border p-3 ${highlight ? 'border-teal-100 bg-teal-50/60' : 'border-slate-100 bg-white'}`}>
            <p className={`mb-1 text-[9px] font-black uppercase tracking-widest ${highlight ? 'text-teal-700' : 'text-slate-400'}`}>{label}</p>
            <p className={`whitespace-pre-wrap text-xs font-semibold leading-relaxed ${hasValue ? 'text-slate-700' : 'text-slate-400'}`}>
                {hasValue ? value : emptyText || 'Chưa có dữ liệu.'}
            </p>
        </div>
    )
}

