import { describe, expect, it } from 'vitest'
import { fileNameToDocumentType } from '../store/slices/types'

describe('fileNameToDocumentType', () => {
    it('detects PDF and DOCX extensions case-insensitively', () => {
        expect(fileNameToDocumentType('sample.pdf')).toBe('pdf')
        expect(fileNameToDocumentType('REPORT.PDF')).toBe('pdf')
        expect(fileNameToDocumentType('lesson.Docx')).toBe('docx')
        expect(fileNameToDocumentType('notes.txt')).toBe('txt')
        expect(fileNameToDocumentType('scan.PNG')).toBe('txt')
    })
})
