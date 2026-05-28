/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DocumentContent } from '../types';
import { Book, FileText, BarChart, Trash2, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface RecentDocumentsProps {
  documents: DocumentContent[];
  onSelectDocument: (doc: DocumentContent) => void;
  onDeleteDocument: (id: string) => void;
}

export default function RecentDocuments({
  documents,
  onSelectDocument,
  onDeleteDocument,
}: RecentDocumentsProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-lg md:text-xl text-slate-800 tracking-tight flex items-center">
          <Book className="w-5 h-5 text-[#0d9488] mr-2" />
          <span>Recent Documents</span>
        </h2>
        <span className="text-xs text-[#0a7a7a] font-medium bg-[#14b8a6]/10 px-2.5 py-1 rounded-full">
          {documents.length} File{documents.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {documents.map((doc, idx) => {
          // Determine realistic thumbnail design based on file type
          return (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="bg-white rounded-2xl border border-slate-100 hover:border-[#14b8a6]/20 shadow-md p-4 flex flex-col justify-between relative overflow-hidden group select-none"
            >
              {/* Optional: Delete button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteDocument(doc.id);
                }}
                className="absolute top-2 right-2 p-1.5 bg-slate-50 hover:bg-rose-50 rounded-full text-slate-400 hover:text-rose-500 hover:scale-105 opacity-0 group-hover:opacity-100 transition-all cursor-pointer z-10"
                title="Delete document"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              {/* Document Cover Preview - styled differently based on file suffix */}
              <div 
                onClick={() => onSelectDocument(doc)}
                className="w-full aspect-video rounded-xl mb-4.5 bg-[#f0f9f9] border border-teal-50/50 flex items-center justify-center relative shadow-inner overflow-hidden cursor-pointer"
              >
                {doc.type === 'pdf' ? (
                  // Book-like styled cover (matches Giáo trình Hán ngữ background color in mockup)
                  <div className="w-[85%] h-[85%] bg-teal-700/95 rounded-lg shadow-md p-3 text-white flex flex-col justify-between relative">
                    <div className="absolute top-1 right-2 text-[8px] bg-red-500 font-bold px-1 rounded">PDF</div>
                    <div>
                      <Book className="w-5 h-5 text-teal-200 mb-1" />
                      <p className="text-[12px] font-bold tracking-tight leading-tight line-clamp-2 mt-1">
                        {doc.title.replace(/\.pdf$/, '')}
                      </p>
                    </div>
                    <div className="text-[8px] text-teal-300 font-mono tracking-widest border-t border-teal-600/50 pt-1.5 flex justify-between">
                      <span>HANORA LESSON</span>
                      <span>★ ★ ★</span>
                    </div>
                  </div>
                ) : doc.type === 'docx' ? (
                  // Spreadsheet or structured document thumbnail (for vocabulary sheets)
                  <div className="w-[85%] h-[85%] bg-white rounded-lg shadow-md border border-slate-100 p-2.5 flex flex-col justify-between">
                    <div className="flex items-center justify-between border-b border-indigo-100 pb-1.5">
                      <div className="flex space-x-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                        <span className="w-6 h-1.5 rounded bg-slate-200" />
                      </div>
                      <span className="text-[8px] bg-blue-100 text-blue-700 px-1 rounded font-bold">DOC</span>
                    </div>
                    {/* Rows breakdown */}
                    <div className="space-y-1.5 flex-1 py-2">
                      {[1, 2, 3].map((v) => (
                        <div key={v} className="flex justify-between items-center text-[8px]">
                          <span className="w-8 h-1 bg-slate-100 rounded" />
                          <span className="w-12 h-1 bg-slate-200 rounded" />
                        </div>
                      ))}
                    </div>
                    <div className="text-[8px] text-indigo-400 border-t border-slate-50 pt-1 font-semibold flex items-center space-x-1">
                      <BarChart className="w-3.5 h-3.5 text-blue-500" />
                      <span className="text-[7px]">Vocabulary list details</span>
                    </div>
                  </div>
                ) : (
                  // Nice textual layout thumbnail for stories/legends
                  <div className="w-[85%] h-[85%] bg-[#fffbfa] rounded-lg shadow-md border border-amber-50 p-3 flex flex-col justify-between relative">
                    <div className="absolute top-1.5 right-2 text-[8px] bg-amber-500 text-white font-bold px-1 rounded leading-none py-0.5">TXT</div>
                    <div className="space-y-1 mt-1">
                      <div className="w-12 h-2.5 bg-slate-300 rounded" />
                      <div className="w-full h-1 bg-slate-200 rounded" />
                      <div className="w-5/6 h-1 bg-slate-200 rounded" />
                      <div className="w-4/5 h-1 bg-slate-200 rounded" />
                    </div>
                    <div className="flex justify-between items-center text-[7px] text-slate-400">
                      <span className="font-mono">Fables / Story</span>
                      <FileText className="w-3 h-3 text-amber-500" />
                    </div>
                  </div>
                )}
              </div>

              {/* Title and metadata */}
              <div className="mb-2">
                <h3 className="font-bold text-slate-800 text-sm tracking-tight leading-tight line-clamp-1">
                  {doc.title}
                </h3>
                <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400">
                  <span>{doc.content ? doc.content.length : 0} characters</span>
                  <span>{new Date(doc.uploadedAt).toLocaleDateString('vi-VN')}</span>
                </div>
              </div>

              {/* Loading progress slider & trigger */}
              <div className="mt-2.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1.5">
                  <div className="w-2/3 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#14b8a6] h-full rounded-full"
                      style={{ width: `${doc.readingProgress || 0}%` }}
                    />
                  </div>
                  <span className="text-[#0d9488] ml-2 text-xs font-bold">{doc.readingProgress || 0}%</span>
                </div>

                <button
                  onClick={() => onSelectDocument(doc)}
                  className="w-full mt-2 bg-[#14b8a6]/5 hover:bg-[#14b8a6] text-[#0d9488] hover:text-white transition-all duration-200 rounded-xl py-2.5 px-4 font-bold text-xs flex items-center justify-center space-x-1.5 cursor-pointer shadow-sm hover:shadow-md active:scale-98"
                >
                  <span>Continue Reading</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
