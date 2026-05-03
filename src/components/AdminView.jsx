import React from 'react';
import { UploadCloud, Plus, Building2, Trash2 } from 'lucide-react';

const AdminView = ({ attachments, handleFileUpload, deleteAttachment }) => {
  return (
    <div className="h-full overflow-y-auto px-8 py-12 md:px-16 md:py-16">
      <div className="max-w-3xl mx-auto">
        <h1 className="apple-title-1 mb-2">Brands</h1>
        <p className="apple-subtitle mb-12">Manage manufacturer PDF price lists to append to quotations.</p>

        <div className="apple-card p-12 text-center mb-12">
          <div className="w-16 h-16 bg-[var(--apple-gray-1)] text-[var(--apple-black)] rounded-2xl flex items-center justify-center mx-auto mb-6">
            <UploadCloud size={32} />
          </div>
          <h2 className="text-[24px] font-semibold tracking-tight mb-2">Upload Price List</h2>
          <p className="text-[15px] text-[var(--apple-gray-5)] mb-8">Select a PDF to map to a brand name. (Max 5MB)</p>
          
          <input type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" id="admin-upload" />
          <label htmlFor="admin-upload" className="btn-primary">
            <Plus size={18} /> Select PDF
          </label>
        </div>

        <div>
          <h3 className="apple-label mb-4">Linked Price Lists ({attachments.length})</h3>
          <div className="space-y-4">
            {attachments.map(att => (
              <div key={att.id} className="apple-card p-6 flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 bg-[var(--apple-gray-1)] rounded-full flex items-center justify-center">
                    <Building2 size={24} className="text-[var(--apple-black)]" />
                  </div>
                  <div>
                    <p className="text-[17px] font-semibold text-[var(--apple-black)]">{att.label}</p>
                    <p className="text-[13px] text-[var(--apple-gray-5)] mt-1">{att.fileName}</p>
                  </div>
                </div>
                <button 
                  onClick={() => deleteAttachment(att)} 
                  className="w-10 h-10 flex items-center justify-center text-[var(--apple-gray-4)] hover:text-red-500 bg-[var(--apple-gray-1)] hover:bg-red-50 rounded-full transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(AdminView);
