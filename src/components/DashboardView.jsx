import React from 'react';
import { FileText, LayoutDashboard, HardDrive, Mail, Plus, UploadCloud, Send, FilePlus, ArrowRight, Eye, Download } from 'lucide-react';

export default function DashboardView({ 
  stats = { templates: 0, history: 0, drive: 0, emails: 0 }, 
  recentHistory = [], 
  setView, 
  setRegeneratingItem, 
  isGenerating, 
  regeneratingItem 
}) {
  return (
    <div className="h-full overflow-y-auto px-6 py-8 md:px-16 md:py-10 bg-transparent">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <header className="mb-10">
          <h1 className="text-[28px] font-extrabold text-[var(--text)] tracking-tight leading-tight">Welcome back!</h1>
          <p className="text-[14px] text-[var(--text3)] mt-1 font-medium">Sri Raja Rajeshwari Ortho Plus workspace overview.</p>
        </header>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          {/* Card 1: Quotations */}
          <div className="apple-card p-6 bg-gradient-to-tr from-emerald-500/5 to-teal-500/5 border-emerald-500/20 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-teal-700 uppercase tracking-widest block">Quotations</span>
              <span className="text-[28px] font-extrabold text-[var(--text)] block">{stats.history}</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-700 shadow-inner">
              <FileText size={22} />
            </div>
          </div>

          {/* Card 2: Templates */}
          <div className="apple-card p-6 bg-gradient-to-tr from-blue-500/5 to-indigo-500/5 border-blue-500/20 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-blue-700 uppercase tracking-widest block">Templates</span>
              <span className="text-[28px] font-extrabold text-[var(--text)] block">{stats.templates}</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-700 shadow-inner">
              <LayoutDashboard size={22} />
            </div>
          </div>

          {/* Card 3: Storage */}
          <div className="apple-card p-6 bg-gradient-to-tr from-amber-500/5 to-orange-500/5 border-amber-500/20 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-amber-700 uppercase tracking-widest block">Drive Files</span>
              <span className="text-[28px] font-extrabold text-[var(--text)] block">{stats.drive}</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700 shadow-inner">
              <HardDrive size={22} />
            </div>
          </div>

          {/* Card 4: Emails */}
          <div className="apple-card p-6 bg-gradient-to-tr from-rose-500/5 to-pink-500/5 border-rose-500/20 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-rose-700 uppercase tracking-widest block">Emails Sent</span>
              <span className="text-[28px] font-extrabold text-[var(--text)] block">{stats.emails}</span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-700 shadow-inner">
              <Mail size={22} />
            </div>
          </div>
        </div>

        {/* Content Section: Quick Actions & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Recent Activity */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between border-b border-white/20 pb-3">
              <h3 className="text-[18px] font-bold text-[var(--text)]">Recent Activity</h3>
              <button onClick={() => setView('history')} className="text-[12px] font-bold text-[var(--accent)] hover:underline flex items-center gap-1">
                View History <ArrowRight size={14} />
              </button>
            </div>

            <div className="space-y-3.5">
              {recentHistory.slice(0, 5).map((item) => (
                <div key={item.id} className="apple-card p-4.5 flex items-center justify-between bg-white/45 backdrop-blur-sm border-white/50 transition-all hover:bg-white/60">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 bg-emerald-500/10 border border-emerald-500/15 text-[var(--accent)] rounded-xl flex items-center justify-center shrink-0">
                      <FileText size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[14px] font-bold text-[var(--text)] truncate leading-tight">{item.hospital}</p>
                      <p className="text-[11.5px] text-[var(--text3)] font-semibold mt-0.5">{item.templateName} • {item.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 pl-4">
                    <button 
                      onClick={() => setRegeneratingItem({ ...item, _viewMode: true })}
                      disabled={isGenerating || regeneratingItem}
                      className="w-8.5 h-8.5 flex items-center justify-center bg-white/60 border border-white/70 hover:bg-white/80 rounded-xl text-[var(--text2)] transition-all shadow-sm"
                      title="View PDF"
                    >
                      <Eye size={14} />
                    </button>
                    <button 
                      onClick={() => setRegeneratingItem(item)}
                      disabled={isGenerating || regeneratingItem}
                      className="w-8.5 h-8.5 flex items-center justify-center bg-white/60 border border-white/70 hover:bg-white/80 rounded-xl text-[var(--accent)] transition-all shadow-sm"
                      title="Download PDF"
                    >
                      <Download size={14} />
                    </button>
                  </div>
                </div>
              ))}
              {recentHistory.length === 0 && (
                <div className="text-center py-16 bg-white/20 border border-dashed border-white/40 rounded-2xl">
                  <p className="text-[13px] text-[var(--text3)] italic">No quotation history recorded yet.</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="space-y-4">
            <h3 className="text-[18px] font-bold text-[var(--text)] border-b border-white/20 pb-3">Quick Actions</h3>
            <div className="grid grid-cols-1 gap-3">
              {/* Action 1: Create Quotation */}
              <button 
                onClick={() => setView('library')}
                className="w-full apple-card p-4.5 flex items-center gap-4 bg-gradient-to-tr from-emerald-600 to-teal-700 text-white border-transparent shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 active:translate-y-0 text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shadow-inner">
                  <FilePlus size={18} />
                </div>
                <div>
                  <h4 className="text-[14.5px] font-bold">New Quotation</h4>
                  <p className="text-[11.5px] text-teal-100 font-semibold mt-0.5">Select template and draft quotation</p>
                </div>
              </button>

              {/* Action 2: Upload Drive document */}
              <button 
                onClick={() => setView('drive')}
                className="w-full apple-card p-4.5 flex items-center gap-4 bg-white/50 border-white/50 text-left hover:border-white/70 hover:bg-white/60 transition-all shadow-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700 shadow-inner">
                  <UploadCloud size={18} />
                </div>
                <div>
                  <h4 className="text-[14.5px] font-bold text-[var(--text)]">Upload Drive File</h4>
                  <p className="text-[11.5px] text-[var(--text3)] font-semibold mt-0.5">Save documents in cloud drive</p>
                </div>
              </button>

              {/* Action 3: Dispatch Email */}
              <button 
                onClick={() => setView('emailer')}
                className="w-full apple-card p-4.5 flex items-center gap-4 bg-white/50 border-white/50 text-left hover:border-white/70 hover:bg-white/60 transition-all shadow-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-700 shadow-inner">
                  <Send size={18} />
                </div>
                <div>
                  <h4 className="text-[14.5px] font-bold text-[var(--text)]">Compose Email</h4>
                  <p className="text-[11.5px] text-[var(--text3)] font-semibold mt-0.5">Send attachments via Resend</p>
                </div>
              </button>
            </div>

            {/* Visual SVG Activity Flow (New Chart Component) */}
            <div className="apple-card p-5 bg-white/40 border-white/50 shadow-sm mt-4">
              <h4 className="text-[11px] font-bold text-[var(--text3)] uppercase tracking-wider mb-4">Quotation Activity Metrics</h4>
              <div className="h-[120px] flex items-end justify-between px-2 pt-2 gap-2">
                {/* Visualizing 7 columns representing mock days */}
                {[20, 45, 30, 65, 80, 50, 70].map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                    <div 
                      className={`w-full rounded-t-lg bg-gradient-to-t ${
                        i === 4 ? 'from-emerald-600 to-teal-500 shadow-md shadow-emerald-500/15' : 'from-slate-400/30 to-slate-500/40'
                      }`}
                      style={{ height: `${h}px` }}
                    />
                    <span className="text-[9px] font-bold text-[var(--text3)]">
                      {['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
