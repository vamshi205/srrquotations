import React, { useMemo } from 'react';
import { Search, LayoutDashboard, Download, Mail, Eye } from 'lucide-react';

const HistoryView = ({ quotationHistory, searchQuery, setSearchQuery, isGenerating, regeneratingItem, setRegeneratingItem }) => {
  const filteredHistory = useMemo(() => {
    return quotationHistory.filter(item => 
      item.hospital.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.ref.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.templateName && item.templateName.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [quotationHistory, searchQuery]);

  return (
    <div className="h-full overflow-y-auto px-6 py-10 md:px-16 md:py-12 bg-transparent">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
          <div>
            <h1 className="apple-title-1 mb-2">History</h1>
            <p className="apple-subtitle">Recent quotations generated. <span className="font-semibold text-[var(--text)]">{quotationHistory.length}</span> total</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)] w-4 h-4" />
            <input 
              type="search" 
              placeholder="Search hospital or ref..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoComplete="off"
              className="apple-input !pl-10 !py-2.5 w-full md:w-[280px]"
            />
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="text-center py-20 bg-white/30 border border-dashed border-white/50 rounded-3xl">
            <LayoutDashboard size={48} className="mx-auto mb-4 text-[var(--text3)]" />
            <p className="font-bold text-lg text-[var(--text)]">No history matches found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Desktop Table */}
            <div className="hidden md:block apple-card overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-white/40 backdrop-blur-sm border-b border-white/30">
                    <th className="text-left py-3.5 px-5 text-[11px] font-bold uppercase tracking-wider text-[var(--text3)]">Ref No.</th>
                    <th className="text-left py-3.5 px-5 text-[11px] font-bold uppercase tracking-wider text-[var(--text3)]">Hospital</th>
                    <th className="text-left py-3.5 px-5 text-[11px] font-bold uppercase tracking-wider text-[var(--text3)]">Template</th>
                    <th className="text-left py-3.5 px-5 text-[11px] font-bold uppercase tracking-wider text-[var(--text3)]">Date</th>
                    <th className="text-right py-3.5 px-5 text-[11px] font-bold uppercase tracking-wider text-[var(--text3)]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/20">
                  {filteredHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-white/30 transition-colors">
                      <td className="py-4 px-5">
                        <span className="text-[11.5px] font-bold text-[var(--accent)] bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full whitespace-nowrap">{(item.ref || '').replace('SRR/QUOT/', '')}</span>
                      </td>
                      <td className="py-4 px-5">
                        <span className="text-[15px] font-bold text-[var(--text)]">{item.hospital}</span>
                      </td>
                      <td className="py-4 px-5">
                        <span className="text-[13px] text-[var(--text2)] font-semibold">{item.templateName}</span>
                      </td>
                      <td className="py-4 px-5">
                        <span className="text-[13px] text-[var(--text3)] font-medium">{item.date}</span>
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex items-center justify-end gap-1.5">
                          <button 
                            onClick={() => setRegeneratingItem({ ...item, _viewMode: true })}
                            disabled={isGenerating || regeneratingItem}
                            className="w-9 h-9 flex items-center justify-center bg-white/50 border border-white/60 rounded-xl text-[var(--text2)] hover:border-white/80 hover:bg-white/70 transition-all disabled:opacity-50 shadow-sm"
                            title="View PDF"
                          >
                            <Eye size={15} />
                          </button>
                          <button 
                            onClick={() => setRegeneratingItem(item)}
                            disabled={isGenerating || regeneratingItem}
                            className="w-9 h-9 flex items-center justify-center bg-white/50 border border-white/60 rounded-xl text-[var(--accent)] hover:border-emerald-500/30 hover:bg-emerald-500/10 transition-all disabled:opacity-50 shadow-sm"
                            title="Download PDF"
                          >
                            <Download size={15} />
                          </button>
                          <button 
                            onClick={() => setRegeneratingItem({ ...item, _shareMode: true })}
                            disabled={isGenerating || regeneratingItem}
                            className="w-9 h-9 flex items-center justify-center bg-white/50 border border-white/60 rounded-xl text-[var(--coral)] hover:border-red-300 hover:bg-red-500/10 transition-all disabled:opacity-50 shadow-sm"
                            title="Email Quotation"
                          >
                            <Mail size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-4">
              {filteredHistory.map((item) => (
                <div key={item.id} className="apple-card p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-[16px] font-bold text-[var(--text)] leading-tight">{item.hospital}</p>
                      <p className="text-[12px] text-[var(--text3)] font-semibold">{item.templateName}</p>
                    </div>
                    <span className="text-[11px] font-bold text-[var(--accent)] bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">{(item.ref || '').replace('SRR/QUOT/', '')}</span>
                  </div>
                  <div className="flex items-center justify-between text-[13px] text-[var(--text3)] font-medium">
                    <span>{item.date}</span>
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-white/20">
                    <button 
                      onClick={() => setRegeneratingItem({ ...item, _viewMode: true })}
                      disabled={isGenerating || regeneratingItem}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/40 border border-white/60 rounded-xl text-[var(--text)] active:scale-[0.98] transition-all hover:bg-white/65"
                      title="View"
                    >
                      <Eye size={16} />
                    </button>
                    <button 
                      onClick={() => setRegeneratingItem(item)}
                      disabled={isGenerating || regeneratingItem}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/40 border border-white/60 rounded-xl text-[var(--accent)] active:scale-[0.98] transition-all hover:bg-white/65"
                      title="Download"
                    >
                      <Download size={16} />
                    </button>
                    <button 
                      onClick={() => setRegeneratingItem({ ...item, _shareMode: true })}
                      disabled={isGenerating || regeneratingItem}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/40 border border-white/60 rounded-xl text-[var(--coral)] active:scale-[0.98] transition-all hover:bg-white/65"
                      title="Email"
                    >
                      <Mail size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(HistoryView);
