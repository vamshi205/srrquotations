import React, { useState, useEffect, useRef } from 'react';
import QuotationTemplate from './components/QuotationTemplate';
import LibraryCard from './components/LibraryCard';
import jsPDF from 'jspdf';
import { toJpeg } from 'html-to-image';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import Login from './components/Login';
import { saveDatabase, loadDatabase, saveTemplate, deleteTemplate, saveHistoryItem, saveCompanyData } from './utils/databaseService';
import { auth, db, storage, hasFirebaseConfig } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { ref, getBlob } from 'firebase/storage';
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc, query, orderBy, writeBatch } from 'firebase/firestore';
import { validateFile } from './utils/fileValidation';
import { uploadFile, deleteFile, saveFileMetadata, deleteFileMetadata } from './utils/storageService';
import EmailerView from './components/EmailerView';
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

  FileUp,
  Save,
  Search,
  Share2,
  HardDrive,
  FolderOpen,
  Folder,
  Award,
  FileCheck,
  Mail,
  CheckSquare
} from 'lucide-react';

function App() {
  const [view, setView] = useState('library');
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [syncStatus, setSyncStatus] = useState('saved');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState(null);
  const [pdfCache, setPdfCache] = useState({}); // Legacy, will use Ref for speed
  const pdfCacheRef = useRef({}); // { fileId/url: Uint8Array }

  useEffect(() => {
    if (!hasFirebaseConfig) {
      setIsAuthLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        await refreshData(currentUser);
      } else {
        setUser(currentUser);
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const refreshData = async (currentUser = user) => {
    if (!currentUser) return;
    setSyncStatus('syncing');
    try {
      const data = await loadDatabase();
      if (data) {
        if (data.companyData) setCompanyData(data.companyData);
        
        // 1. Templates: Always trust the backend.
        if (data.templates && data.templates.length > 0) {
          setTemplates(data.templates);
        } else if (currentUser) {
          // If Firestore is empty, seed it with a professional default template
          const defaultTemplate = {
            id: 'default-' + Date.now(),
            name: 'Standard Implants',
            description: 'Standard quotation for surgical implants.',
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
          };
          console.log("Seeding Firestore with default template...");
          await saveTemplate(defaultTemplate);
          setTemplates([defaultTemplate]);
        }

        if (data.history) setQuotationHistory(data.history);
        if (data.driveFiles) setDriveFiles(data.driveFiles);
        if (data.priceLists) setPriceLists(data.priceLists);
      }
      setSyncStatus('saved');
    } catch (e) {
      console.error("Refresh error:", e);
      setSyncStatus('error');
    }
  };

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

  const getFileData = async (dataOrUrl, storagePath = null) => {
    if (!dataOrUrl) return null;
    
    // 1. Try to determine the best storage path
    let bestPath = storagePath;
    
    // If path looks like just a filename (no slash), try to extract it from the URL
    if (typeof dataOrUrl === 'string' && dataOrUrl.includes('firebasestorage') && (!bestPath || !bestPath.includes('/'))) {
      try {
        // Extract the part between /o/ and ?
        const match = dataOrUrl.match(/\/o\/([^?]+)/);
        if (match && match[1]) {
          bestPath = decodeURIComponent(match[1]);
        }
      } catch (e) {
        console.warn("Could not parse storage path from URL:", e);
      }
    }

    const cacheKey = bestPath || dataOrUrl;
    
    // 2. Check cache first
    if (pdfCacheRef.current[cacheKey]) {
      return pdfCacheRef.current[cacheKey];
    }
    
    try {
      // 3. If we have a storage path, use the SDK (Best for CORS)
      if (bestPath) {
        const fileRef = ref(storage, bestPath);
        const blob = await getBlob(fileRef);
        const arrayBuffer = await blob.arrayBuffer();
        const binary = new Uint8Array(arrayBuffer);
        pdfCacheRef.current[cacheKey] = binary;
        return binary;
      }

      // 4. Fallback for direct URLs
      if (typeof dataOrUrl === 'string' && dataOrUrl.startsWith('http')) {
        const response = await fetch(dataOrUrl);
        if (!response.ok) throw new Error('Network response was not ok');
        const arrayBuffer = await response.arrayBuffer();
        const binary = new Uint8Array(arrayBuffer);
        pdfCacheRef.current[cacheKey] = binary;
        return binary;
      }
      return dataOrUrl;
    } catch (err) {
      if (err.name === 'FirebaseError' && err.code === 'storage/unauthorized') {
        console.error('CORS/Security Block: Please run the gsutil command in the CORS_FIX_GUIDE.md file to enable file downloads.');
      } else {
        console.error('File retrieval error:', err);
      }
      // Final fallback: just return the URL if fetch/SDK both failed (might work in some contexts)
      return dataOrUrl;
    }
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
    selectedTemplateId: ''
  });

  const [draftContent, setDraftContent] = useState([]);
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

  const [priceLists, setPriceLists] = useState(() => {
    const saved = localStorage.getItem('srr_price_lists');
    const parsed = saved ? JSON.parse(saved) : [];
    // CRITICAL: Filter out any legacy Google Drive links or truncated data
    return parsed.filter(a => a.data && a.data.startsWith('http') && !a.data.includes('drive.google.com') && !a.data.includes('googleusercontent'));
  });



  const [templates, setTemplates] = useState([]);

  const [quotationHistory, setQuotationHistory] = useState(() => {
    const saved = localStorage.getItem('srr_history');
    return saved ? JSON.parse(saved) : [];
  });

  const [driveFiles, setDriveFiles] = useState(() => {
    const saved = localStorage.getItem('srr_drive');
    const parsed = saved ? JSON.parse(saved) : { srr: [], vendor: [] };
    // Only filter out legacy TRUNCATED data, keep firebasestorage URLs
    // CRITICAL: Filter out legacy Google Drive links
    const srr = (parsed.srr || []).filter(f => f.data && f.data.startsWith('http') && !f.data.includes('drive.google.com'));
    // Filter Vendor files
    const vendor = (parsed.vendor || []).map(folder => ({
      ...folder,
      files: (folder.files || []).filter(f => f.data && f.data.startsWith('http') && !f.data.includes('drive.google.com'))
    }));
    return { srr, vendor };
  });

  // Background Pre-fetching for Speed
  useEffect(() => {
    const prefetch = async () => {
      const allFiles = [
        ...priceLists,
        ...(driveFiles.srr || []),
        ...((driveFiles.vendor || []).flatMap(f => f.files || []))
      ];
      
      for (const file of allFiles) {
        if (file.data && file.data.startsWith('http')) {
          const cacheKey = file.storagePath || file.data;
          if (!pdfCacheRef.current[cacheKey]) {
            // Fetch silently in background
            getFileData(file.data, file.storagePath);
          }
        }
      }
    };
    if (user) prefetch();
  }, [priceLists, driveFiles, user]);

  // Set initial ref number from history
  const refInitialized = React.useRef(false);
  useEffect(() => {
    if (!refInitialized.current && quotationHistory !== undefined) {
      refInitialized.current = true;
      setFormData(prev => ({ ...prev, referenceNumber: prev.referenceNumber || getNextRefNumber(quotationHistory) }));
    }
  }, [quotationHistory]);

  const syncItem = async (colName, item, isDelete = false, fileObject = null, onProgress = null) => {
    if (!user) return false;
    setSyncStatus('syncing');
    if (fileObject && !isDelete) {
      setIsUploading(true);
      setUploadProgress(0);
    }
    try {
      if (fileObject && !isDelete) {
        const validation = validateFile(fileObject);
        if (!validation.isValid) throw new Error(validation.error);

        const result = await uploadFile(fileObject, colName, (p) => {
          setUploadProgress(p);
          if (onProgress) onProgress(p);
        });

        if (!result || !result.success) {
          throw new Error("Failed to upload to Firebase Storage");
        }

        item.data = result.url || '';
        item.fileId = result.fileId || '';
        item.storagePath = result.path || '';
      }

      if (isDelete && (item.storagePath || item.fileId)) {
        try {
          await deleteFile(item.storagePath || item.fileId);
        } catch (e) {
          console.warn('Firebase Storage deletion failed:', e);
        }
      }

      // Save metadata to Firestore
      // Standardize collection names to match databaseService.js
      let collectionName = colName;
      if (colName === 'drive_srr' || colName === 'drive_vendor_files') {
        collectionName = 'driveFiles';
      } else if (colName === 'price_lists') {
        collectionName = 'priceLists';
      } else if (colName === 'drive_folders') {
        collectionName = 'driveFolders';
      }
      
      if (isDelete) {
        await deleteFileMetadata(collectionName, item.id);
      } else {
        // Prepare item for Firestore (ensure no binary data)
        const metadata = { ...item, type: colName };
        await saveFileMetadata(collectionName, metadata);
      }
      
      setSyncStatus('saved');
      if (fileObject && !isDelete) {
        setTimeout(() => setIsUploading(false), 800);
      }
      return true;
    } catch (err) {
      console.error(`Sync error:`, err);
      setSyncStatus('error');
      setIsUploading(false);
      alert(`Sync failed: ${err.message || 'Check your internet connection.'}`);
      return false;
    }
  };

  const [isGenerating, setIsGenerating] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [regeneratingItem, setRegeneratingItem] = useState(null);
  const [openVendorFolder, setOpenVendorFolder] = useState(null);
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const [emailForm, setEmailForm] = useState({
    to: '',
    subject: '',
    body: '',
    selectedDriveFiles: [] // Array of file objects
  });
  const [isSendingEmail, setIsSendingEmail] = useState(false);

    const handleGlobalSendEmail = async () => {
      if (!emailForm.to) return alert('Please enter recipient email.');
      setIsSendingEmail(true);
      const webhookUrl = import.meta.env.VITE_EMAIL_WEBHOOK_URL || import.meta.env.VITE_GMAIL_SCRIPT_URL;

      const filesToAttach = (emailForm.selectedDriveFiles || []).map(f => ({
        fileName: f.fileName || f.label || 'Document.pdf',
        url: f.data
      }));

      const payload = {
        to: emailForm.to,
        subject: emailForm.subject,
        body: emailForm.body,
        files: filesToAttach
      };

      try {
        if (!webhookUrl) throw new Error("Automated email service is not configured.");
        
        await fetch(webhookUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        alert('Email request processed. Your Gmail account is sending the message with all attachments. Please check your "Sent" folder in a few moments.');
        setShowEmailComposer(false);
      } catch (err) {
        console.error('Email error:', err);
        alert(`Failed to send email: ${err.message || 'Check your internet connection.'}`);
      } finally {
        setIsSendingEmail(false);
      }
    };

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

  const getSignature = () => {
    return `\n\nRegards\nA.Satyanarayana\nSri Raja Rajeshwari Ortho Plus\nMobile: 9396857455, 9397857455\nWeb: www.srrorthoplus.com`;
  };

  const updateEmailBody = (templateId, selectedFiles = []) => {
    const template = templates.find(t => t.id === templateId);
    const templateName = template?.name || 'Quotation';

    let baseMessage = `Dear Sir/Madam,\n\nPlease find the attached Quotation for ${templateName} for your kind reference.`;

    if (selectedFiles.length > 0) {
      const srrFiles = selectedFiles.filter(f => !f.folderId);
      const vendorFiles = selectedFiles.filter(f => f.folderId);

      baseMessage += `\n\nI have also attached the requested documents:`;

      if (srrFiles.length > 0) {
        baseMessage += `\n\nSRR Certificates:\n` + srrFiles.map((f, i) => `${i + 1}. ${f.label || f.fileName}`).join('\n');
      }

      if (vendorFiles.length > 0) {
        baseMessage += `\n\nManufacturer Certificates:\n` + vendorFiles.map((f, i) => `${i + 1}. ${f.label || f.fileName}`).join('\n');
      }
    }

    baseMessage += `\n\nWe look forward to your positive response.`;

    setEmailForm(prev => ({
      ...prev,
      body: baseMessage + getSignature()
    }));
  };

  useEffect(() => {
    if (showEmailComposer) {
      setEmailForm(prev => ({
        ...prev,
        subject: formData.subject,
        to: prev.to || ''
      }));
      updateEmailBody(formData.selectedTemplateId, emailForm.selectedDriveFiles);
    }
  }, [showEmailComposer, formData.selectedTemplateId]);

  useEffect(() => {
    if (showEmailComposer) {
      updateEmailBody(formData.selectedTemplateId, emailForm.selectedDriveFiles);
    }
  }, [emailForm.selectedDriveFiles]);

  // Preview PDF for Price List
  useEffect(() => {
    if (!formData.priceListId) {
      setPreviewPdfUrl(null);
      return;
    }
    const fetchPreview = async () => {
      const selected = priceLists.find(pl => pl.id === formData.priceListId);
      if (selected && (selected.data || selected.fileId)) {
        const bytes = await getFileData(selected.data, selected.fileId);
        if (bytes) {
          const blob = new Blob([bytes], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          setPreviewPdfUrl(url);
        }
      }
    };
    fetchPreview();
    return () => { if (previewPdfUrl) URL.revokeObjectURL(previewPdfUrl); };
  }, [formData.priceListId, priceLists]); // Removed pdfCache dependency


  useEffect(() => {
    if (!regeneratingItem) return;
    const generateHistoryPDF = async () => {
      setIsGenerating(true);
      try {
        const element = document.getElementById('history-quotation-template');
        const dataUrl = await toJpeg(element, { quality: 0.95, backgroundColor: '#ffffff', pixelRatio: 2 });
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        pdf.addImage(dataUrl, 'JPEG', 0, 0, 210, 297);
        let finalPdfBytes = pdf.output('arraybuffer');

        // MERGE PRICE LIST IF IT WAS SELECTED IN HISTORY
        if (regeneratingItem.formData?.priceListId) {
          const selectedPriceList = priceLists.find(pl => pl.id === regeneratingItem.formData.priceListId);
          if (selectedPriceList && (selectedPriceList.data || selectedPriceList.fileId)) {
            try {
              const priceListBytes = await getFileData(selectedPriceList.data, selectedPriceList.fileId);
              if (priceListBytes) {
                const mainPdfDoc = await PDFDocument.load(finalPdfBytes);
                const priceListPdfDoc = await PDFDocument.load(priceListBytes);
                const mergedPdfDoc = await PDFDocument.create();
                
                const mainPages = await mergedPdfDoc.copyPages(mainPdfDoc, mainPdfDoc.getPageIndices());
                mainPages.forEach(p => mergedPdfDoc.addPage(p));
                
                const priceListPages = await mergedPdfDoc.copyPages(priceListPdfDoc, priceListPdfDoc.getPageIndices());
                priceListPages.forEach(p => mergedPdfDoc.addPage(p));
                
                finalPdfBytes = await mergedPdfDoc.save();
              }
            } catch (err) {
              console.error("Historical PDF Merge failed:", err);
            }
          }
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
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
          }
        } else {
          const url = URL.createObjectURL(blob);
          window.open(url, '_blank');
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsGenerating(false);
        setRegeneratingItem(null);
      }
    };

    setTimeout(generateHistoryPDF, 150);
  }, [regeneratingItem]);

  // Global Sync to Firebase (Granular saves)
  useEffect(() => {
    if (!user) return;
    const saveToFirebase = async () => {
      setSyncStatus('syncing');
      const success = await saveCompanyData(companyData);
      setSyncStatus(success ? 'saved' : 'error');
    };
    const timer = setTimeout(saveToFirebase, 2000);
    return () => clearTimeout(timer);
  }, [companyData, user]);

  // Template Save Logic moved to the button handler for immediate persistence
  // History Save Logic moved to generatePDF for immediate persistence

  // Local Storage backups (Truncated)
  useEffect(() => {
    localStorage.setItem('srr_company_data', JSON.stringify(companyData));
  }, [companyData]);

  useEffect(() => {
    localStorage.setItem('srr_price_lists', JSON.stringify(priceLists.map(a => ({ ...a, data: 'TRUNCATED_FOR_QUOTA' }))));
  }, [priceLists]);

  useEffect(() => {
    localStorage.setItem('srr_templates', JSON.stringify(templates));
  }, [templates]);

  useEffect(() => {
    localStorage.setItem('srr_history', JSON.stringify(quotationHistory.slice(0, 10)));
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
    });
    setDraftContent(JSON.parse(JSON.stringify(template.content)));
    setView('drafting');
  };

  const handleDuplicateTemplate = async (template) => {
    setSyncStatus('syncing');
    const newTemplate = {
      ...JSON.parse(JSON.stringify(template)),
      id: Date.now().toString(),
      name: `${template.name} (Copy)`
    };
    
    const success = await saveTemplate(newTemplate);
    if (success) {
      setTemplates(prev => [newTemplate, ...prev]);
      setSyncStatus('saved');
    } else {
      setSyncStatus('error');
      alert('Failed to duplicate template to cloud.');
    }
  };



  const handleDriveUpload = (e, colName, folderId = null) => {
    const files = Array.from(e.target.files);
    files.forEach(async (file) => {
      const label = colName === 'drive_srr' ? prompt(`Enter document name for ${file.name}:`) : null;
      if (colName === 'drive_srr' && !label) return;
      const newFile = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        label: label || file.name,
        fileName: file.name,
        type: file.type,
        folderId: folderId,
        uploadedAt: new Date().toLocaleDateString('en-GB')
      };
      const success = await syncItem(colName, newFile, false, file);
      if (success) {
        if (colName === 'drive_srr') {
          setDriveFiles(prev => ({ ...prev, srr: [...(prev.srr || []), newFile] }));
        } else {
          setDriveFiles(prev => ({
            ...prev,
            vendor: prev.vendor.map(f => f.id === folderId ? { ...f, files: [...(f.files || []), newFile] } : f)
          }));
        }
      }
    });
    e.target.value = '';
  };

  const handleDeleteDriveFile = async (colName, file) => {
    confirmDelete(async () => {
      const success = await syncItem(colName, file, true);
      if (success) {
        if (colName === 'drive_srr') {
          setDriveFiles(prev => ({ ...prev, srr: prev.srr.filter(f => f.id !== file.id) }));
        } else {
          setDriveFiles(prev => ({
            ...prev,
            vendor: prev.vendor.map(folder => ({ ...folder, files: (folder.files || []).filter(f => f.id !== file.id) }))
          }));
        }
      }
    });
  };



  const handleDeleteFolder = (folder) => {
    confirmDelete(async () => {
      for (const file of (folder.files || [])) {
        await syncItem('drive_vendor_files', file, true);
      }
      const success = await syncItem('drive_folders', folder, true);
      if (success) setDriveFiles(prev => ({ ...prev, vendor: prev.vendor.filter(f => f.id !== folder.id) }));
    });
  };

  const generatePDF = async () => {
    if (!formData.hospitalName) return alert('Please enter Hospital Name.');
    setIsGenerating(true);
    try {
      const element = document.getElementById('quotation-template');
      const dataUrl = await toJpeg(element, { quality: 0.95, backgroundColor: '#ffffff', pixelRatio: 2 });
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      pdf.addImage(dataUrl, 'JPEG', 0, 0, 210, 297);
      let finalPdfBytes = pdf.output('arraybuffer');

      // MERGE PRICE LIST IF SELECTED
      if (formData.priceListId) {
        const selectedPriceList = priceLists.find(pl => pl.id === formData.priceListId);
        if (selectedPriceList && (selectedPriceList.data || selectedPriceList.fileId)) {
          try {
            const priceListBytes = await getFileData(selectedPriceList.data, selectedPriceList.fileId);
            if (priceListBytes) {
              const mainPdfDoc = await PDFDocument.load(finalPdfBytes);
              const priceListPdfDoc = await PDFDocument.load(priceListBytes);
              const mergedPdfDoc = await PDFDocument.create();
              
              const mainPages = await mergedPdfDoc.copyPages(mainPdfDoc, mainPdfDoc.getPageIndices());
              mainPages.forEach(p => mergedPdfDoc.addPage(p));
              
              const priceListPages = await mergedPdfDoc.copyPages(priceListPdfDoc, priceListPdfDoc.getPageIndices());
              priceListPages.forEach(p => mergedPdfDoc.addPage(p));
              
              finalPdfBytes = await mergedPdfDoc.save();
            } else {
              throw new Error("Could not retrieve Price List from Firebase Storage.");
            }
          } catch (err) {
            console.error("PDF Merge failed:", err);
            alert("Warning: Price List merge failed. The document was generated without the attachment. Error: " + err.message);
          }
        }
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
        draftContent: JSON.parse(JSON.stringify(draftContent))
      };
      setQuotationHistory([historyItem, ...quotationHistory]);
      await saveHistoryItem(historyItem);

      const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
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
          <span className="font-bold text-lg tracking-tight">SRR Quotation Maker</span>
        </div>
        <div className="flex gap-4">
          <NavItem id="library" label="Library" />
          <NavItem id="history" label="History" />
          <NavItem id="drive" label="Drive" />
          <NavItem id="emailer" label="Emailer" />
          <NavItem id="pricelists" label="Price List" />
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
                      requiresPriceList: false,
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
                    onDuplicate={handleDuplicateTemplate}
                    onDelete={async (id) => {
                      confirmDelete(async () => {
                        await deleteTemplate(id);
                        setTemplates(templates.filter(temp => temp.id !== id));
                      });
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

                  <div className="flex items-center justify-between p-4 bg-[var(--apple-gray-1)] rounded-2xl border border-[var(--apple-gray-2)]">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${editingTemplate?.requiresPriceList ? 'bg-emerald-100 text-emerald-600' : 'bg-white text-[var(--apple-gray-4)]'}`}>
                        <FileText size={20} />
                      </div>
                      <div>
                        <p className="text-[14px] font-bold text-[var(--apple-black)]">Price List Needed</p>
                        <p className="text-[11px] text-[var(--apple-gray-5)] font-medium">Require selecting a price list when drafting</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setEditingTemplate({ ...editingTemplate, requiresPriceList: !editingTemplate?.requiresPriceList })}
                      className={`w-12 h-6 rounded-full transition-all duration-300 relative ${editingTemplate?.requiresPriceList ? 'bg-emerald-500' : 'bg-[var(--apple-gray-3)]'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${editingTemplate?.requiresPriceList ? 'left-7' : 'left-1'}`} />
                    </button>
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

              <div className="p-8 mt-auto pt-4 bg-white border-t border-[var(--apple-gray-2)] sticky bottom-0 flex flex-col gap-3">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[11px] font-bold text-[var(--apple-gray-5)] uppercase tracking-wider">Storage Status</span>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${syncStatus === 'syncing' ? 'bg-amber-400 animate-pulse' : syncStatus === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`} />
                    <span className="text-[12px] font-medium text-[var(--apple-gray-6)]">
                      {syncStatus === 'syncing' ? 'Saving to Cloud...' : syncStatus === 'error' ? 'Sync Error' : 'All Changes Saved'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    if (!editingTemplate) return;
                    setSyncStatus('syncing');
                    
                    // Prepare the update
                    const updated = templates.some(t => t.id === editingTemplate.id)
                      ? templates.map(t => t.id === editingTemplate.id ? editingTemplate : t)
                      : [...templates, editingTemplate];
                    
                    try {
                      const success = await saveTemplate(editingTemplate);
                      if (success) {
                        // 1. Update local state
                        setTemplates(updated);
                        // 2. Clear editor
                        setSyncStatus('saved');
                        setEditingTemplate(null);
                        setView('library');
                      } else {
                        throw new Error("Firestore rejection");
                      }
                    } catch (err) {
                      setSyncStatus('error');
                      alert('Cloud Save Failed! Your changes are saved locally but not in the cloud. Check your internet.');
                      // Still update local state so they don't lose work
                      setTemplates(updated);
                      setEditingTemplate(null);
                      setView('library');
                    }
                  }}
                  className="btn-primary w-full py-4"
                >
                  <Save size={18} /> Save & Close
                </button>
              </div>
            </div>

            {/* Right Canvas */}
            {showPreview && (
              <div className="flex-1 bg-[var(--apple-bg)] overflow-y-auto p-12">
                <div className="max-w-6xl mx-auto space-y-8">
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
                            const nc = [...editingTemplate.content];
                            nc[idx] = { ...nc[idx], value: e.target.value };
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
                                        const nc = [...editingTemplate.content];
                                        const newHeaders = [...nc[idx].headers];
                                        newHeaders[hi] = e.target.value;
                                        nc[idx] = { ...nc[idx], headers: newHeaders };
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
                                      {block.headers[ci]?.toLowerCase().includes('item') || block.headers[ci]?.toLowerCase().includes('desc') ? (
                                        <textarea
                                          value={cell}
                                          rows={cell.toString().split('\n').length || 1}
                                          onChange={e => {
                                            const nc = [...editingTemplate.content];
                                            const newRows = nc[idx].rows.map(r => [...r]);
                                            newRows[ri][ci] = e.target.value;
                                            nc[idx] = { ...nc[idx], rows: newRows };
                                            setEditingTemplate({ ...editingTemplate, content: nc });
                                          }}
                                          className="w-full py-2.5 px-3 bg-transparent outline-none text-left text-[13px] hover:bg-black/5 focus:bg-white focus:ring-1 focus:ring-[var(--emerald)] transition-all resize-none overflow-hidden"
                                          placeholder="Enter set details..."
                                        />
                                      ) : (
                                        <input
                                          value={cell}
                                          onChange={e => {
                                            const nc = [...editingTemplate.content];
                                            const newRows = nc[idx].rows.map(r => [...r]);
                                            newRows[ri][ci] = e.target.value;
                                            
                                            const headers = nc[idx].headers.map(h => h.toLowerCase());
                                            const qtyIdx = headers.findIndex(h => h === 'qty' || h === 'quantity');
                                            const rateIdx = headers.findIndex(h => h === 'rate' || h === 'mrp' || h === 'price');
                                            const amountIdx = headers.findIndex(h => h === 'amount' || h === 'total');

                                            if (qtyIdx !== -1 && rateIdx !== -1 && amountIdx !== -1 && (ci === qtyIdx || ci === rateIdx)) {
                                              const qty = parseFloat(newRows[ri][qtyIdx]) || 0;
                                              const rate = parseFloat(newRows[ri][rateIdx]) || 0;
                                              newRows[ri][amountIdx] = (qty * rate).toFixed(2).replace(/\.00$/, '');
                                            }

                                            nc[idx] = { ...nc[idx], rows: newRows };
                                            setEditingTemplate({ ...editingTemplate, content: nc });
                                          }}
                                          className="w-full py-2.5 px-3 bg-transparent outline-none text-center text-[13px] hover:bg-black/5 focus:bg-white focus:ring-1 focus:ring-[var(--emerald)] transition-all"
                                        />
                                      )}
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
                                const nc = [...editingTemplate.content];
                                const newRows = [...nc[idx].rows, Array(block.headers.length).fill('')];
                                nc[idx] = { ...nc[idx], rows: newRows };
                                setEditingTemplate({ ...editingTemplate, content: nc });
                              }}
                              className="flex-1 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--emerald)] hover:bg-[var(--emerald-light)] transition-colors border-r border-[var(--apple-gray-2)]"
                            >
                              + Add Row
                            </button>
                            <button
                              onClick={() => {
                                const nc = [...editingTemplate.content];
                                const newHeaders = [...nc[idx].headers, 'NEW COL'];
                                const newRows = nc[idx].rows.map(row => [...row, '']);
                                nc[idx] = { ...nc[idx], headers: newHeaders, rows: newRows };
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

                    {templates.find(t => t.id === formData.selectedTemplateId)?.requiresPriceList && (
                      <div>
                        <span className="text-[11px] font-semibold text-[var(--apple-gray-5)] uppercase block mb-1">Attached Price List</span>
                        <select 
                          name="priceListId" 
                          value={formData.priceListId || ''} 
                          onChange={handleInputChange}
                          className="apple-input cursor-pointer bg-[var(--apple-gray-1)]"
                        >
                          <option value="">-- Select Price List --</option>
                          {priceLists.map(pl => (
                            <option key={pl.id} value={pl.id}>{pl.label}</option>
                          ))}
                        </select>
                      </div>
                    )}
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
                                          if (block.headers.length <= 1) return;
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
                                        {block.headers[ci]?.toLowerCase().includes('item') || block.headers[ci]?.toLowerCase().includes('desc') ? (
                                          <textarea
                                            value={cell}
                                            rows={cell.toString().split('\n').length || 1}
                                            onChange={e => {
                                              const nc = [...draftContent];
                                              const newRows = nc[idx].rows.map(r => [...r]);
                                              newRows[ri][ci] = e.target.value;
                                              nc[idx] = { ...nc[idx], rows: newRows };
                                              setDraftContent(nc);
                                            }}
                                            className="w-full py-2.5 px-3 bg-transparent outline-none text-left text-[13px] hover:bg-black/5 focus:bg-white focus:ring-1 focus:ring-[var(--emerald)] transition-all resize-none overflow-hidden"
                                            placeholder="Enter set details..."
                                          />
                                        ) : (
                                          <input
                                            value={cell}
                                            onChange={e => {
                                              const nc = [...draftContent];
                                              const newRows = nc[idx].rows.map(r => [...r]);
                                              newRows[ri][ci] = e.target.value;

                                              const headers = nc[idx].headers.map(h => h.toLowerCase());
                                              const qtyIdx = headers.findIndex(h => h === 'qty' || h === 'quantity');
                                              const rateIdx = headers.findIndex(h => h === 'rate' || h === 'mrp' || h === 'price');
                                              const amountIdx = headers.findIndex(h => h === 'amount' || h === 'total');

                                              if (qtyIdx !== -1 && rateIdx !== -1 && amountIdx !== -1 && (ci === qtyIdx || ci === rateIdx)) {
                                                const qty = parseFloat(newRows[ri][qtyIdx]) || 0;
                                                const rate = parseFloat(newRows[ri][rateIdx]) || 0;
                                                newRows[ri][amountIdx] = (qty * rate).toFixed(2).replace(/\.00$/, '');
                                              }

                                              nc[idx] = { ...nc[idx], rows: newRows };
                                              setDraftContent(nc);
                                            }}
                                            className="w-full py-2.5 px-3 bg-transparent outline-none text-center text-[13px] hover:bg-black/5 focus:bg-white focus:ring-1 focus:ring-[var(--emerald)] transition-all"
                                          />
                                        )}
                                      </td>
                                    ))}
                                    <td className="p-0 text-center w-8">
                                      <button
                                        onClick={() => {
                                          const nc = [...draftContent];
                                          const newRows = nc[idx].rows.filter((_, i) => i !== ri);
                                          nc[idx] = { ...nc[idx], rows: newRows };
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
                                  const nc = [...draftContent];
                                  const newRows = [...nc[idx].rows, Array(block.headers.length).fill('')];
                                  nc[idx] = { ...nc[idx], rows: newRows };
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



                </div>
              </div>

              <div className="p-8 mt-auto pt-4 bg-white border-t border-[var(--apple-gray-2)] sticky bottom-0 flex gap-3">
                <button onClick={generatePDF} disabled={isGenerating} className="btn-primary flex-1">
                  {isGenerating ? 'Processing...' : <><Download size={18} /> Generate PDF</>}
                </button>
                <button
                  onClick={() => {
                    if (!formData.hospitalName.trim() || !formData.address.trim()) {
                      alert('Please enter Hospital Name and Hospital Address to enable email composition.');
                      return;
                    }
                    setShowEmailComposer(!showEmailComposer);
                  }}
                  className={`btn-outline !py-3 !px-4 ${showEmailComposer ? 'bg-[var(--apple-gray-1)]' : ''} ${(!formData.hospitalName.trim() || !formData.address.trim()) ? 'opacity-40 grayscale pointer-events-auto cursor-not-allowed' : ''}`}
                  title={(!formData.hospitalName.trim() || !formData.address.trim()) ? "Enter Hospital Name & Address to enable email" : "Compose Email"}
                >
                  <Mail size={18} className={showEmailComposer ? 'text-[var(--emerald)]' : ''} />
                </button>
              </div>
            </div>

            {/* Right Live Preview Area OR Email Composer */}
            {showPreview && (
              <div className="flex-1 bg-[var(--apple-gray-2)] overflow-y-auto p-12 relative">
                {showEmailComposer ? (
                  /* ── EMAIL COMPOSER OVERLAY ── */
                  <div className="max-w-2xl mx-auto bg-white shadow-2xl overflow-hidden border border-[var(--apple-gray-3)] flex flex-col h-[calc(100vh-160px)]">
                    <div className="bg-[var(--apple-gray-1)] px-8 py-6 border-b border-[var(--apple-gray-2)] flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[var(--accent)] flex items-center justify-center">
                          <Mail className="text-white" size={20} />
                        </div>
                        <div>
                          <h3 className="text-[17px] font-bold">Compose Email</h3>
                          <p className="text-[11px] text-[var(--apple-gray-5)] uppercase font-bold tracking-wider">New Message</p>
                        </div>
                      </div>
                      <button onClick={() => setShowEmailComposer(false)} className="text-[var(--apple-gray-5)] hover:text-[var(--apple-black)] transition-colors">
                        <Plus className="rotate-45" size={24} />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 space-y-6">
                      {/* Recipient */}
                      <div className="flex items-center gap-4 border border-[var(--apple-gray-3)] px-4 py-3 bg-white focus-within:border-[var(--accent)] focus-within:ring-1 focus-within:ring-[var(--accent)] transition-all">
                        <span className="text-[13px] font-bold text-[var(--apple-gray-5)] w-10 uppercase tracking-wider">To</span>
                        <input
                          type="email"
                          value={emailForm.to}
                          onChange={(e) => setEmailForm({ ...emailForm, to: e.target.value })}
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
                          onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                          className="flex-1 bg-transparent no-internal-border text-[15px] font-semibold"
                        />
                      </div>

                      {/* Attachment Badge (Generated PDF) */}
                      <div className="flex items-center flex-wrap gap-2">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-[var(--accent)] rounded-none text-[12px] font-bold text-[var(--accent)]">
                          <FileText size={14} />
                          Quotation_{formData.hospitalName || 'Draft'}.pdf
                        </div>
                        {emailForm.selectedDriveFiles.map(file => (
                          <div key={file.id} className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-none text-[12px] font-bold text-amber-700">
                            <FileCheck size={14} />
                            {file.label || file.fileName}
                            <button onClick={() => setEmailForm(prev => ({ ...prev, selectedDriveFiles: prev.selectedDriveFiles.filter(f => f.id !== file.id) }))}>
                              <Plus className="rotate-45" size={14} />
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Body */}
                      <div className="border border-[var(--apple-gray-3)] p-4 bg-white focus-within:border-[var(--accent)] focus-within:ring-1 focus-within:ring-[var(--accent)] transition-all">
                        <textarea
                          value={emailForm.body}
                          onChange={(e) => setEmailForm({ ...emailForm, body: e.target.value })}
                          placeholder="Type your message here..."
                          className="w-full min-h-[300px] bg-transparent no-internal-border text-[15px] leading-relaxed resize-none"
                        />
                      </div>

                      {/* Drive Attachments Picker */}
                      <div className="pt-6 border-t border-[var(--apple-gray-2)]">
                        <h4 className="text-[13px] font-bold text-[var(--apple-gray-5)] uppercase tracking-wider mb-4">Attach Documents from Drive</h4>
                        <div className="space-y-4">
                          {/* SRR Files */}
                          <div>
                            <p className="text-[11px] font-bold text-[var(--emerald)] mb-2 uppercase">SRR Certificates</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {(driveFiles.srr || []).map(file => (
                                <button
                                  key={file.id}
                                  onClick={() => {
                                    const exists = emailForm.selectedDriveFiles.find(f => f.id === file.id);
                                    if (exists) {
                                      setEmailForm(prev => ({ ...prev, selectedDriveFiles: prev.selectedDriveFiles.filter(f => f.id !== file.id) }));
                                    } else {
                                      setEmailForm(prev => ({ ...prev, selectedDriveFiles: [...prev.selectedDriveFiles, file] }));
                                    }
                                  }}
                                  className={`flex items-center gap-2 p-2 border text-left transition-all rounded-none ${emailForm.selectedDriveFiles.find(f => f.id === file.id) ? 'bg-emerald-50 border-[var(--accent)]' : 'bg-white border-[var(--apple-gray-2)] hover:bg-[var(--apple-gray-1)]'}`}
                                >
                                  <div className={`w-4 h-4 border flex items-center justify-center rounded-none ${emailForm.selectedDriveFiles.find(f => f.id === file.id) ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-[var(--apple-gray-3)]'}`}>
                                    {emailForm.selectedDriveFiles.find(f => f.id === file.id) && <CheckSquare size={10} className="text-white" />}
                                  </div>
                                  <span className="text-[12px] font-medium truncate">{file.label}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Vendor Folders */}
                          {(driveFiles.vendor || []).map(folder => (
                            <div key={folder.id}>
                              <p className="text-[11px] font-bold text-amber-600 mb-2 uppercase">{folder.name} Documents</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {(folder.files || []).map(file => (
                                  <button
                                    key={file.id}
                                    onClick={() => {
                                      const exists = emailForm.selectedDriveFiles.find(f => f.id === file.id);
                                      if (exists) {
                                        setEmailForm(prev => ({ ...prev, selectedDriveFiles: prev.selectedDriveFiles.filter(f => f.id !== file.id) }));
                                      } else {
                                        setEmailForm(prev => ({ ...prev, selectedDriveFiles: [...prev.selectedDriveFiles, file] }));
                                      }
                                    }}
                                    className={`flex items-center gap-2 p-2 border text-left transition-all rounded-none ${emailForm.selectedDriveFiles.find(f => f.id === file.id) ? 'bg-amber-50 border-amber-400' : 'bg-white border-[var(--apple-gray-2)] hover:bg-[var(--apple-gray-1)]'}`}
                                  >
                                    <div className={`w-4 h-4 border flex items-center justify-center rounded-none ${emailForm.selectedDriveFiles.find(f => f.id === file.id) ? 'bg-amber-500 border-amber-500' : 'border-[var(--apple-gray-3)]'}`}>
                                      {emailForm.selectedDriveFiles.find(f => f.id === file.id) && <CheckSquare size={10} className="text-white" />}
                                    </div>
                                    <span className="text-[12px] font-medium truncate">{file.fileName}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="p-8 bg-[var(--apple-gray-1)] border-t border-[var(--apple-gray-2)] flex items-center justify-between">
                      <p className="text-[12px] text-[var(--apple-gray-5)] font-medium">Draft saved to cloud</p>
                      <button
                        onClick={handleGlobalSendEmail}
                        disabled={isSendingEmail}
                        className={`btn-primary !py-2.5 !px-8 ${isSendingEmail ? 'opacity-70 cursor-not-allowed' : ''}`}
                      >
                        {isSendingEmail ? 'Sending...' : 'Send Message'}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── ORIGINAL PDF PREVIEW ── */
                  <div className="flex flex-col items-center gap-8">
                    <div className="scale-[0.85] origin-top">
                      <QuotationTemplate id="quotation-template" data={formData} content={draftContent} company={companyData} />
                    </div>

                    {formData.priceListId && (
                      <div className="scale-[0.85] origin-top flex flex-col gap-4">
                        <div className="w-[210mm] min-h-[500px] bg-white shadow-2xl flex flex-col items-center justify-center border border-[var(--apple-gray-3)] relative overflow-hidden">
                          <div className="absolute top-4 left-4 bg-[var(--emerald)] text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-sm z-10">
                            Attached Price List
                          </div>
                          {previewPdfUrl ? (
                            <iframe 
                              src={previewPdfUrl + '#toolbar=0&navpanes=0&view=FitH'} 
                              className="w-full h-[1100px] border-none" 
                              title="Price List Preview" 
                            />
                          ) : (
                            <div className="flex flex-col items-center gap-4 py-20 px-12 text-center">
                              <div className="w-20 h-20 bg-[var(--apple-gray-1)] rounded-3xl flex items-center justify-center mb-4">
                                <FileCheck size={40} className="text-[var(--emerald)] animate-pulse" />
                              </div>
                              <h3 className="text-[20px] font-bold text-[var(--apple-black)] tracking-tight">
                                Loading Price List...
                              </h3>
                              <p className="text-[14px] text-[var(--apple-gray-5)]">
                                Fetching the document from Google Drive.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                  </div>
                )}
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
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={(e) => handleDriveUpload(e, 'drive_srr')} className="hidden" id="srr-drive-upload" />
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
                    <button onClick={async () => {
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
                            <button onClick={(e) => {
                              e.stopPropagation(); confirmDelete(async () => {
                                setDriveFiles(prev => ({ ...prev, vendor: prev.vendor.filter(f => f.id !== folder.id) }));
                                await syncItem('drive_folders', folder, true);
                              });
                            }} className="w-8 h-8 flex items-center justify-center text-[var(--apple-gray-4)] hover:text-red-500 rounded-lg transition-colors" title="Delete folder">
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
                            <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={(e) => handleDriveUpload(e, 'drive_vendor_files', folder.id)} className="hidden" id="vendor-folder-upload" />
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

        {/* VIEW: PRICE LISTS */}
        {view === 'pricelists' && (
          <div className="h-full overflow-y-auto px-8 py-12 md:px-16 md:py-16">
            <div className="max-w-6xl mx-auto">
              <header className="mb-12">
                <h1 className="apple-title-1 mb-2">Price Lists</h1>
                <p className="apple-subtitle">Manage and access manufacturer price lists.</p>
              </header>

              <div className="apple-card p-12 text-center mb-12 border-2 border-dashed border-[var(--apple-gray-3)] bg-[var(--apple-gray-1)]/30">
                <div className="w-16 h-16 bg-white text-[var(--apple-black)] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                  <UploadCloud size={32} />
                </div>
                <h2 className="text-[24px] font-semibold tracking-tight mb-2">Upload Price List</h2>
                <p className="text-[15px] text-[var(--apple-gray-5)] mb-8">Upload a document and give it a name.</p>
                
                <input type="file" onChange={(e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  const label = prompt('Enter a name for this Price List (e.g. Stryker 2024):');
                  if (!label) { e.target.value = ''; return; }
                  const newItem = { id: Date.now().toString(), label, fileName: file.name, uploadedAt: new Date().toLocaleDateString('en-GB') };
                  syncItem('price_lists', newItem, false, file).then(success => {
                    if (success) setPriceLists(prev => [...prev, newItem]);
                  });
                  e.target.value = '';
                }} className="hidden" id="price-list-upload" />
                <label htmlFor="price-list-upload" className="btn-primary cursor-pointer inline-flex items-center gap-2">
                  <Plus size={18} /> Select File
                </label>
              </div>

              <div>
                <h3 className="apple-label mb-6 flex items-center gap-2">
                  <FileText size={18} className="text-[var(--apple-gray-5)]" />
                  Your Price Lists ({priceLists.length})
                </h3>
                <div className="grid gap-4">
                  {priceLists.map(item => (
                    <div key={item.id} className="apple-card p-5 flex items-center justify-between hover:border-[var(--apple-gray-4)] transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 bg-[var(--apple-gray-1)] rounded-xl flex items-center justify-center">
                          <FileText size={22} className="text-[var(--apple-black)]" />
                        </div>
                        <div>
                          <p className="text-[16px] font-bold text-[var(--apple-black)] leading-tight">{item.label}</p>
                          <p className="text-[12px] text-[var(--apple-gray-5)] mt-1">{item.fileName} • {item.uploadedAt}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a href={item.data} download={item.fileName} className="w-9 h-9 flex items-center justify-center text-[var(--apple-gray-5)] hover:text-[var(--apple-black)] hover:bg-[var(--apple-gray-1)] rounded-lg transition-all" title="Download">
                          <Download size={18} />
                        </a>
                        <button 
                          onClick={() => confirmDelete(async () => {
                            setPriceLists(prev => prev.filter(p => p.id !== item.id));
                            await syncItem('price_lists', item, true);
                          })}
                          className="w-9 h-9 flex items-center justify-center text-[var(--apple-gray-4)] hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {priceLists.length === 0 && (
                    <div className="text-center py-16 bg-white border border-dashed border-[var(--apple-gray-3)] rounded-2xl">
                      <p className="text-[15px] text-[var(--apple-gray-4)]">No price lists uploaded yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: SETTINGS */}
        {view === 'settings' && (
          <div className="h-full overflow-y-auto px-8 py-12 md:px-16 md:py-16">
            <div className="max-w-4xl mx-auto">
              <header className="mb-12">
                <h1 className="apple-title-1">Settings</h1>
                <p className="apple-subtitle">Manage your company profile and application preferences.</p>
              </header>

              <div className="apple-card p-8">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="apple-label">Company Name</label>
                      <input
                        type="text"
                        value={companyData.name}
                        onChange={e => setCompanyData({ ...companyData, name: e.target.value })}
                        className="apple-input"
                      />
                    </div>
                    <div>
                      <label className="apple-label">Email Address</label>
                      <input
                        type="email"
                        value={companyData.email}
                        onChange={e => setCompanyData({ ...companyData, email: e.target.value })}
                        className="apple-input"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="apple-label">Company Address</label>
                    <textarea
                      rows="3"
                      value={companyData.address}
                      onChange={e => setCompanyData({ ...companyData, address: e.target.value })}
                      className="apple-input"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="apple-label">Phone Numbers</label>
                      <input
                        type="text"
                        value={companyData.phone}
                        onChange={e => setCompanyData({ ...companyData, phone: e.target.value })}
                        className="apple-input"
                      />
                    </div>
                    <div>
                      <label className="apple-label">Website</label>
                      <input
                        type="text"
                        value={companyData.website}
                        onChange={e => setCompanyData({ ...companyData, website: e.target.value })}
                        className="apple-input"
                      />
                    </div>
                  </div>
                  <div className="pt-6 border-t border-[var(--apple-gray-2)]">
                    <button
                      onClick={async () => {
                        setSyncStatus('syncing');
                        const success = await saveCompanyData(companyData);
                        if (success) {
                          setSyncStatus('saved');
                          alert('Settings saved to Cloud successfully!');
                        } else {
                          setSyncStatus('error');
                          alert('Failed to save settings to Cloud.');
                        }
                      }}
                      className="btn-primary"
                    >
                      <Save size={18} /> Save Settings
                    </button>
                  </div>
                </div>
              </div>

              <div className="apple-card p-8 mt-8 border-2 border-red-100 bg-red-50/20">
                <h3 className="text-[17px] font-bold text-red-600 mb-2 flex items-center gap-2">
                  <Trash2 size={18} /> Data Management
                </h3>
                <p className="text-[13px] text-[var(--apple-gray-5)] mb-6">
                  Use this to completely wipe all file records (Brands, Certificates, Vendor Docs) from the database and clear your cache.
                </p>
                <button
                  onClick={async () => {
                    const pwd = prompt('Type "PURGE" to confirm clearing local cache:');
                    if (pwd !== 'PURGE') return;
                    localStorage.clear();
                    alert('Local cache cleared successfully! The app will now reload.');
                    window.location.reload();
                  }}
                  className="bg-red-500 hover:bg-red-600 text-white px-6 py-2.5 rounded-xl font-bold text-[14px] transition-colors flex items-center gap-2 shadow-sm"
                >
                  <Trash2 size={16} /> Clear Local Cache
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: EMAILER */}
        {view === 'emailer' && (
          <div className="h-full relative">
            <button
              onClick={() => refreshData()}
              className="absolute top-6 right-8 z-10 flex items-center gap-2 px-4 py-2 bg-white border border-[var(--apple-gray-3)] rounded-full text-[13px] font-bold text-[var(--apple-gray-6)] hover:bg-[var(--apple-gray-1)] transition-all shadow-sm"
            >
              <ArrowRight className={syncStatus === 'syncing' ? 'animate-spin' : ''} size={16} />
              {syncStatus === 'syncing' ? 'Refreshing...' : 'Refresh Files'}
            </button>
            <EmailerView driveFiles={driveFiles} priceLists={priceLists} />
          </div>
        )}
      </main>

      {/* UPLOAD PROGRESS OVERLAY */}
      {isUploading && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4">
          <div className="bg-white shadow-2xl border border-[var(--apple-gray-3)] rounded-2xl p-6 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center animate-pulse">
                  <UploadCloud size={20} className="text-[var(--emerald)]" />
                </div>
                <div>
                  <h4 className="text-[15px] font-bold">Uploading Document</h4>
                  <p className="text-[12px] text-[var(--apple-gray-5)]">Please wait while we sync to Cloud</p>
                </div>
              </div>
              <span className="text-[17px] font-bold text-[var(--emerald)]">{Math.round(uploadProgress)}%</span>
            </div>

            <div className="w-full h-2 bg-[var(--apple-gray-2)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--emerald)] transition-all duration-300 ease-out"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>

            {uploadProgress === 100 && (
              <div className="flex items-center gap-2 text-[13px] font-bold text-[var(--emerald)] animate-in zoom-in duration-300">
                <FileCheck size={16} /> Upload Complete!
              </div>
            )}
          </div>
        </div>
      )}

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
