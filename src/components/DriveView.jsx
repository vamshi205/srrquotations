import React from 'react';
import { Award, Folder, Trash2, Download, FileCheck, Share2, Plus, UploadCloud, FolderOpen } from 'lucide-react';

const DriveView = ({ driveFiles, handleDriveUpload, handleDeleteDriveFile, handleCreateFolder, handleDeleteFolder, downloadFolderAsZip, openVendorFolder, setOpenVendorFolder, confirmDelete }) => {
  return (
    <div className="h-full overflow-y-auto px-6 py-10 md:px-16 md:py-12">
      <div className="max-w-6xl mx-auto">
        <header className="mb-10 md:mb-12">
          <h1 className="apple-title-1 mb-2">Drive</h1>
          <p className="apple-subtitle">Manage your business documents and vendor files in a secure, frosted environment.</p>
        </header>

        {/* ── SRR DRIVE ── */}
        <div className="mb-12">
          <div className="apple-card p-6 mb-6 bg-white/50 backdrop-blur-md border border-white/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/70 border border-white/50 text-[var(--accent)] rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                  <Award size={24} />
                </div>
                <div>
                  <h2 className="text-[19px] font-bold tracking-tight text-[var(--text)]">SRR Drive</h2>
                  <p className="text-[13px] text-[var(--text3)]">{(driveFiles.srr || []).length} Business certificates & documents</p>
                </div>
              </div>
              <div className="w-full sm:w-auto">
                <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={(e) => handleDriveUpload(e, 'drive_srr')} className="hidden" id="srr-upload" />
                <label htmlFor="srr-upload" className="btn-primary cursor-pointer w-full justify-center sm:w-auto">
                  <Plus size={18} /> Upload File
                </label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {(driveFiles.srr || []).map(file => (
              <div key={file.id} className="apple-card p-5 flex flex-col justify-between group hover:border-[var(--accent)] transition-all h-[160px]">
                <div>
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 bg-emerald-50 border border-emerald-100 text-[var(--accent)] rounded-xl flex items-center justify-center shrink-0">
                      <FileCheck size={20} />
                    </div>
                    <button 
                      onClick={() => handleDeleteDriveFile('drive_srr', file)} 
                      className="p-1.5 text-[var(--apple-gray-4)] hover:text-red-500 md:opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 rounded-lg"
                      title="Delete file"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <div className="min-w-0 mt-3">
                    <p className="text-[14.5px] font-bold truncate text-[var(--text)]">{file.label}</p>
                    <p className="text-[11px] text-[var(--text3)] font-medium mt-0.5 truncate">{file.uploadedAt} • {file.fileName}</p>
                  </div>
                </div>
                <a href={file.data} target="_blank" rel="noreferrer" className="mt-4 text-[12px] font-bold text-[var(--accent)] flex items-center gap-1 hover:underline">
                  <Download size={13} /> View Document
                </a>
              </div>
            ))}
            {(driveFiles.srr || []).length === 0 && (
              <div className="col-span-full py-12 bg-white/30 border border-dashed border-white/50 rounded-2xl text-center">
                <p className="text-[14px] text-[var(--text3)] italic">No SRR files uploaded yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* ── VENDOR DRIVE ── */}
        <div>
          <header className="flex items-center justify-between mb-6">
            <h2 className="text-[20px] font-bold tracking-tight text-[var(--text)]">Vendor Drive</h2>
            <button onClick={handleCreateFolder} className="text-[13px] font-bold text-[var(--coral)] hover:underline flex items-center gap-1 bg-white/45 px-3 py-1.5 rounded-xl border border-white/50 shadow-sm transition-all hover:bg-white/60">
              <Plus size={16} /> New Folder
            </button>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {(driveFiles.vendor || []).map(folder => (
              <div key={folder.id} className="apple-card overflow-hidden group hover:border-[var(--coral)] transition-all flex flex-col justify-between">
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 bg-red-50 border border-red-100 text-[var(--coral)] rounded-xl flex items-center justify-center shrink-0">
                      <Folder size={20} />
                    </div>
                    <div className="flex gap-1 md:opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => downloadFolderAsZip(folder)} className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--apple-gray-4)] hover:text-[var(--accent)] hover:bg-emerald-50" title="Download ZIP"><Download size={14} /></button>
                      <button onClick={() => handleDeleteFolder(folder)} className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--apple-gray-4)] hover:text-red-500 hover:bg-red-50" title="Delete Folder"><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <h3 className="text-[15.5px] font-bold mb-1 truncate text-[var(--text)]">{folder.name}</h3>
                  <p className="text-[12px] text-[var(--text3)] font-medium">{(folder.files || []).length} items • Manufacturer Docs</p>
                  
                  <button 
                    onClick={() => setOpenVendorFolder(openVendorFolder === folder.id ? null : folder.id)}
                    className="w-full mt-5 py-2.5 px-3 bg-white/40 border border-white/60 hover:bg-white/60 rounded-xl text-[12px] font-bold transition-all flex items-center justify-center gap-2"
                  >
                    {openVendorFolder === folder.id ? 'Close Folder' : <><FolderOpen size={14} /> Open Folder</>}
                  </button>
                </div>

                {openVendorFolder === folder.id && (
                  <div className="bg-white/40 border-t border-white/50 p-4 space-y-2.5 max-h-[300px] overflow-y-auto">
                    <div className="flex items-center justify-between gap-2 mb-2 sticky top-0 bg-white/45 backdrop-blur-sm pb-2 z-10">
                      <span className="text-[10px] font-bold text-[var(--text3)] uppercase tracking-wider">Files</span>
                      <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleDriveUpload(e, 'drive_vendor_files', folder.id)} className="hidden" id={`file-upload-${folder.id}`} />
                      <label htmlFor={`file-upload-${folder.id}`} className="text-[11px] font-bold text-[var(--accent)] cursor-pointer hover:underline">+ Add Files</label>
                    </div>
                    {(folder.files || []).length === 0 ? (
                      <p className="text-[11px] text-center text-[var(--text3)] py-4 italic">No files yet.</p>
                    ) : (
                      (folder.files || []).map(file => (
                        <div key={file.id} className="flex items-center justify-between gap-3 bg-white/60 p-2.5 rounded-xl border border-white/50 shadow-sm">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileCheck size={14} className="text-[var(--accent)] shrink-0" />
                            <span className="text-[12.5px] font-semibold text-[var(--text)] truncate">{file.label}</span>
                          </div>
                          <button onClick={() => handleDeleteDriveFile('drive_vendor_files', file)} className="p-1 text-[var(--apple-gray-4)] hover:text-red-500 hover:bg-red-50 rounded shrink-0">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
            {(driveFiles.vendor || []).length === 0 && (
              <div className="col-span-full py-12 bg-white/30 border border-dashed border-white/50 rounded-2xl text-center">
                <p className="text-[14px] text-[var(--text3)] italic">No manufacturer folders found.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(DriveView);
