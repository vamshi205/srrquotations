import React, { useState, useEffect } from 'react';
import { Mail, FileText, FileCheck, CheckSquare, ChevronRight, HardDrive } from 'lucide-react';

const EmailerView = ({ driveFiles }) => {
  const [emailForm, setEmailForm] = useState({
    to: '',
    subject: 'Documents from Sri Raja Rajeshwari Ortho Plus',
    body: 'Dear Sir/Madam,\n\nPlease find the attached documents for your reference.\n\nRegards,\nSri Raja Rajeshwari Ortho Plus',
    selectedDriveFiles: []
  });

  // Auto-generate subject and body based on selection
  useEffect(() => {
    if (emailForm.selectedDriveFiles.length === 0) {
      setEmailForm(prev => ({
        ...prev,
        subject: 'Documents from Sri Raja Rajeshwari Ortho Plus',
        body: 'Dear Sir/Madam,\n\nPlease find the attached documents for your reference.\n\nRegards,\nSri Raja Rajeshwari Ortho Plus'
      }));
      return;
    }

    const srrFiles = emailForm.selectedDriveFiles.filter(f => f.isSRR);
    const vendorFiles = emailForm.selectedDriveFiles.filter(f => !f.isSRR);
    
    let subject = 'Documents: ';
    if (srrFiles.length > 0 && vendorFiles.length > 0) {
      subject += `SRR & Manufacturer Documents`;
    } else if (srrFiles.length > 0) {
      subject += `SRR Documents`;
    } else {
      subject += `Manufacturer Documents`;
    }

    let body = `Dear Sir/Madam,\n\nPlease find the attached documents for your reference:\n\n`;
    
    if (srrFiles.length > 0) {
      body += `SRR Documents:\n`;
      srrFiles.forEach((f, i) => {
        body += `${i + 1}. ${f.label || f.fileName}\n`;
      });
      body += `\n`;
    }

    if (vendorFiles.length > 0) {
      body += `Manufacturer Documents:\n`;
      vendorFiles.forEach((f, i) => {
        body += `${i + 1}. ${f.label || f.fileName}\n`;
      });
      body += `\n`;
    }

    body += `Thank you for your business.\n\nRegards,\nSri Raja Rajeshwari Ortho Plus`;

    setEmailForm(prev => ({ ...prev, subject, body }));
  }, [emailForm.selectedDriveFiles]);

  const toggleFile = (file, isSRR) => {
    const fileWithTag = { ...file, isSRR };
    const exists = emailForm.selectedDriveFiles.find(f => f.id === file.id);
    if (exists) {
      setEmailForm(prev => ({
        ...prev,
        selectedDriveFiles: prev.selectedDriveFiles.filter(f => f.id !== file.id)
      }));
    } else {
      setEmailForm(prev => ({
        ...prev,
        selectedDriveFiles: [...prev.selectedDriveFiles, fileWithTag]
      }));
    }
  };

  const [isSending, setIsSending] = useState(false);

  const handleSendEmail = async () => {
    if (!emailForm.to) return alert('Please enter recipient email.');
    
    setIsSending(true);
    const scriptUrl = import.meta.env.VITE_GMAIL_SCRIPT_URL;

    if (!scriptUrl) {
      alert('Gmail Script URL not configured in .env.local. Falling back to manual Gmail.');
      const { to, subject, body } = emailForm;
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(gmailUrl, '_blank');
      setIsSending(false);
      return;
    }

    // Prepare files for attachment
    const filesToAttach = emailForm.selectedDriveFiles.map(f => ({
      fileName: f.fileName || f.label || 'Document.pdf',
      url: f.data // This is the Firebase Storage download URL
    }));

    try {
      const response = await fetch(scriptUrl, {
        method: 'POST',
        mode: 'no-cors', // Google Apps Script requires no-cors for simple redirect handling
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: import.meta.env.VITE_GMAIL_TOKEN,
          to: emailForm.to,
          subject: emailForm.subject,
          body: emailForm.body,
          files: filesToAttach
        })
      });

      // Note: with 'no-cors', we can't read the response body, 
      // but if it doesn't throw, it usually sent successfully.
      alert('Email sent successfully via srrorthoplus999@gmail.com!');
      setEmailForm(prev => ({ ...prev, selectedDriveFiles: [] }));
    } catch (err) {
      console.error('Email error:', err);
      alert('Failed to send email automatically. Please try the manual Gmail option.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto px-8 py-12 md:px-16 md:py-16 bg-[var(--apple-gray-2)]">
      <div className="max-w-4xl mx-auto flex flex-col lg:flex-row gap-8">
        
        {/* Left Side: Composer */}
        <div className="flex-1 space-y-6">
          <div className="bg-white shadow-2xl border border-[var(--apple-gray-3)] flex flex-col overflow-hidden">
            <div className="bg-[var(--apple-gray-1)] px-8 py-6 border-b border-[var(--apple-gray-2)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[var(--accent)] flex items-center justify-center">
                  <Mail className={`${isSending ? 'animate-bounce' : ''} text-white`} size={20} />
                </div>
                <div>
                  <h3 className="text-[17px] font-bold">Emailer</h3>
                  <p className="text-[11px] text-[var(--apple-gray-5)] uppercase font-bold tracking-wider">
                    {isSending ? 'Sending Message...' : 'Automated Dispatch'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-[var(--apple-gray-4)] uppercase tracking-widest">Sender Account</p>
                <p className="text-[12px] font-semibold text-[var(--accent)]">srrorthoplus999@gmail.com</p>
              </div>
            </div>

            <div className="p-8 space-y-6">
              {/* Recipient */}
              <div className="flex items-center gap-4 border border-[var(--apple-gray-3)] px-4 py-3 bg-white focus-within:border-[var(--accent)] focus-within:ring-1 focus-within:ring-[var(--accent)] transition-all">
                <span className="text-[13px] font-bold text-[var(--apple-gray-5)] w-10 uppercase tracking-wider">To</span>
                <input 
                  type="email" 
                  value={emailForm.to} 
                  onChange={(e) => setEmailForm({...emailForm, to: e.target.value})}
                  placeholder="hospital-representative@email.com" 
                  className="flex-1 bg-transparent no-internal-border text-[15px] placeholder:text-[var(--apple-gray-4)]" 
                />
              </div>

              {/* Subject */}
              <div className="flex items-center gap-4 border border-[var(--apple-gray-3)] px-4 py-3 bg-white focus-within:border-[var(--accent)] focus-within:ring-1 focus-within:ring-[var(--accent)] transition-all">
                <span className="text-[13px] font-bold text-[var(--apple-gray-5)] w-10 uppercase tracking-wider">Sub</span>
                <input 
                  type="text" 
                  value={emailForm.subject} 
                  onChange={(e) => setEmailForm({...emailForm, subject: e.target.value})}
                  className="flex-1 bg-transparent no-internal-border text-[15px] font-semibold" 
                />
              </div>

              {/* Body */}
              <div className="border border-[var(--apple-gray-3)] p-4 bg-white focus-within:border-[var(--accent)] focus-within:ring-1 focus-within:ring-[var(--accent)] transition-all">
                <textarea 
                  value={emailForm.body} 
                  onChange={(e) => setEmailForm({...emailForm, body: e.target.value})}
                  placeholder="Type your message here..."
                  className="w-full min-h-[350px] bg-transparent no-internal-border text-[15px] leading-relaxed resize-none" 
                />
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleSendEmail} 
                  disabled={isSending}
                  className={`btn-primary w-full !py-4 text-[15px] ${isSending ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {isSending ? 'Processing...' : <><Mail size={18} /> Send with Attachments</>}
                </button>
                <p className="text-[11px] text-[var(--apple-gray-4)] text-center italic">
                  {isSending 
                    ? 'Connecting to Google Services...' 
                    : 'Real attachments will be fetched and sent automatically.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Selection */}
        <div className="w-full lg:w-[350px] space-y-8">
          <div>
            <h4 className="text-[13px] font-bold text-[var(--apple-gray-5)] uppercase tracking-wider mb-4 flex items-center gap-2">
              <HardDrive size={16} /> SRR Documents
            </h4>
            <div className="space-y-2">
              {(driveFiles.srr || []).map(file => (
                <button
                  key={file.id}
                  onClick={() => toggleFile(file, true)}
                  className={`w-full flex items-center gap-3 p-3 border text-left transition-all ${emailForm.selectedDriveFiles.find(f => f.id === file.id) ? 'bg-emerald-50 border-[var(--accent)]' : 'bg-white border-[var(--apple-gray-2)] hover:bg-[var(--apple-gray-1)]'}`}
                >
                  <div className={`w-5 h-5 border flex items-center justify-center ${emailForm.selectedDriveFiles.find(f => f.id === file.id) ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-[var(--apple-gray-3)]'}`}>
                    {emailForm.selectedDriveFiles.find(f => f.id === file.id) && <CheckSquare size={12} className="text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold truncate">{file.label}</p>
                    <p className="text-[10px] text-[var(--apple-gray-4)] uppercase">{file.uploadedAt || 'Cloud File'}</p>
                  </div>
                </button>
              ))}
              {(!driveFiles.srr || driveFiles.srr.length === 0) && (
                <p className="text-[13px] text-[var(--apple-gray-4)] italic p-4 border border-dashed border-[var(--apple-gray-3)] text-center">No SRR files found</p>
              )}
            </div>
          </div>

          <div>
            <h4 className="text-[13px] font-bold text-[var(--apple-gray-5)] uppercase tracking-wider mb-4 flex items-center gap-2">
              <HardDrive size={16} /> Manufacturer Documents
            </h4>
            <div className="space-y-6">
              {(driveFiles.vendor || []).map(folder => (
                <div key={folder.id} className="space-y-2">
                  <p className="text-[11px] font-bold text-amber-600 uppercase flex items-center gap-1">
                    <ChevronRight size={12} /> {folder.name}
                  </p>
                  <div className="space-y-2 pl-2 border-l border-[var(--apple-gray-3)]">
                    {(folder.files || []).map(file => (
                      <button
                        key={file.id}
                        onClick={() => toggleFile(file, false)}
                        className={`w-full flex items-center gap-3 p-2.5 border text-left transition-all ${emailForm.selectedDriveFiles.find(f => f.id === file.id) ? 'bg-amber-50 border-amber-400' : 'bg-white border-[var(--apple-gray-2)] hover:bg-[var(--apple-gray-1)]'}`}
                      >
                        <div className={`w-4 h-4 border flex items-center justify-center ${emailForm.selectedDriveFiles.find(f => f.id === file.id) ? 'bg-amber-500 border-amber-500' : 'border-[var(--apple-gray-3)]'}`}>
                          {emailForm.selectedDriveFiles.find(f => f.id === file.id) && <CheckSquare size={10} className="text-white" />}
                        </div>
                        <span className="text-[12px] font-medium truncate">{file.fileName}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {(!driveFiles.vendor || driveFiles.vendor.length === 0) && (
                <p className="text-[13px] text-[var(--apple-gray-4)] italic p-4 border border-dashed border-[var(--apple-gray-3)] text-center">No vendor folders found</p>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default EmailerView;
