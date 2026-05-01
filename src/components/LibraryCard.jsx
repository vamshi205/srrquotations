import React from 'react';
import { Edit2, Trash2, ArrowRight, Paperclip } from 'lucide-react';

export default function LibraryCard({ template, onEdit, onDelete, onUse }) {
  const handleDelete = () => {
    const pwd = window.prompt('Enter password to delete this template:');
    if (pwd === null) return; // cancelled
    if (pwd !== 'srrortho') {
      window.alert('Incorrect password. Template not deleted.');
      return;
    }
    onDelete(template.id);
  };

  return (
    <div
      className="bg-white rounded-3xl border-2 border-slate-100 shadow-sm hover:shadow-lg transition-all p-6 flex flex-col justify-between group"
      style={{ transition: 'box-shadow 0.2s, border-color 0.2s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--emerald-light)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = '#f1f5f9'}
    >
      {/* Top: name + description */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-lg font-black text-slate-900 leading-tight">{template.name}</h3>
          {template.requiresAttachment && (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-widest flex-shrink-0"
              style={{ background: 'var(--emerald-light)', color: 'var(--emerald-dark)' }}
            >
              <Paperclip size={10} /> Attachment
            </span>
          )}
        </div>
        <p className="text-sm text-slate-500 font-medium line-clamp-2">{template.description}</p>
      </div>

      {/* Bottom: actions */}
      <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-50">
        <button
          onClick={() => onUse(template)}
          className="flex items-center gap-1.5 text-sm font-black uppercase tracking-widest transition-all"
          style={{ color: 'var(--emerald)' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--emerald-dark)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--emerald)'}
        >
          Use Template <ArrowRight size={16} />
        </button>
        <div className="flex gap-1">
          <button
            onClick={() => onEdit(template)}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
            title="Edit template"
          >
            <Edit2 size={15} />
          </button>
          <button
            onClick={handleDelete}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
            title="Delete template"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
