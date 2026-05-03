import React, { useMemo } from 'react';
import { Search, LayoutDashboard, Download, Share2 } from 'lucide-react';

const HistoryView = ({ quotationHistory, searchQuery, setSearchQuery, isGenerating, regeneratingItem, setRegeneratingItem }) => {
  const filteredHistory = useMemo(() => {
    return quotationHistory.filter(item => 
      item.hospital.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.ref.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.templateName && item.templateName.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [quotationHistory, searchQuery]);

  return (
    <div className="h-full overflow-y-auto px-8 py-12 md:px-16 md:py-16">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <h1 className="apple-title-1 mb-2">History</h1>
            <p className="apple-subtitle">Recent quotations generated. <span className="font-semibold text-[var(--apple-black)]">{quotationHistory.length}</span> total</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--apple-gray-4)] w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search hospital or ref..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="apple-input !pl-10 !py-2.5 w-full md:w-[280px]"
            />
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="text-center py-20 opacity-40">
            <LayoutDashboard size={48} className="mx-auto mb-4" />
            <p className="font-semibold text-lg">No history matches found</p>
          </div>
        ) : (
          <div className="apple-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-[var(--apple-gray-1)] border-b border-[var(--apple-gray-2)]">
                  <th className="text-left py-3 px-5 text-[11px] font-bold uppercase tracking-wider text-[var(--apple-gray-5)]">Ref No.</th>
                  <th className="text-left py-3 px-5 text-[11px] font-bold uppercase tracking-wider text-[var(--apple-gray-5)]">Hospital</th>
                  <th className="text-left py-3 px-5 text-[11px] font-bold uppercase tracking-wider text-[var(--apple-gray-5)] hidden md:table-cell">Template</th>
                  <th className="text-left py-3 px-5 text-[11px] font-bold uppercase tracking-wider text-[var(--apple-gray-5)]">Date</th>
                  <th className="text-right py-3 px-5 text-[11px] font-bold uppercase tracking-wider text-[var(--apple-gray-5)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((item) => (
                  <tr key={item.id} className="border-b border-[var(--apple-gray-2)] last:border-0 hover:bg-[var(--apple-gray-1)] transition-colors">
                    <td className="py-4 px-5">
                      <span className="text-[13px] font-bold text-[var(--emerald)] bg-[var(--emerald-light)] px-2.5 py-1 rounded-md whitespace-nowrap">{item.ref}</span>
                    </td>
                    <td className="py-4 px-5">
                      <span className="text-[15px] font-semibold text-[var(--apple-black)]">{item.hospital}</span>
                    </td>
                    <td className="py-4 px-5 hidden md:table-cell">
                      <span className="text-[13px] text-[var(--apple-gray-5)] font-medium">{item.templateName}</span>
                    </td>
                    <td className="py-4 px-5">
                      <span className="text-[13px] text-[var(--apple-gray-5)] font-medium">{item.date}</span>
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex items-center justify-end gap-2">
                        {item.formData && (
                          <>
                            <button 
                              onClick={() => setRegeneratingItem(item)}
                              disabled={isGenerating || regeneratingItem}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[var(--apple-gray-2)] rounded-lg text-[12px] font-semibold text-[var(--emerald)] hover:border-[var(--emerald)] hover:bg-[var(--emerald-light)] transition-colors disabled:opacity-50"
                              title="Download PDF"
                            >
                              <Download size={13} /> Download
                            </button>
                            <button 
                              onClick={async () => {
                                setRegeneratingItem({ ...item, _shareMode: true });
                              }}
                              disabled={isGenerating || regeneratingItem}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[var(--apple-gray-2)] rounded-lg text-[12px] font-semibold text-[var(--coral)] hover:border-[var(--coral)] hover:bg-red-50 transition-colors disabled:opacity-50"
                              title="Share PDF"
                            >
                              <Share2 size={13} /> Share
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(HistoryView);
