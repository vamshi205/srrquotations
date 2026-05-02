import React, { useState, useEffect } from 'react';
import QuotationTemplate from './components/QuotationTemplate';
import LibraryCard from './components/LibraryCard';
import jsPDF from 'jspdf';
import { toJpeg } from 'html-to-image';
import { PDFDocument } from 'pdf-lib';
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
  Search
} from 'lucide-react';

function App() {
  const [view, setView] = useState('library'); 
  
  const getTodayFormatted = () => {
    const d = new Date();
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  };

  const [formData, setFormData] = useState({
    hospitalName: '',
    address: '',
    date: getTodayFormatted(),
    referenceNumber: `SRR/${new Date().getFullYear()}/001`,
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

  const [isGenerating, setIsGenerating] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [regeneratingItem, setRegeneratingItem] = useState(null);

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
          const base64Data = selectedAttachment.data.includes('base64,') ? selectedAttachment.data.split(',')[1] : selectedAttachment.data;
          const attachmentDoc = await PDFDocument.load(base64Data);
          const pages = await mergedPdf.copyPages(attachmentDoc, attachmentDoc.getPageIndices());
          pages.forEach(page => mergedPdf.addPage(page));
          finalPdfBytes = await mergedPdf.save();
        } else {
          finalPdfBytes = coverArrayBuffer;
        }

        const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a'); 
        link.href = url; 
        link.download = `Quotation_${regeneratingItem.formData.hospitalName}.pdf`; 
        link.click();
      } catch (e) {
        console.error(e);
      } finally {
        setIsGenerating(false);
        setRegeneratingItem(null);
      }
    };
    
    setTimeout(generateHistoryPDF, 150);
  }, [regeneratingItem, attachments]);

  useEffect(() => { localStorage.setItem('srr_company_data', JSON.stringify(companyData)); }, [companyData]);
  useEffect(() => { localStorage.setItem('srr_attachments', JSON.stringify(attachments)); }, [attachments]);
  useEffect(() => { localStorage.setItem('srr_templates', JSON.stringify(templates)); }, [templates]);
  useEffect(() => { localStorage.setItem('srr_history', JSON.stringify(quotationHistory)); }, [quotationHistory]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const useTemplate = (template) => {
    setFormData({ 
      ...formData,
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
      reader.onload = (e) => {
        const newAttachment = { id: Date.now().toString(), label, data: e.target.result, fileName: file.name };
        setAttachments([...attachments, newAttachment]);
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
        const base64Data = selectedAttachment.data.includes('base64,') ? selectedAttachment.data.split(',')[1] : selectedAttachment.data;
        const attachmentDoc = await PDFDocument.load(base64Data);
        const pages = await mergedPdf.copyPages(attachmentDoc, attachmentDoc.getPageIndices());
        pages.forEach(page => mergedPdf.addPage(page));
        finalPdfBytes = await mergedPdf.save();
      } else {
        finalPdfBytes = coverArrayBuffer;
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
          <NavItem id="admin" label="Brands" />
          <NavItem id="settings" label="Settings" />
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
                    onDelete={(id) => setTemplates(templates.filter(temp => temp.id !== id))} 
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
              <div className="flex-1 bg-[var(--apple-gray-2)] overflow-y-auto p-12 flex justify-center">
                <div className="scale-[0.85] origin-top">
                  <QuotationTemplate id="quotation-template" data={formData} content={draftContent} company={companyData} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW: HISTORY */}
        {view === 'history' && (
          <div className="h-full overflow-y-auto px-8 py-12 md:px-16 md:py-16">
            <div className="max-w-4xl mx-auto">
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
                <div>
                  <h1 className="apple-title-1 mb-2">History</h1>
                  <p className="apple-subtitle">Recent quotations generated.</p>
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

              {quotationHistory.filter(item => 
                item.hospital.toLowerCase().includes(searchQuery.toLowerCase()) || 
                item.ref.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.templateName.toLowerCase().includes(searchQuery.toLowerCase())
              ).length === 0 ? (
                <div className="text-center py-20 opacity-40">
                  <LayoutDashboard size={48} className="mx-auto mb-4" />
                  <p className="font-semibold text-lg">No history matches found</p>
                </div>
              ) : (
                <div className="apple-card overflow-hidden">
                  {quotationHistory.filter(item => 
                    item.hospital.toLowerCase().includes(searchQuery.toLowerCase()) || 
                    item.ref.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    item.templateName.toLowerCase().includes(searchQuery.toLowerCase())
                  ).map((item, idx) => (
                    <div key={item.id} className="p-6 border-b border-[var(--apple-gray-2)] last:border-0 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-[var(--apple-gray-1)] transition-colors">
                      <div>
                        <h3 className="text-[17px] font-semibold text-[var(--apple-black)]">{item.hospital}</h3>
                        <p className="text-[13px] text-[var(--apple-gray-5)] mt-1 font-medium">{item.templateName} • Ref: {item.ref}</p>
                      </div>
                      <div className="flex items-center gap-4 text-[13px] font-semibold">
                        <span className="text-[var(--apple-gray-5)]">{item.date}</span>
                        {item.formData && (
                          <button 
                            onClick={() => setRegeneratingItem(item)}
                            disabled={isGenerating || regeneratingItem}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[var(--apple-gray-2)] rounded-md text-[var(--emerald)] hover:border-[var(--emerald)] transition-colors disabled:opacity-50"
                          >
                            <Download size={14} /> Download
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                        onClick={() => setAttachments(attachments.filter(a => a.id !== att.id))} 
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
