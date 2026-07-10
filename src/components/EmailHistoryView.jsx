import React from 'react';
import { Mail, Clock, User, FileText, ChevronRight, Search, Trash2 } from 'lucide-react';

const EmailHistoryView = ({ history = [], onDelete }) => {
  const [searchQuery, setSearchQuery] = React.useState('');

  const filteredHistory = history.filter(item => 
    item.to.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full overflow-y-auto px-6 py-10 md:px-16 md:py-12 bg-transparent">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
          <div>
            <h1 className="apple-title-1 mb-2">Email History</h1>
            <p className="apple-subtitle">Logs of all communications dispatched via Resend in a glassmorphic catalog.</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)] w-4 h-4" />
            <input
              type="search"
              placeholder="Search recipient or subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoComplete="off"
              className="apple-input !pl-10 !py-2.5 w-full md:w-[280px]"
            />
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="apple-card py-20 flex flex-col items-center justify-center border-dashed bg-white/30 border-white/50 rounded-3xl">
            <Mail size={48} className="text-[var(--text3)] mb-4" />
            <p className="text-[16px] font-bold text-[var(--text3)]">No email history logs found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredHistory.map((item) => (
              <div key={item.id} className="apple-card p-6 hover:border-[var(--text3)] transition-all group">
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Left: Info */}
                  <div className="flex-1 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/60 border border-white/50 rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
                          <User size={18} className="text-[var(--text2)]" />
                        </div>
                        <div>
                          <p className="text-[15px] font-bold text-[var(--text)] leading-tight">{item.to}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock size={12} className="text-[var(--text3)]" />
                            <span className="text-[11px] text-[var(--text3)] font-semibold">
                              {new Date(item.sentAt).toLocaleString('en-GB', { 
                                day: '2-digit', 
                                month: 'short', 
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        item.status === 'success' 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700' 
                          : 'bg-red-500/10 border-red-500/20 text-red-700'
                      }`}>
                        {item.status || 'success'}
                      </span>
                    </div>

                    <div className="pl-[52px]">
                      <h4 className="text-[15.5px] font-bold text-[var(--text)] mb-1.5">{item.subject}</h4>
                      <p className="text-[13px] text-[var(--text2)] line-clamp-2 leading-relaxed font-medium">
                        {item.body}
                      </p>
                    </div>

                    <div className="pl-[52px] flex flex-wrap gap-2 pt-2">
                      {(item.attachments || []).map((file, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 px-3 py-1 bg-white/50 rounded-full text-[11px] font-semibold text-[var(--text2)] border border-white/65 shadow-sm">
                          <FileText size={12} className="text-[var(--accent)]" />
                          {file}
                        </div>
                      ))}
                      {(!item.attachments || item.attachments.length === 0) && (
                        <span className="text-[11px] text-[var(--text3)] italic">No attachments</span>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex md:flex-col items-center justify-end gap-2 md:border-l border-white/20 md:pl-6">
                    <button 
                      onClick={() => onDelete && onDelete(item.id)}
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text3)] hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 transition-all md:opacity-0 group-hover:opacity-100"
                      title="Delete log"
                    >
                      <Trash2 size={16} />
                    </button>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text3)]">
                      <ChevronRight size={18} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailHistoryView;
