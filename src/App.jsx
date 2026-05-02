import React, { useState, useEffect } from 'react';
import QuotationTemplate from './components/QuotationTemplate';
import LibraryCard from './components/LibraryCard';
import jsPDF from 'jspdf';
import { toJpeg } from 'html-to-image';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import Login from './components/Login';
import { auth, db, hasFirebaseConfig } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc, query, orderBy } from 'firebase/firestore';
import { 
  Download, 
  Plus, 
  FileText, 
  Settings,
  ChevronLeft,
  Database,
  ArrowRight,
  Type,
  Table as TableIcon,
  Trash2,
  Edit2,
  UploadCloud,
  LayoutDashboard,
  ShieldCheck,
  Eye,
  FilePlus2,
  Building2,
  FileUp,
  Save,
  Search,
  Share2,
  HardDrive,
  FolderOpen,
  Folder,
  Award,
  FileCheck
} from 'lucide-react';

function App() {
  const [view, setView] = useState('library'); 
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    if (!hasFirebaseConfig) {
      setIsAuthLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const allowedEmailsStr = import.meta.env.VITE_ALLOWED_EMAILS || '';
        const allowedEmails = allowedEmailsStr.split(',').map(e => e.trim().toLowerCase()).filter(e => e);
        
        if (allowedEmails.length > 0 && !allowedEmails.includes(currentUser.email.toLowerCase())) {
          await signOut(auth);
          setAuthError('Your email address is not authorized to access this application.');
          setUser(null);
          setIsAuthLoading(false);
          return;
        }

        setUser(currentUser);
        setAuthError('');
        try {
          // 1. Fetch Basic Settings & Templates
          const docRef = doc(db, 'users', currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.companyData) setCompanyData(typeof data.companyData === 'string' ? JSON.parse(data.companyData) : data.companyData);
            if (data.templates) setTemplates(typeof data.templates === 'string' ? JSON.parse(data.templates) : data.templates);
          }

          // 2. Fetch Attachments (Sub-collection)
          const attsSnap = await getDocs(collection(db, 'users', currentUser.uid, 'attachments'));
          const attsList = attsSnap.docs.map(d => d.data());
          if (attsList.length > 0) setAttachments(attsList);

          // 3. Fetch Quotation History (Sub-collection)
          const historySnap = await getDocs(query(collection(db, 'users', currentUser.uid, 'history'), orderBy('id', 'desc')));
          const historyList = historySnap.docs.map(d => d.data());
          if (historyList.length > 0) setQuotationHistory(historyList);

          // 4. Fetch Drive Files (SRR)
          const srrSnap = await getDocs(collection(db, 'users', currentUser.uid, 'drive_srr'));
          const srrList = srrSnap.docs.map(d => d.data());

          // 5. Fetch Drive Folders & Files (Vendor)
          const foldersSnap = await getDocs(collection(db, 'users', currentUser.uid, 'drive_folders'));
          const foldersList = foldersSnap.docs.map(d => d.data());
          const vFilesSnap = await getDocs(collection(db, 'users', currentUser.uid, 'drive_vendor_files'));
          const vFilesList = vFilesSnap.docs.map(d => d.data());

          const fullFolders = foldersList.map(folder => ({
            ...folder,
            files: vFilesList.filter(f => f.folderId === folder.id)
          }));

          setDriveFiles({ srr: srrList, vendor: fullFolders });

        } catch (e) {
          console.error("Firestore loading error:", e);
        }
      } else {
        setUser(null);
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);
  
  const getTodayFormatted = () => {
    const d = new Date();
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  };

  const getNextRefNumber = (history) => {
    const year = new Date().getFullYear();
    const prefix = `SRR/${year}/`;
    let maxNum = 0;
    (history || []).forEach(item => {
      if (item.ref && item.ref.startsWith(prefix)) {
        const num = parseInt(item.ref.replace(prefix, ''), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    });
    return `${prefix}${String(maxNum + 1).padStart(3, '0')}`;
  };

  const getFileData = async (dataOrUrl) => {
    if (!dataOrUrl) return null;
    if (dataOrUrl.startsWith('http')) {
      const response = await fetch(dataOrUrl);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    }
    return dataOrUrl;
  };

  const [formData, setFormData] = useState({
    hospitalName: '',
    address: '',
    date: getTodayFormatted(),
    referenceNumber: '',
    subject: 'Quotation for Orthopedic Implants & instruments',
    discount: '40%',
    payment: '30 days',
    gst: '5%',
    validity: '31/03/2027',
    make: '',
    delivery: '',
    attachmentLabel: '',
    selectedTemplateId: ''
  });

  const [draftContent, setDraftContent] = useState([]);
  const [draftRequiresAttachment, setDraftRequiresAttachment] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  // Persistent Storage
  const [companyData, setCompanyData] = useState(() => {
    const saved = localStorage.getItem('srr_company_data');
    return saved ? JSON.parse(saved) : {
      name: 'Sri Raja Rajeshwari Ortho Plus',
      address: 'H.No. 6-2-599 | Khairthabad | Hyderabad | Telangana - 500004',
      phone: '9396857455, 9397857455 | 040-65557455',
      email: 'srrorthoplus999@gmail.com',
      website: 'www.srrorthoplus.com'
    };
  });

  const [attachments, setAttachments] = useState(() => {
    const saved = localStorage.getItem('srr_attachments');
    return saved ? JSON.parse(saved) : [];
  });

  const [templates, setTemplates] = useState(() => {
    const saved = localStorage.getItem('srr_templates');
    return saved ? JSON.parse(saved) : [
      {
        id: 'default',
        name: 'Standard Implants',
        description: 'Standard quotation for surgical implants.',
        requiresAttachment: true,
        subject: 'Quotation for Orthopedic Implants & instruments',
        defaultMake: '',
        defaultDelivery: 'Immediate',
        defaultDiscount: '40%',
        defaultGst: '5%',
        defaultPayment: '30 days',
        defaultValidity: '31/03/2027',
        content: [
          { type: 'text', value: 'With reference to the subject cited above we are herewith submitting our lowest quotation for the enclosed Orthopedic Implants & instruments under the following terms& conditions. Please find the same.' }
        ]
      }
    ];
  });

  const [quotationHistory, setQuotationHistory] = useState(() => {
    const saved = localStorage.getItem('srr_history');
    return saved ? JSON.parse(saved) : [];
  });

  const [driveFiles, setDriveFiles] = useState(() => {
    const saved = localStorage.getItem('srr_drive');
    return saved ? JSON.parse(saved) : { srr: [], vendor: [] };
  });

  // Set initial ref number from history
  const refInitialized = React.useRef(false);
  useEffect(() => {
    if (!refInitialized.current && quotationHistory !== undefined) {
      refInitialized.current = true;
      setFormData(prev => ({ ...prev, referenceNumber: prev.referenceNumber || getNextRefNumber(quotationHistory) }));
    }
  }, [quotationHistory]);

  const syncItem = async (colName, item, isDelete = false) => {
    if (!user) return;
    try {
      const itemRef = doc(db, 'users', user.uid, colName, item.id);
      if (isDelete) { await deleteDoc(itemRef); }
      else { await setDoc(itemRef, item); }
    } catch (err) { console.error(`Sync error (${colName}):`, err); }
  };

  const [isGenerating, setIsGenerating] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [regeneratingItem, setRegeneratingItem] = useState(null);
  const [openVendorFolder, setOpenVendorFolder] = useState(null);

  const confirmDelete = (callback) => {
    const pw = prompt('Enter admin password to delete:');
    if (pw === 'srrortho') { callback(); }
    else if (pw !== null) { alert('Incorrect password.'); }
  };

  const downloadFolderAsZip = async (folder) => {
    if (!folder.files || folder.files.length === 0) return alert('Folder is empty.');
    const zip = new JSZip();
    for (const file of folder.files) {
      const base64 = file.data.includes('base64,') ? file.data.split(',')[1] : file.data;
      zip.file(file.fileName, base64, { base64: true });
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `${folder.name}.zip`; link.click();
  };

  useEffect(() => {
    if (!regeneratingItem) return;
    const generateHistoryPDF = async () => {
      setIsGenerating(true);
      try {
        const element = document.getElementById('history-quotation-template');
        const dataUrl = await toJpeg(element, { quality: 0.95, backgroundColor: '#ffffff', pixelRatio: 2 });
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        pdf.addImage(dataUrl, 'JPEG', 0, 0, 210, 297);
        const coverArrayBuffer = pdf.output('arraybuffer');
        
        let finalPdfBytes;
        const attachmentRef = regeneratingItem.formData.attachmentLabel || regeneratingItem.formData.make;
        const selectedAttachment = regeneratingItem.requiresAttachment ? attachments.find(a => a.label === attachmentRef) : null;
        if (selectedAttachment) {
          if (!selectedAttachment.data || typeof selectedAttachment.data !== 'string') {
            alert('The brand PDF attachment in history is corrupted (likely from a previous session). Please re-upload it in the Library.');
            setIsGenerating(false);
            setRegeneratingItem(null);
            return;
          }
          const mergedPdf = await PDFDocument.create();
          const coverDoc = await PDFDocument.load(coverArrayBuffer);
          const [coverPage] = await mergedPdf.copyPages(coverDoc, [0]);
          mergedPdf.addPage(coverPage);
          
          const fileData = await getFileData(selectedAttachment.data);
          const base64Data = fileData.includes('base64,') ? fileData.split(',')[1] : fileData;
          const attachmentDoc = await PDFDocument.load(base64Data);
          // A4 dimensions in points (595.28 x 841.89)
          const A4_WIDTH = 595.28;
          const A4_HEIGHT = 841.89;
          const attachmentPages = attachmentDoc.getPages();
          for (const page of attachmentPages) {
            const embeddedPage = await mergedPdf.embedPage(page);
            const origW = embeddedPage.width;
            const origH = embeddedPage.height;
            const scaleX = A4_WIDTH / origW;
            const scaleY = A4_HEIGHT / origH;
            const scale = Math.min(scaleX, scaleY);
            const scaledW = origW * scale;
            const scaledH = origH * scale;
            const newPage = mergedPdf.addPage([A4_WIDTH, A4_HEIGHT]);
            newPage.drawPage(embeddedPage, {
              x: (A4_WIDTH - scaledW) / 2,
              y: (A4_HEIGHT - scaledH) / 2,
              width: scaledW,
              height: scaledH,
            });
          }
          finalPdfBytes = await mergedPdf.save();
        } else {
          finalPdfBytes = coverArrayBuffer;
        }

        const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
        const fileName = `Quotation_${regeneratingItem.formData.hospitalName}.pdf`;

        if (regeneratingItem._shareMode && navigator.share && navigator.canShare) {
          const file = new File([blob], fileName, { type: 'application/pdf' });
          if (navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({
                title: `Quotation - ${regeneratingItem.formData.hospitalName}`,
                text: `Quotation ${regeneratingItem.formData.referenceNumber} for ${regeneratingItem.formData.hospitalName}`,
                files: [file]
              });
            } catch (shareErr) {
              if (shareErr.name !== 'AbortError') console.error('Share failed:', shareErr);
            }
          } else {
            // Fallback: download
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a'); link.href = url; link.download = fileName; link.click();
          }
        } else {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a'); link.href = url; link.download = fileName; link.click();
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsGenerating(false);
        setRegeneratingItem(null);
      }
    };
    
    setTimeout(generateHistoryPDF, 150);
  }, [regeneratingItem, attachments]);

  // Sync metadata to Firestore & LocalStorage (Truncated data for Quota)
  useEffect(() => { 
    localStorage.setItem('srr_company_data', JSON.stringify(companyData)); 
    if (user) setDoc(doc(db, 'users', user.uid), { companyData }, { merge: true }).catch(console.error);
  }, [companyData, user]);

  useEffect(() => { 
    localStorage.setItem('srr_attachments', JSON.stringify(attachments.map(a => ({ ...a, data: 'TRUNCATED_FOR_QUOTA' })))); 
  }, [attachments]);

  useEffect(() => { 
    localStorage.setItem('srr_templates', JSON.stringify(templates)); 
    if (user) setDoc(doc(db, 'users', user.uid), { templates }, { merge: true }).catch(console.error);
  }, [templates, user]);

  useEffect(() => { 
    localStorage.setItem('srr_history', JSON.stringify(quotationHistory.slice(0, 10))); // Only last 10 in localStorage
  }, [quotationHistory]);

  useEffect(() => { 
    localStorage.setItem('srr_drive', JSON.stringify({
      srr: (driveFiles.srr || []).map(f => ({ ...f, data: 'TRUNCATED_FOR_QUOTA' })),
      vendor: (driveFiles.vendor || []).map(folder => ({
        ...folder,
        files: (folder.files || []).map(f => ({ ...f, data: 'TRUNCATED_FOR_QUOTA' }))
      }))
    })); 
  }, [driveFiles]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const useTemplate = (template) => {
    setFormData({ 
      hospitalName: '',
      address: '',
      date: getTodayFormatted(),
      referenceNumber: getNextRefNumber(quotationHistory),
      selectedTemplateId: template.id,
      subject: template.subject || 'Quotation for Orthopedic Implants & instruments',
      make: template.defaultMake || '',
      delivery: template.defaultDelivery || '',
      discount: template.defaultDiscount || '40%',
      gst: template.defaultGst || '5%',
      payment: template.defaultPayment || '30 days',
      validity: template.defaultValidity || '31/03/2027',
      attachmentLabel: ''
    });
    setDraftContent(JSON.parse(JSON.stringify(template.content))); 
    setDraftRequiresAttachment(template.requiresAttachment || false);
    setView('drafting');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    const label = prompt("Enter Brand Name (e.g. Zimmer, Stryker):");
    if (file && label) {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const newAttachment = { id: Date.now().toString(), label, data: ev.target.result, fileName: file.name };
        setAttachments([...attachments, newAttachment]);
        await syncItem('attachments', newAttachment);
      };
      reader.readAsDataURL(file);
    }
  };

  const generatePDF = async () => {
    if (!formData.hospitalName) return alert('Please enter Hospital Name.');
    setIsGenerating(true);
    try {
      const element = document.getElementById('quotation-template');
      const dataUrl = await toJpeg(element, { quality: 0.95, backgroundColor: '#ffffff', pixelRatio: 2 });
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      pdf.addImage(dataUrl, 'JPEG', 0, 0, 210, 297);
      const coverArrayBuffer = pdf.output('arraybuffer');
      let finalPdfBytes;
      const attachmentRef = formData.attachmentLabel || formData.make;
      const selectedAttachment = draftRequiresAttachment ? attachments.find(a => a.label === attachmentRef) : null;
      if (selectedAttachment) {
        if (!selectedAttachment.data || typeof selectedAttachment.data !== 'string') {
          alert('The brand PDF attachment is corrupted (likely from a previous session). Please delete and re-upload it in the Library.');
          setIsGenerating(false);
          return;
        }
        const mergedPdf = await PDFDocument.create();
        const coverDoc = await PDFDocument.load(coverArrayBuffer);
        const [coverPage] = await mergedPdf.copyPages(coverDoc, [0]);
        mergedPdf.addPage(coverPage);
        
        const fileData = await getFileData(selectedAttachment.data);
        const base64Data = fileData.includes('base64,') ? fileData.split(',')[1] : fileData;
        const attachmentDoc = await PDFDocument.load(base64Data);
        // A4 dimensions in points (595.28 x 841.89)
        const A4_WIDTH = 595.28;
        const A4_HEIGHT = 841.89;
        const attachmentPages = attachmentDoc.getPages();
        for (const page of attachmentPages) {
          const embeddedPage = await mergedPdf.embedPage(page);
          const origW = embeddedPage.width;
          const origH = embeddedPage.height;
          const scaleX = A4_WIDTH / origW;
          const scaleY = A4_HEIGHT / origH;
          const scale = Math.min(scaleX, scaleY);
          const scaledW = origW * scale;
          const scaledH = origH * scale;
          const newPage = mergedPdf.addPage([A4_WIDTH, A4_HEIGHT]);
          newPage.drawPage(embeddedPage, {
            x: (A4_WIDTH - scaledW) / 2,
            y: (A4_HEIGHT - scaledH) / 2,
            width: scaledW,
            height: scaledH,
          });
        }
        finalPdfBytes = await mergedPdf.save();
      } else {
        finalPdfBytes = coverArrayBuffer;
      }
      
      // Check ref number uniqueness
      const isDuplicateRef = quotationHistory.some(h => h.ref === formData.referenceNumber);
      if (isDuplicateRef) {
        alert(`Reference number ${formData.referenceNumber} already exists. Please use a unique reference number.`);
        setIsGenerating(false);
        return;
      }

      const historyItem = {
        id: Date.now().toString(),
        hospital: formData.hospitalName,
        date: formData.date,
        ref: formData.referenceNumber,
        templateName: templates.find(t => t.id === formData.selectedTemplateId)?.name || 'Custom',
        formData: JSON.parse(JSON.stringify(formData)),
        draftContent: JSON.parse(JSON.stringify(draftContent)),
        requiresAttachment: draftRequiresAttachment
      };
      setQuotationHistory([historyItem, ...quotationHistory]);
      await syncItem('history', historyItem);

      const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); 
      link.href = url; 
      link.download = `Quotation_${formData.hospitalName}.pdf`; 
      link.click();
    } catch (e) { console.error(e); } finally { setIsGenerating(false); }
  };

  const NavItem = ({ id, label }) => (
    <span 
      onClick={() => setView(id)}
      className={`apple-nav-link ${view === id ? 'active' : ''}`}
    >
      {label}
    </span>
  );

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error(e);
    }
  };

  if (isAuthLoading) {
    return <div className="min-h-screen bg-[var(--apple-gray-1)] flex items-center justify-center font-sans text-[var(--apple-gray-5)]">Loading...</div>;
  }

  // If Firebase is configured but no user is logged in, OR if Firebase is completely missing its config (in which case Login shows the setup guide)
  if (!user) {
    return (
      <>
        {authError && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-100 border border-red-200 text-red-700 px-6 py-3 rounded-2xl shadow-lg font-medium text-[14px]">
            {authError}
          </div>
        )}
        <Login />
      </>
    );
  }

  return (
    <div className="flex flex-col h-screen text-[var(--apple-black)] font-sans overflow-hidden bg-[var(--apple-bg)]">
      
      {/* ─────────────────────────────────────────
          APPLE NAV BAR (TOP)
          ───────────────────────────────────────── */}
      <nav className="apple-nav">
        <div className="flex items-center gap-2 mr-8">
          <div className="w-8 h-8 bg-[var(--coral)] rounded-lg flex items-center justify-center">
            <FileUp className="text-white w-4 h-4" />
          </div>
          <span className="font-bold text-lg tracking-tight">OrthoGen</span>
        </div>
        <div className="flex gap-4">
          <NavItem id="library" label="Library" />
          <NavItem id="history" label="History" />
          <NavItem id="drive" label="Drive" />
          <NavItem id="admin" label="Brands" />
          <NavItem id="settings" label="Settings" />
        </div>
        <div className="ml-auto flex items-center gap-4">
          <span className="text-[13px] font-medium text-[var(--apple-gray-5)] hidden sm:block">{user.email}</span>
          <button onClick={handleLogout} className="text-[13px] font-medium text-red-500 hover:text-red-600 transition-colors">
            Sign Out
          </button>
        </div>
      </nav>

      {/* ─────────────────────────────────────────
          MAIN CONTENT AREA
          ───────────────────────────────────────── */}
      <main className="flex-1 overflow-hidden mt-[var(--nav-height)]">
        
        {/* VIEW: LIBRARY */}
        {view === 'library' && (
          <div className="h-full overflow-y-auto px-8 py-12 md:px-16 md:py-16">
            <div className="max-w-6xl mx-auto">
              <header className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
                <div>
                  <h1 className="apple-title-1">Templates</h1>
                  <p className="apple-subtitle">Select a template to generate a quotation, or create a new one.</p>
                </div>
                <button 
                  onClick={() => {
                    setEditingTemplate({
                      id: Date.now().toString(),
                      name: 'New Template',
                      description: '',
                      requiresAttachment: false,
                      subject: '',
                      defaultMake: '',
                      defaultDelivery: '',
                      defaultDiscount: '',
                      defaultGst: '',
                      defaultPayment: '',
                      defaultValidity: '',
                      content: []
                    });
                    setView('builder');
                  }} 
                  className="btn-primary"
                >
                  <Plus size={18} /> New Template
                </button>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map(t => (
                  <LibraryCard 
                    key={t.id} 
                    template={t} 
                    onUse={useTemplate} 
                    onEdit={(t) => { setEditingTemplate(JSON.parse(JSON.stringify(t))); setView('builder'); }} 
                    onDelete={async (id) => {
                      const item = templates.find(temp => temp.id === id);
                      setTemplates(templates.filter(temp => temp.id !== id));
                    }} 
                  />
                ))}
                {templates.length === 0 && (
                  <div className="col-span-full py-20 flex flex-col items-center justify-center border border-dashed border-[var(--apple-gray-3)] rounded-3xl">
                    <Database size={48} className="text-[var(--apple-gray-4)] mb-4" />
                    <p className="text-[17px] font-medium text-[var(--apple-gray-5)]">No templates found.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* VIEW: BUILDER (Template Designer) */}
        {view === 'builder' && (
          <div className="flex h-full overflow-hidden">
            {/* Left Properties Panel */}
            <div className={`${showPreview ? 'w-[450px]' : 'flex-1'} bg-white border-r border-[var(--apple-gray-2)] flex flex-col overflow-y-auto transition-all duration-300`}>
              <div className="p-8 pb-4">
                <div className="flex justify-between items-center mb-8">
                  <button
                    onClick={() => { setEditingTemplate(null); setView('library'); }}
                    className="flex items-center gap-1 text-[13px] font-semibold text-[var(--emerald)] hover:opacity-80"
                  >
                    <ChevronLeft size={16} /> Library
                  </button>
                  <button 
                    onClick={() => setShowPreview(!showPreview)} 
                    className="px-3 py-1.5 border border-[var(--apple-gray-3)] rounded-lg text-[11px] font-semibold text-[var(--apple-gray-6)] hover:bg-[var(--apple-gray-1)] transition-colors"
                  >
                    {showPreview ? 'Hide Canvas' : 'Show Canvas'}
                  </button>
                </div>
                <h2 className="text-[28px] font-bold tracking-tight leading-tight mb-8">Designer</h2>
                
                <div className="space-y-6">
                  <div>
                    <label className="apple-label">Template Name</label>
                    <input
                      type="text"
                      value={editingTemplate?.name || ''}
                      onChange={e => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                      className="apple-input"
                      placeholder="e.g. Standard Implants"
                    />
                  </div>
                  <div>
                    <label className="apple-label">Description</label>
                    <textarea
                      rows="2"
                      value={editingTemplate?.description || ''}
                      onChange={e => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                      className="apple-input"
                      placeholder="Brief description..."
                    />
                  </div>
                  <div>
                    <label className="apple-label">Default Subject</label>
                    <textarea
                      rows="2"
                      value={editingTemplate?.subject || ''}
                      onChange={e => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                      className="apple-input"
                    />
                  </div>
                  
                  <div className="pt-6 border-t border-[var(--apple-gray-2)]">
                    <label className="apple-label mb-4">Default Terms</label>
                    <div className="grid grid-cols-2 gap-4">
                      {['Make', 'Delivery', 'Discount', 'GST', 'Payment', 'Validity'].map(term => {
                        const key = `default${term}`;
                        return (
                          <div key={term}>
                            <span className="text-[11px] font-semibold text-[var(--apple-gray-5)] uppercase block mb-1">{term}</span>
                            <input
                              type="text"
                              value={editingTemplate?.[key] || ''}
                              onChange={e => setEditingTemplate({ ...editingTemplate, [key]: e.target.value })}
                              placeholder={term === 'Validity' ? 'DD/MM/YYYY' : ''}
                              className="apple-input !py-2 !px-3"
                            />
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="pt-6 border-t border-[var(--apple-gray-2)] flex items-center justify-between">
                    <label className="text-[15px] font-medium">Requires Attachment?</label>
                    <button
                      onClick={() => setEditingTemplate({ ...editingTemplate, requiresAttachment: !editingTemplate?.requiresAttachment })}
                      className={`apple-toggle ${editingTemplate?.requiresAttachment ? 'on' : ''}`}
                    />
                  </div>

                  <div className="pt-6 border-t border-[var(--apple-gray-2)]">
                    <label className="apple-label mb-4">Add Section</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setEditingTemplate({ ...editingTemplate, content: [...(editingTemplate?.content || []), { type: 'text', value: '' }] })}
                        className="btn-outline flex-col !gap-2 !py-4"
                      >
                        <Type size={18} />
                        <span className="text-[11px]">TEXT</span>
                      </button>
                      <button
                        onClick={() => setEditingTemplate({ ...editingTemplate, content: [...(editingTemplate?.content || []), { type: 'table', headers: ['S.No', 'Item', 'Qty', 'Rate', 'Amount'], rows: [['1', '', '1', '', '']] }] })}
                        className="btn-outline flex-col !gap-2 !py-4"
                      >
                        <TableIcon size={18} />
                        <span className="text-[11px]">TABLE</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 mt-auto pt-4 bg-white border-t border-[var(--apple-gray-2)] sticky bottom-0">
                <button
                  onClick={() => {
                    if (!editingTemplate) return;
                    const updated = templates.some(t => t.id === editingTemplate.id)
                      ? templates.map(t => t.id === editingTemplate.id ? editingTemplate : t)
                      : [...templates, editingTemplate];
                    setTemplates(updated);
                    setEditingTemplate(null);
                    setView('library');
                  }}
                  className="btn-primary w-full"
                >
                  <Save size={18} /> Save Template
                </button>
              </div>
            </div>

            {/* Right Canvas */}
            {showPreview && (
              <div className="flex-1 bg-[var(--apple-bg)] overflow-y-auto p-12">
                <div className="max-w-3xl mx-auto space-y-8">
                {(editingTemplate?.content || []).length === 0 && (
                  <div className="text-center py-32 opacity-40">
                    <Database size={48} className="mx-auto mb-4" />
                    <p className="font-semibold tracking-tight text-lg">No sections yet</p>
                  </div>
                )}

                {(editingTemplate?.content || []).map((block, idx) => (
                  <div key={idx} className="apple-card p-8 relative group">
                    <button
                      onClick={() => {
                        const nc = [...editingTemplate.content]; nc.splice(idx, 1);
                        setEditingTemplate({ ...editingTemplate, content: nc });
                      }}
                      className="absolute -top-3 -right-3 w-8 h-8 bg-white border border-[var(--apple-gray-2)] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:text-red-500 shadow-sm transition-all"
                    >
                      <Trash2 size={14} />
                    </button>

                    <div className="flex items-center gap-3 mb-6">
                      <span className="badge-gray">SECTION {idx + 1}</span>
                      <span className="text-[13px] font-medium text-[var(--apple-gray-5)]">
                        {block.type === 'text' ? 'Text Block' : 'Table Block'}
                      </span>
                    </div>

                    {block.type === 'text' ? (
                      <textarea
                        value={block.value}
                        onChange={e => {
                          const nc = [...editingTemplate.content]; nc[idx].value = e.target.value;
                          setEditingTemplate({ ...editingTemplate, content: nc });
                        }}
                        className="apple-input min-h-[140px]"
                        placeholder="Type paragraph content..."
                      />
                    ) : (
                      <div className="border border-[var(--apple-gray-2)] rounded-xl overflow-hidden shadow-sm bg-white">
                        <table className="w-full border-collapse">
                          <thead className="bg-[var(--apple-gray-1)] border-b border-[var(--apple-gray-2)]">
                            <tr>
                              {block.headers.map((h, hi) => (
                                <th key={hi} className="p-3 border-r border-[var(--apple-gray-2)] last:border-none relative group">
                                  <input
                                    value={h}
                                    onChange={e => {
                                      const nc = [...editingTemplate.content]; nc[idx].headers[hi] = e.target.value;
                                      setEditingTemplate({ ...editingTemplate, content: nc });
                                    }}
                                    className="w-full bg-transparent outline-none font-semibold text-center text-[11px] uppercase tracking-wider text-[var(--apple-gray-6)]"
                                  />
                                  <button
                                    onClick={() => {
                                      if (block.headers.length <= 1) return;
                                      const nc = [...editingTemplate.content];
                                      nc[idx].headers.splice(hi, 1);
                                      nc[idx].rows.forEach(r => r.splice(hi, 1));
                                      setEditingTemplate({ ...editingTemplate, content: nc });
                                    }}
                                    className="absolute -top-2 -right-2 w-5 h-5 bg-white border border-[var(--apple-gray-2)] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:text-red-500 shadow-sm transition-all z-10"
                                    title="Delete Column"
                                  >
                                    <Trash2 size={10} />
                                  </button>
                                </th>
                              ))}
                              <th className="w-8 bg-[var(--apple-gray-1)]"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {block.rows.map((row, ri) => (
                              <tr key={ri} className="border-b border-[var(--apple-gray-2)] last:border-none hover:bg-[var(--apple-gray-1)] transition-colors">
                                {row.map((cell, ci) => (
                                  <td key={ci} className="p-0 border-r border-[var(--apple-gray-2)] last:border-none">
                                    <input
                                      value={cell}
                                      onChange={e => {
                                        const nc = [...editingTemplate.content]; 
                                        nc[idx].rows[ri][ci] = e.target.value;
                                        
                                        const headers = nc[idx].headers.map(h => h.toLowerCase());
                                        const qtyIdx = headers.findIndex(h => h === 'qty' || h === 'quantity');
                                        const rateIdx = headers.findIndex(h => h === 'rate' || h === 'mrp' || h === 'price');
                                        const amountIdx = headers.findIndex(h => h === 'amount' || h === 'total');
                                        
                                        if (qtyIdx !== -1 && rateIdx !== -1 && amountIdx !== -1 && (ci === qtyIdx || ci === rateIdx)) {
                                            const qty = parseFloat(nc[idx].rows[ri][qtyIdx]) || 0;
                                            const rate = parseFloat(nc[idx].rows[ri][rateIdx]) || 0;
                                            nc[idx].rows[ri][amountIdx] = (qty * rate).toFixed(2).replace(/\.00$/, '');
                                        }

                                        setEditingTemplate({ ...editingTemplate, content: nc });
                                      }}
                                      className="w-full py-2.5 px-3 bg-transparent outline-none text-center text-[13px] hover:bg-black/5 focus:bg-white focus:ring-1 focus:ring-[var(--emerald)] transition-all"
                                    />
                                  </td>
                                ))}
                                <td className="p-0 text-center w-8">
                                  <button
                                    onClick={() => {
                                      const nc = [...editingTemplate.content]; nc[idx].rows.splice(ri, 1);
                                      setEditingTemplate({ ...editingTemplate, content: nc });
                                    }}
                                    className="w-full h-full flex items-center justify-center text-[var(--apple-gray-4)] hover:text-red-500 hover:bg-red-50 py-2.5 transition-colors"
                                    title="Delete Row"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="flex border-t border-[var(--apple-gray-2)]">
                          <button
                            onClick={() => {
                              const nc = [...editingTemplate.content]; nc[idx].rows.push(Array(block.headers.length).fill(''));
                              setEditingTemplate({ ...editingTemplate, content: nc });
                            }}
                            className="flex-1 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--emerald)] hover:bg-[var(--emerald-light)] transition-colors border-r border-[var(--apple-gray-2)]"
                          >
                            + Add Row
                          </button>
                          <button
                            onClick={() => {
                              const nc = [...editingTemplate.content]; 
                              nc[idx].headers.push('NEW COL');
                              nc[idx].rows.forEach(row => row.push(''));
                              setEditingTemplate({ ...editingTemplate, content: nc });
                            }}
                            className="flex-1 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--coral)] hover:bg-red-50 transition-colors"
                          >
                            + Add Col
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            )}
          </div>
        )}

        {/* VIEW: DRAFTING */}
        {view === 'drafting' && (
          <div className="flex h-full overflow-hidden">
            {/* Left Input Form */}
            <div className={`${showPreview ? 'w-[450px]' : 'flex-1'} bg-white border-r border-[var(--apple-gray-2)] flex flex-col overflow-y-auto transition-all duration-300`}>
              <div className="p-8 pb-4">
                <div className="flex justify-between items-center mb-8">
                  <button
                    onClick={() => setView('library')}
                    className="flex items-center gap-1 text-[13px] font-semibold text-[var(--emerald)] hover:opacity-80"
                  >
                    <ChevronLeft size={16} /> Library
                  </button>
                  <button 
                    onClick={() => setShowPreview(!showPreview)} 
                    className="px-3 py-1.5 border border-[var(--apple-gray-3)] rounded-lg text-[11px] font-semibold text-[var(--apple-gray-6)] hover:bg-[var(--apple-gray-1)] transition-colors"
                  >
                    {showPreview ? 'Hide Preview' : 'Show Preview'}
                  </button>
                </div>
                <h2 className="text-[28px] font-bold tracking-tight leading-tight mb-8">Draft Quotation</h2>

                <div className="space-y-6">
                  {/* Hospital Details */}
                  <div className="space-y-4">
                    <h3 className="apple-label border-b border-[var(--apple-gray-2)] pb-2">Client Details</h3>
                    <div>
                      <input name="hospitalName" value={formData.hospitalName} onChange={handleInputChange} className="apple-input" placeholder="Hospital Name" />
                    </div>
                    <div>
                      <textarea name="address" value={formData.address} onChange={handleInputChange} rows="2" className="apple-input" placeholder="Full Address" />
                    </div>
                  </div>

                  {/* Document Details */}
                  <div className="space-y-4 pt-4">
                    <h3 className="apple-label border-b border-[var(--apple-gray-2)] pb-2">Document Info</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[11px] font-semibold text-[var(--apple-gray-5)] uppercase block mb-1">Date</span>
                        <input type="text" name="date" value={formData.date} onChange={handleInputChange} placeholder="DD/MM/YYYY" className="apple-input !px-3" />
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold text-[var(--apple-gray-5)] uppercase block mb-1">Ref No.</span>
                        <input type="text" name="referenceNumber" value={formData.referenceNumber} onChange={handleInputChange} className="apple-input !px-3" />
                      </div>
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-[var(--apple-gray-5)] uppercase block mb-1">Subject</span>
                      <textarea name="subject" value={formData.subject} onChange={handleInputChange} rows="2" className="apple-input" />
                    </div>
                  </div>

                  {/* Template Editor */}
                  <div className="space-y-4 pt-4">
                    <h3 className="apple-label border-b border-[var(--apple-gray-2)] pb-2">Content Blocks</h3>
                    {draftContent.map((block, idx) => (
                      <div key={idx} className="bg-[var(--apple-gray-1)] p-4 rounded-xl border border-[var(--apple-gray-2)]">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="w-5 h-5 rounded flex items-center justify-center bg-[var(--coral)] text-white text-[10px] font-bold">{idx + 1}</span>
                          <span className="text-[11px] font-bold text-[var(--apple-gray-5)] uppercase tracking-wider">
                            {block.type === 'text' ? 'Text' : 'Table'}
                          </span>
                        </div>
                        {block.type === 'text' ? (
                          <textarea
                            value={block.value}
                            onChange={e => {
                              const nc = [...draftContent]; nc[idx].value = e.target.value;
                              setDraftContent(nc);
                            }}
                            className="apple-input !bg-white !p-3 text-[13px]"
                            rows={3}
                          />
                        ) : (
                          <div className="overflow-x-auto rounded-xl border border-[var(--apple-gray-2)] bg-white shadow-sm mt-2">
                            <table className="w-full border-collapse">
                              <thead className="bg-[var(--apple-gray-1)] border-b border-[var(--apple-gray-2)]">
                                <tr>
                                  {block.headers.map((h, hi) => (
                                    <th key={hi} className="p-3 border-r border-[var(--apple-gray-2)] last:border-none relative group">
                                      <input 
                                        value={h}
                                        onChange={e => {
                                          const nc = [...draftContent]; nc[idx].headers[hi] = e.target.value;
                                          setDraftContent(nc);
                                        }}
                                        className="w-full bg-transparent outline-none uppercase font-bold text-[var(--apple-gray-6)] text-center text-[11px] tracking-wider"
                                        placeholder={`Col ${hi + 1}`}
                                      />
                                      <button
                                        onClick={() => {
                                          if(block.headers.length <= 1) return;
                                          const nc = [...draftContent];
                                          nc[idx].headers.splice(hi, 1);
                                          nc[idx].rows.forEach(r => r.splice(hi, 1));
                                          setDraftContent(nc);
                                        }}
                                        className="absolute -top-2 -right-2 w-5 h-5 bg-white border border-[var(--apple-gray-2)] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:text-red-500 shadow-sm transition-all z-10"
                                        title="Delete Column"
                                      >
                                        <Trash2 size={10} />
                                      </button>
                                    </th>
                                  ))}
                                  <th className="w-8 bg-[var(--apple-gray-1)]"></th>
                                </tr>
                              </thead>
                              <tbody>
                                {block.rows.map((row, ri) => (
                                  <tr key={ri} className="border-b border-[var(--apple-gray-2)] last:border-none hover:bg-[var(--apple-gray-1)] transition-colors">
                                    {row.map((cell, ci) => (
                                      <td key={ci} className="p-0 border-r border-[var(--apple-gray-2)] last:border-none">
                                        <input
                                          value={cell}
                                          onChange={e => {
                                            const nc = [...draftContent]; 
                                            nc[idx].rows[ri][ci] = e.target.value;
                                            
                                            const headers = nc[idx].headers.map(h => h.toLowerCase());
                                            const qtyIdx = headers.findIndex(h => h === 'qty' || h === 'quantity');
                                            const rateIdx = headers.findIndex(h => h === 'rate' || h === 'mrp' || h === 'price');
                                            const amountIdx = headers.findIndex(h => h === 'amount' || h === 'total');
                                            
                                            if (qtyIdx !== -1 && rateIdx !== -1 && amountIdx !== -1 && (ci === qtyIdx || ci === rateIdx)) {
                                                const qty = parseFloat(nc[idx].rows[ri][qtyIdx]) || 0;
                                                const rate = parseFloat(nc[idx].rows[ri][rateIdx]) || 0;
                                                nc[idx].rows[ri][amountIdx] = (qty * rate).toFixed(2).replace(/\.00$/, '');
                                            }

                                            setDraftContent(nc);
                                          }}
                                          className="w-full py-2.5 px-3 bg-transparent outline-none text-center text-[13px] hover:bg-black/5 focus:bg-white focus:ring-1 focus:ring-[var(--emerald)] transition-all"
                                        />
                                      </td>
                                    ))}
                                    <td className="p-0 text-center w-8">
                                      <button
                                        onClick={() => {
                                          const nc = [...draftContent]; nc[idx].rows.splice(ri, 1);
                                          setDraftContent(nc);
                                        }}
                                        className="w-full h-full flex items-center justify-center text-[var(--apple-gray-4)] hover:text-red-500 hover:bg-red-50 py-2.5 transition-colors"
                                        title="Delete Row"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            <div className="flex border-t border-[var(--apple-gray-2)]">
                              <button
                                onClick={() => {
                                  const nc = [...draftContent]; nc[idx].rows.push(Array(block.headers.length).fill(''));
                                  setDraftContent(nc);
                                }}
                                className="flex-1 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--emerald)] hover:bg-[var(--emerald-light)] transition-colors border-r border-[var(--apple-gray-2)]"
                              >
                                + Add Row
                              </button>
                              <button
                                onClick={() => {
                                  const nc = [...draftContent]; 
                                  nc[idx].headers.push('New Col');
                                  nc[idx].rows.forEach(row => row.push(''));
                                  setDraftContent(nc);
                                }}
                                className="flex-1 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--coral)] hover:bg-red-50 transition-colors"
                              >
                                + Add Column
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Terms */}
                  <div className="space-y-4 pt-4">
                    <h3 className="apple-label border-b border-[var(--apple-gray-2)] pb-2">Terms & Conditions</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {['make', 'delivery', 'discount', 'gst', 'payment', 'validity'].map(term => (
                        <div key={term}>
                          <span className="text-[11px] font-semibold text-[var(--apple-gray-5)] uppercase block mb-1">{term}</span>
                          <input 
                            type="text"
                            name={term} 
                            value={formData[term]} 
                            onChange={handleInputChange} 
                            placeholder={term === 'validity' ? 'DD/MM/YYYY' : ''}
                            className="apple-input !px-3" 
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Brand Attachment */}
                  {draftRequiresAttachment && (
                    <div className="space-y-4 pt-4">
                      <h3 className="apple-label border-b border-[var(--apple-gray-2)] pb-2">Brand PDF Attachment</h3>
                      <select 
                        name="attachmentLabel" 
                        value={formData.attachmentLabel || ''} 
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            attachmentLabel: val,
                            make: prev.make === '' || prev.make === prev.attachmentLabel ? val : prev.make
                          }));
                        }} 
                        className="apple-input cursor-pointer"
                      >
                        <option value="">-- Select Brand --</option>
                        {attachments.map(att => (
                          <option key={att.id} value={att.label}>{att.label}</option>
                        ))}
                      </select>
                    </div>
                  )}

                </div>
              </div>

              <div className="p-8 mt-auto pt-4 bg-white border-t border-[var(--apple-gray-2)] sticky bottom-0">
                <button onClick={generatePDF} disabled={isGenerating} className="btn-primary w-full">
                  {isGenerating ? 'Processing...' : <><Download size={18} /> Generate PDF</>}
                </button>
              </div>
            </div>

            {/* Right Live Preview Area */}
            {showPreview && (
              <div className="flex-1 bg-[var(--apple-gray-2)] overflow-y-auto p-12">
                <div className="flex flex-col items-center gap-8">
                  <div className="scale-[0.85] origin-top">
                    <QuotationTemplate id="quotation-template" data={formData} content={draftContent} company={companyData} />
                  </div>
                  {/* Attached Brand PDF Preview */}
                  {(() => {
                    const attachmentRef = formData.attachmentLabel || formData.make;
                    const selectedAtt = draftRequiresAttachment ? attachments.find(a => a.label === attachmentRef) : null;
                    if (!selectedAtt || !selectedAtt.data) return null;
                    return (
                      <div className="w-full flex flex-col items-center" style={{ marginTop: '-80px' }}>
                        <div className="flex items-center gap-2 mb-4">
                          <span className="badge-gray">ATTACHMENT</span>
                          <span className="text-[13px] font-medium text-[var(--apple-gray-5)]">{selectedAtt.label} — {selectedAtt.fileName}</span>
                        </div>
                        <embed 
                          src={selectedAtt.data + '#toolbar=0&navpanes=0'} 
                          type="application/pdf" 
                          style={{ width: '178.5mm', height: '252.45mm', border: 'none', borderRadius: '4px', boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }}
                        />
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW: HISTORY */}
        {view === 'history' && (
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

              {(() => {
                const filtered = quotationHistory.filter(item => 
                  item.hospital.toLowerCase().includes(searchQuery.toLowerCase()) || 
                  item.ref.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  item.templateName.toLowerCase().includes(searchQuery.toLowerCase())
                );
                if (filtered.length === 0) return (
                  <div className="text-center py-20 opacity-40">
                    <LayoutDashboard size={48} className="mx-auto mb-4" />
                    <p className="font-semibold text-lg">No history matches found</p>
                  </div>
                );
                return (
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
                        {filtered.map((item) => (
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
                );
              })()}
            </div>
          </div>
        )}

        {/* VIEW: ADMIN (Attachments) */}
        {view === 'admin' && (
          <div className="h-full overflow-y-auto px-8 py-12 md:px-16 md:py-16">
            <div className="max-w-3xl mx-auto">
              <h1 className="apple-title-1 mb-2">Brands</h1>
              <p className="apple-subtitle mb-12">Manage manufacturer PDF price lists to append to quotations.</p>

              <div className="apple-card p-12 text-center mb-12">
                <div className="w-16 h-16 bg-[var(--apple-gray-1)] text-[var(--apple-black)] rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <UploadCloud size={32} />
                </div>
                <h2 className="text-[24px] font-semibold tracking-tight mb-2">Upload Price List</h2>
                <p className="text-[15px] text-[var(--apple-gray-5)] mb-8">Select a PDF to map to a brand name.</p>
                
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
                        onClick={() => {
                          const att = attachments.find(a => a.id === att.id);
                          setAttachments(attachments.filter(a => a.id !== att.id));
                          if (att) syncItem('attachments', att, true);
                        }} 
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
        )}

        {/* VIEW: DRIVE */}
        {view === 'drive' && (
          <div className="h-full overflow-y-auto px-8 py-12 md:px-16 md:py-16">
            <div className="max-w-4xl mx-auto">
              <header className="mb-12">
                <h1 className="apple-title-1 mb-2">Drive</h1>
                <p className="apple-subtitle">Manage your business documents and vendor files.</p>
              </header>

              {/* ── SRR DRIVE (HIGHLIGHTED) ── */}
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
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={async (e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        const label = prompt('Enter document name (e.g. GST Certificate):');
                        if (!label) return;
                        
                        setIsGenerating(true);
                        try {
                          const storageRef = ref(storage, `drive/srr/${Date.now()}_${file.name}`);
                          const snapshot = await uploadBytes(storageRef, file);
                          const url = await getDownloadURL(snapshot.ref);
                          
                          setDriveFiles(prev => ({ 
                            ...prev, 
                            srr: [...(prev.srr || []), { 
                              id: Date.now().toString(), 
                              label, 
                              data: url, 
                              fileName: file.name, 
                              type: file.type, 
                              uploadedAt: new Date().toLocaleDateString('en-GB') 
                            }] 
                          }));
                        } catch (err) {
                          console.error("Upload failed:", err);
                        } finally {
                          setIsGenerating(false);
                        }
                        e.target.value = '';
                      }} className="hidden" id="srr-drive-upload" />
                      <label htmlFor="srr-drive-upload" className="btn-primary cursor-pointer !bg-[var(--emerald)] !text-[13px] !py-2 !px-4">
                        <Plus size={16} /> Upload
                      </label>
                    </div>
                  </div>
                </div>

                {(driveFiles.srr || []).length === 0 ? (
                  <div className="text-center py-10 border-2 border-dashed border-emerald-200 rounded-xl bg-emerald-50/20">
                    <p className="text-[14px] text-[var(--apple-gray-4)]">No certificates uploaded yet</p>
                  </div>
                ) : (
                  <div className="apple-card overflow-hidden border-2 border-emerald-100">
                    {(driveFiles.srr || []).map((file, idx) => (
                      <div key={file.id} className="flex items-center justify-between px-5 py-3.5 border-b border-emerald-100 last:border-0 hover:bg-emerald-50/40 transition-colors">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <FileCheck size={18} className="text-[var(--emerald)] flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[14px] font-semibold text-[var(--apple-black)] truncate">{file.label}</p>
                            <p className="text-[11px] text-[var(--apple-gray-4)]">{file.fileName} • {file.uploadedAt}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-3">
                          <a href={file.data} download={file.fileName} className="w-8 h-8 flex items-center justify-center text-[var(--apple-gray-4)] hover:text-[var(--emerald)] rounded-lg transition-colors" title="Download">
                            <Download size={15} />
                          </a>
                          <button onClick={() => confirmDelete(async () => {
                            setDriveFiles(prev => ({ ...prev, srr: prev.srr.filter(f => f.id !== file.id) }));
                            await syncItem('drive_srr', file, true);
                          })} className="w-8 h-8 flex items-center justify-center text-[var(--apple-gray-4)] hover:text-red-500 rounded-lg transition-colors" title="Delete">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── VENDOR DOCUMENTS (FOLDER BASED) ── */}
              <div>
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[var(--apple-gray-1)] rounded-xl flex items-center justify-center">
                      <FolderOpen size={20} className="text-[var(--apple-gray-6)]" />
                    </div>
                    <div>
                      <h2 className="text-[20px] font-bold tracking-tight">Vendor Documents</h2>
                      <p className="text-[13px] text-[var(--apple-gray-5)]">{(driveFiles.vendor || []).length} vendors</p>
                    </div>
                  </div>
                  {!openVendorFolder && (
                    <button onClick={() => {
                      const name = prompt('Enter vendor/folder name:');
                      if (!name) return;
                      const newFolder = { id: Date.now().toString(), name, createdAt: new Date().toLocaleDateString('en-GB'), files: [] };
                      setDriveFiles(prev => ({ ...prev, vendor: [...(prev.vendor || []), newFolder] }));
                      await syncItem('drive_folders', newFolder);
                    }} className="btn-outline !text-[13px] !py-2 !px-4">
                      <Plus size={16} /> New Folder
                    </button>
                  )}
                </div>

                {!openVendorFolder ? (
                  /* ── FOLDER GRID ── */
                  (driveFiles.vendor || []).length === 0 ? (
                    <div className="text-center py-10 border border-dashed border-[var(--apple-gray-3)] rounded-xl">
                      <p className="text-[14px] text-[var(--apple-gray-4)]">No vendor folders yet. Create one to get started.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {(driveFiles.vendor || []).map(folder => (
                        <div key={folder.id} className="apple-card p-5 cursor-pointer hover:border-[var(--apple-gray-4)] transition-all group" onClick={() => setOpenVendorFolder(folder.id)}>
                          <div className="flex flex-col items-center text-center">
                            <Folder size={44} className="text-amber-400 mb-3 group-hover:scale-110 transition-transform" fill="currentColor" />
                            <p className="text-[14px] font-semibold text-[var(--apple-black)] truncate w-full">{folder.name}</p>
                            <p className="text-[11px] text-[var(--apple-gray-4)] mt-1">{(folder.files || []).length} files</p>
                          </div>
                          <div className="flex items-center justify-center gap-1 mt-3 pt-3 border-t border-[var(--apple-gray-2)]">
                            <button onClick={(e) => { e.stopPropagation(); downloadFolderAsZip(folder); }} className="w-8 h-8 flex items-center justify-center text-[var(--apple-gray-4)] hover:text-[var(--apple-black)] rounded-lg transition-colors" title="Download folder as ZIP">
                              <Download size={14} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); confirmDelete(async () => {
                              setDriveFiles(prev => ({ ...prev, vendor: prev.vendor.filter(f => f.id !== folder.id) }));
                              await syncItem('drive_folders', folder, true);
                            }); }} className="w-8 h-8 flex items-center justify-center text-[var(--apple-gray-4)] hover:text-red-500 rounded-lg transition-colors" title="Delete folder">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  /* ── INSIDE A FOLDER ── */
                  (() => {
                    const folder = (driveFiles.vendor || []).find(f => f.id === openVendorFolder);
                    if (!folder) { setOpenVendorFolder(null); return null; }
                    return (
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <button onClick={() => setOpenVendorFolder(null)} className="flex items-center gap-1 text-[13px] font-semibold text-[var(--emerald)] hover:opacity-80">
                            <ChevronLeft size={16} /> Back to folders
                          </button>
                          <div className="flex items-center gap-2">
                            <button onClick={() => downloadFolderAsZip(folder)} className="btn-outline !text-[12px] !py-1.5 !px-3">
                              <Download size={14} /> Download All
                            </button>
                            <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={(e) => {
                              const file = e.target.files[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = async (ev) => {
                                const newFile = { 
                                  id: Date.now().toString(), 
                                  folderId: folder.id,
                                  label: file.name, 
                                  data: ev.target.result, 
                                  fileName: file.name, 
                                  type: file.type, 
                                  uploadedAt: new Date().toLocaleDateString('en-GB') 
                                };
                                setDriveFiles(prev => ({ 
                                  ...prev, 
                                  vendor: prev.vendor.map(f => f.id === folder.id ? { ...f, files: [...(f.files || []), newFile] } : f) 
                                }));
                                await syncItem('drive_vendor_files', newFile);
                              };
                              reader.readAsDataURL(file);
                              e.target.value = '';
                            }} className="hidden" id="vendor-folder-upload" />
                            <label htmlFor="vendor-folder-upload" className="btn-primary cursor-pointer !text-[12px] !py-1.5 !px-3">
                              <Plus size={14} /> Add File
                            </label>
                          </div>
                        </div>

                        <div className="apple-card p-5 mb-4 flex items-center gap-3 bg-amber-50/50 border-amber-200">
                          <Folder size={28} className="text-amber-400" fill="currentColor" />
                          <div>
                            <p className="text-[17px] font-bold">{folder.name}</p>
                            <p className="text-[12px] text-[var(--apple-gray-5)]">{(folder.files || []).length} files • Created {folder.createdAt}</p>
                          </div>
                        </div>

                        {(folder.files || []).length === 0 ? (
                          <div className="text-center py-10 border border-dashed border-[var(--apple-gray-3)] rounded-xl">
                            <p className="text-[14px] text-[var(--apple-gray-4)]">This folder is empty. Add files above.</p>
                          </div>
                        ) : (
                          <div className="apple-card overflow-hidden">
                            {(folder.files || []).map(file => (
                              <div key={file.id} className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--apple-gray-2)] last:border-0 hover:bg-[var(--apple-gray-1)] transition-colors">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  <FileText size={18} className="text-[var(--apple-gray-5)] flex-shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-[14px] font-semibold text-[var(--apple-black)] truncate">{file.fileName}</p>
                                    <p className="text-[11px] text-[var(--apple-gray-4)]">{file.uploadedAt}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 ml-3">
                                  <a href={file.data} download={file.fileName} className="w-8 h-8 flex items-center justify-center text-[var(--apple-gray-4)] hover:text-[var(--apple-black)] rounded-lg transition-colors" title="Download">
                                    <Download size={15} />
                                  </a>
                                  <button onClick={() => confirmDelete(async () => {
                                    setDriveFiles(prev => ({ ...prev, vendor: prev.vendor.map(f => f.id === folder.id ? { ...f, files: f.files.filter(fi => fi.id !== file.id) } : f) }));
                                    await syncItem('drive_vendor_files', file, true);
                                  })} className="w-8 h-8 flex items-center justify-center text-[var(--apple-gray-4)] hover:text-red-500 rounded-lg transition-colors" title="Delete">
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()
                )}
              </div>
            </div>
          </div>
        )}

        {/* VIEW: SETTINGS */}
        {view === 'settings' && (
          <div className="h-full overflow-y-auto px-8 py-12 md:px-16 md:py-16">
            <div className="max-w-2xl mx-auto">
              <h1 className="apple-title-1 mb-2">Settings</h1>
              <p className="apple-subtitle mb-12">Manage company details for the quotation header.</p>

              <div className="apple-card p-8 space-y-6">
                <div>
                  <label className="apple-label">Business Name</label>
                  <input type="text" value={companyData.name} onChange={(e) => setCompanyData({...companyData, name: e.target.value})} className="apple-input" />
                </div>
                <div>
                  <label className="apple-label">Full Address</label>
                  <textarea value={companyData.address} onChange={(e) => setCompanyData({...companyData, address: e.target.value})} rows="3" className="apple-input" />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="apple-label">Phone Numbers</label>
                    <input type="text" value={companyData.phone} onChange={(e) => setCompanyData({...companyData, phone: e.target.value})} className="apple-input" />
                  </div>
                  <div>
                    <label className="apple-label">Email Address</label>
                    <input type="text" value={companyData.email} onChange={(e) => setCompanyData({...companyData, email: e.target.value})} className="apple-input" />
                  </div>
                </div>
                <div>
                  <label className="apple-label">Website</label>
                  <input type="text" value={companyData.website} onChange={(e) => setCompanyData({...companyData, website: e.target.value})} className="apple-input" />
                </div>
                
                <div className="pt-6 border-t border-[var(--apple-gray-2)]">
                  <button onClick={() => setView('library')} className="btn-primary w-full">Save Changes</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* HIDDEN REGENERATION TEMPLATE */}
      {regeneratingItem && (
        <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
          <QuotationTemplate id="history-quotation-template" data={regeneratingItem.formData} content={regeneratingItem.draftContent} company={companyData} />
        </div>
      )}
    </div>
  );
}

export default App;
