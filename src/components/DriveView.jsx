import React from 'react';
import { Award, Folder, Trash2, Download, FileCheck, Share2, Plus, UploadCloud, FolderOpen } from 'lucide-react';

const DriveView = ({ driveFiles, handleDriveUpload, handleDeleteDriveFile, handleCreateFolder, handleDeleteFolder, downloadFolderAsZip, openVendorFolder, setOpenVendorFolder, confirmDelete }) => {
  return (
    <div className="h-full overflow-y-auto px-8 py-12 md:px-16 md:py-16">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12">
          <h1 className="apple-title-1 mb-2">Drive</h1>
          <p className="apple-subtitle">Manage your business documents and vendor files.</p>
        </header>

        {/* ── SRR DRIVE ── */}
        <div className="mb-12">
          <div className="relative overflow-hidden rounded-2xl border-2 border-[var(--emerald)] bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-6 mb-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-[var(--emerald)] rounded-xl flex items-center justify-center shadow-md shadow-emerald-200">
                  <Award size={22} className="text-white" />
                </div>
                <div>
                  <h2 className="text-[20px] font-bold tracking-tight">SRR Drive</h2>
                  <p className="text-[13px] text-[var(--apple-gray-5)]">Business certificates & documents • {(driveFiles.srr || []).length} files</p>
                </div>
              </div>
              <div>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={(e) => handleDriveUpload(e, 'drive_srr')} className="hidden" id="srr-upload" />
                <label htmlFor="srr-upload" className="btn-primary cursor-pointer">
                  <Plus size={18} /> Upload
                </label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(driveFiles.srr || []).map(file => (
              <div key={file.id} className="apple-card p-4 flex flex-col gap-3 group hover:border-[var(--emerald)] transition-all">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 bg-emerald-50 text-[var(--emerald)] rounded-lg flex items-center justify-center">
                    <FileCheck size={20} />
                  </div>
                  <button 
                    onClick={() => handleDeleteDriveFile('drive_srr', file)} 
                    className="p-1.5 text-[var(--apple-gray-4)] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div>
                  <p className="text-[15px] font-bold truncate">{file.label}</p>
                  <p className="text-[11px] text-[var(--apple-gray-5)] font-medium mt-0.5">{file.uploadedAt} • {file.fileName}</p>
                </div>
                <a href={file.data} target="_blank" rel="noreferrer" className="mt-2 text-[12px] font-bold text-[var(--emerald)] flex items-center gap-1 hover:underline">
                  <Download size={14} /> View Document
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* ── VENDOR DRIVE ── */}
        <div>
          <header className="flex items-center justify-between mb-6">
            <h2 className="text-[20px] font-bold tracking-tight">Vendor Drive</h2>
            <button onClick={handleCreateFolder} className="text-[13px] font-bold text-[var(--coral)] hover:underline flex items-center gap-1">
              <Plus size={16} /> New Folder
            </button>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(driveFiles.vendor || []).map(folder => (
              <div key={folder.id} className="apple-card overflow-hidden group hover:border-[var(--coral)] transition-all">
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 bg-red-50 text-[var(--coral)] rounded-lg flex items-center justify-center">
                      <Folder size={20} />
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => downloadFolderAsZip(folder)} className="p-1.5 text-[var(--apple-gray-4)] hover:text-[var(--emerald)]" title="Download ZIP"><Download size={16} /></button>
                      <button onClick={() => handleDeleteFolder(folder)} className="p-1.5 text-[var(--apple-gray-4)] hover:text-red-500" title="Delete Folder"><Trash2 size={16} /></button>
                    </div>
                  </div>
                  <h3 className="text-[16px] font-bold mb-1">{folder.name}</h3>
                  <p className="text-[12px] text-[var(--apple-gray-5)] font-medium">{(folder.files || []).length} items • Manufacturer Docs</p>
                  
                  <button 
                    onClick={() => setOpenVendorFolder(openVendorFolder === folder.id ? null : folder.id)}
                    className="w-full mt-4 py-2 px-3 bg-[var(--apple-gray-1)] hover:bg-[var(--apple-gray-2)] rounded-lg text-[12px] font-bold transition-colors flex items-center justify-center gap-2"
                  >
                    {openVendorFolder === folder.id ? 'Close Folder' : <><FolderOpen size={14} /> Open Folder</>}
                  </button>
                </div>

                {openVendorFolder === folder.id && (
                  <div className="bg-[var(--apple-gray-1)] border-t border-[var(--apple-gray-2)] p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-bold text-[var(--apple-gray-5)] uppercase tracking-widest">Files</span>
                      <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleDriveUpload(e, 'drive_vendor_files', folder.id)} className="hidden" id={`file-upload-${folder.id}`} />
                      <label htmlFor={`file-upload-${folder.id}`} className="text-[11px] font-bold text-[var(--emerald)] cursor-pointer hover:underline">+ Add Files</label>
                    </div>
                    {(folder.files || []).map(file => (
                      <div key={file.id} className="flex items-center justify-between gap-3 bg-white p-2.5 rounded-lg border border-[var(--apple-gray-2)] group/file">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <FileCheck size={14} className="text-[var(--apple-gray-4)] shrink-0" />
                          <span className="text-[12px] font-medium truncate">{file.fileName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <a href={file.data} target="_blank" rel="noreferrer" className="text-[var(--apple-gray-4)] hover:text-[var(--emerald)]"><Download size={14} /></a>
                          <button onClick={() => handleDeleteDriveFile('drive_vendor_files', file)} className="text-[var(--apple-gray-4)] hover:text-red-500"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    ))}
                    {(folder.files || []).length === 0 && (
                      <p className="text-[11px] text-[var(--apple-gray-4)] italic text-center py-4">This folder is empty.</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(DriveView);
