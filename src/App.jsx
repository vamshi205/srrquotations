import React, { useState, useEffect } from 'react';
import QuotationTemplate from './components/QuotationTemplate';
import LibraryCard from './components/LibraryCard';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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
  Save
} from 'lucide-react';

function App() {
  const [view, setView] = useState('library'); 
  
  const [formData, setFormData] = useState({
    hospitalName: '',
    address: '',
    date: new Date().toISOString().split('T')[0],
    referenceNumber: `SRR/${new Date().getFullYear()}/001`,
    subject: 'Sub : Quotation for Orthopedic Implants & instruments',
    discount: '40%',
    payment: '30 days',
    gst: '5%',
    validity: '31.03.2027',
    make: '',
    selectedTemplateId: ''
  });

  const [draftContent, setDraftContent] = useState([]);
  const [draftRequiresAttachment, setDraftRequiresAttachment] = useState(false);

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
        subject: 'Sub : Quotation for Orthopedic Implants & instruments',
        defaultDiscount: '40%',
        defaultGst: '5%',
        defaultPayment: '30 days',
        defaultValidity: '31.03.2027',
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
      subject: template.subject || 'Sub : Quotation for Orthopedic Implants & instruments',
      discount: template.defaultDiscount || '40%',
      gst: template.defaultGst || '5%',
      payment: template.defaultPayment || '30 days',
      validity: template.defaultValidity || '31.03.2027'
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
      reader.readAsArrayBuffer(file);
    }
  };

  const generatePDF = async () => {
    if (!formData.hospitalName) return alert('Please enter Hospital Name.');
    setIsGenerating(true);
    try {
      const element = document.getElementById('quotation-template');
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff', width: 210 * 3.7795, height: 297 * 3.7795 });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
      const coverArrayBuffer = pdf.output('arraybuffer');
      let finalPdfBytes;
      const selectedAttachment = draftRequiresAttachment ? attachments.find(a => a.label === formData.make) : null;
      if (selectedAttachment) {
        const mergedPdf = await PDFDocument.create();
        const coverDoc = await PDFDocument.load(coverArrayBuffer);
        const [coverPage] = await mergedPdf.copyPages(coverDoc, [0]);
        mergedPdf.addPage(coverPage);
        const attachmentDoc = await PDFDocument.load(selectedAttachment.data);
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
        templateName: templates.find(t => t.id === formData.selectedTemplateId)?.name || 'Custom'
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
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
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
                      defaultDiscount: '',
                      defaultGst: '',
                      defaultPayment: '',
                      defaultValidity: '',
                      content: []
                    });
                    setView('builder');
                  }} 
                  className="btn-black"
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
            <div className="w-[380px] bg-white border-r border-[var(--apple-gray-2)] flex flex-col overflow-y-auto">
              <div className="p-8 pb-4">
                <button
                  onClick={() => { setEditingTemplate(null); setView('library'); }}
                  className="flex items-center gap-1 text-[13px] font-semibold text-[var(--emerald)] mb-8 hover:opacity-80"
                >
                  <ChevronLeft size={16} /> Library
                </button>
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
                      {['Discount', 'GST', 'Payment', 'Validity'].map(term => {
                        const key = `default${term}`;
                        return (
                          <div key={term}>
                            <span className="text-[11px] font-semibold text-[var(--apple-gray-5)] uppercase block mb-1">{term}</span>
                            <input
                              value={editingTemplate?.[key] || ''}
                              onChange={e => setEditingTemplate({ ...editingTemplate, [key]: e.target.value })}
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
                        onClick={() => setEditingTemplate({ ...editingTemplate, content: [...(editingTemplate?.content || []), { type: 'table', headers: ['S.No', 'Item', 'Qty', 'MRP'], rows: [['1', '', '1', '']] }] })}
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
                  className="btn-black w-full"
                >
                  <Save size={18} /> Save Template
                </button>
              </div>
            </div>

            {/* Right Canvas */}
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
                      <div className="border border-[var(--apple-gray-2)] rounded-xl overflow-hidden">
                        <table className="w-full border-collapse">
                          <thead className="bg-[var(--apple-gray-1)] border-b border-[var(--apple-gray-2)]">
                            <tr>
                              {block.headers.map((h, hi) => (
                                <th key={hi} className="p-3 border-r border-[var(--apple-gray-2)] last:border-none">
                                  <input
                                    value={h}
                                    onChange={e => {
                                      const nc = [...editingTemplate.content]; nc[idx].headers[hi] = e.target.value;
                                      setEditingTemplate({ ...editingTemplate, content: nc });
                                    }}
                                    className="w-full bg-transparent outline-none font-semibold text-center text-[11px] uppercase tracking-wider text-[var(--apple-gray-6)]"
                                  />
                                </th>
                              ))}
                              <th className="w-8 bg-[var(--apple-gray-1)]"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {block.rows.map((row, ri) => (
                              <tr key={ri} className="border-b border-[var(--apple-gray-2)] last:border-none hover:bg-[var(--apple-gray-1)]">
                                {row.map((cell, ci) => (
                                  <td key={ci} className="p-2 border-r border-[var(--apple-gray-2)] last:border-none">
                                    <input
                                      value={cell}
                                      onChange={e => {
                                        const nc = [...editingTemplate.content]; nc[idx].rows[ri][ci] = e.target.value;
                                        setEditingTemplate({ ...editingTemplate, content: nc });
                                      }}
                                      className="w-full bg-transparent outline-none text-center text-[14px]"
                                    />
                                  </td>
                                ))}
                                <td className="p-2 text-center">
                                  <button
                                    onClick={() => {
                                      const nc = [...editingTemplate.content]; nc[idx].rows.splice(ri, 1);
                                      setEditingTemplate({ ...editingTemplate, content: nc });
                                    }}
                                    className="text-[var(--apple-gray-4)] hover:text-red-500"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <button
                          onClick={() => {
                            const nc = [...editingTemplate.content]; nc[idx].rows.push(Array(block.headers.length).fill(''));
                            setEditingTemplate({ ...editingTemplate, content: nc });
                          }}
                          className="w-full py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--emerald)] hover:bg-[var(--emerald-light)] transition-colors"
                        >
                          + Add Row
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* VIEW: DRAFTING */}
        {view === 'drafting' && (
          <div className="flex h-full overflow-hidden">
            {/* Left Input Form */}
            <div className="w-[420px] bg-white border-r border-[var(--apple-gray-2)] flex flex-col overflow-y-auto">
              <div className="p-8 pb-4">
                <button
                  onClick={() => setView('library')}
                  className="flex items-center gap-1 text-[13px] font-semibold text-[var(--emerald)] mb-8 hover:opacity-80"
                >
                  <ChevronLeft size={16} /> Library
                </button>
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
                        <input type="date" name="date" value={formData.date} onChange={handleInputChange} className="apple-input !px-3" />
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
                          <span className="w-5 h-5 rounded flex items-center justify-center bg-[var(--apple-black)] text-white text-[10px] font-bold">{idx + 1}</span>
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
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-[12px]">
                              <thead>
                                <tr>
                                  {block.headers.map((h, hi) => <th key={hi} className="p-2 border-b border-[var(--apple-gray-2)] font-semibold">{h}</th>)}
                                </tr>
                              </thead>
                              <tbody>
                                {block.rows.map((row, ri) => (
                                  <tr key={ri}>
                                    {row.map((cell, ci) => (
                                      <td key={ci} className="p-1">
                                        <input
                                          value={cell}
                                          onChange={e => {
                                            const nc = [...draftContent]; nc[idx].rows[ri][ci] = e.target.value;
                                            setDraftContent(nc);
                                          }}
                                          className="w-full p-2 border border-[var(--apple-gray-2)] rounded bg-white outline-none focus:border-[var(--emerald)] transition-colors"
                                        />
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            <button
                              onClick={() => {
                                const nc = [...draftContent]; nc[idx].rows.push(Array(block.headers.length).fill(''));
                                setDraftContent(nc);
                              }}
                              className="text-[10px] font-bold text-[var(--emerald)] uppercase tracking-widest mt-2 hover:underline"
                            >
                              + Add Row
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Terms */}
                  <div className="space-y-4 pt-4">
                    <h3 className="apple-label border-b border-[var(--apple-gray-2)] pb-2">Terms & Conditions</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {['discount', 'gst', 'payment', 'validity'].map(term => (
                        <div key={term}>
                          <span className="text-[11px] font-semibold text-[var(--apple-gray-5)] uppercase block mb-1">{term}</span>
                          <input name={term} value={formData[term]} onChange={handleInputChange} className="apple-input !px-3" />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Brand Attachment */}
                  {draftRequiresAttachment && (
                    <div className="space-y-4 pt-4">
                      <h3 className="apple-label border-b border-[var(--apple-gray-2)] pb-2">Brand PDF Attachment</h3>
                      <select name="make" value={formData.make} onChange={handleInputChange} className="apple-input cursor-pointer">
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
                <button onClick={generatePDF} disabled={isGenerating} className="btn-black w-full">
                  {isGenerating ? 'Processing...' : <><Download size={18} /> Generate PDF</>}
                </button>
              </div>
            </div>

            {/* Right Live Preview Area */}
            <div className="flex-1 bg-[var(--apple-gray-2)] overflow-y-auto p-12 flex justify-center">
              <div className="scale-[0.85] origin-top">
                <div id="quotation-template">
                  <QuotationTemplate data={formData} content={draftContent} company={companyData} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: HISTORY */}
        {view === 'history' && (
          <div className="h-full overflow-y-auto px-8 py-12 md:px-16 md:py-16">
            <div className="max-w-4xl mx-auto">
              <h1 className="apple-title-1 mb-2">History</h1>
              <p className="apple-subtitle mb-12">Recent quotations generated.</p>

              {quotationHistory.length === 0 ? (
                <div className="text-center py-20 opacity-40">
                  <LayoutDashboard size={48} className="mx-auto mb-4" />
                  <p className="font-semibold text-lg">No history available</p>
                </div>
              ) : (
                <div className="apple-card overflow-hidden">
                  {quotationHistory.map((item, idx) => (
                    <div key={item.id} className="p-6 border-b border-[var(--apple-gray-2)] last:border-0 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-[var(--apple-gray-1)] transition-colors">
                      <div>
                        <h3 className="text-[17px] font-semibold text-[var(--apple-black)]">{item.hospital}</h3>
                        <p className="text-[13px] text-[var(--apple-gray-5)] mt-1 font-medium">{item.templateName} • Ref: {item.ref}</p>
                      </div>
                      <div className="flex items-center gap-4 text-[13px] font-semibold text-[var(--apple-gray-5)]">
                        <span>{item.date}</span>
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
                <label htmlFor="admin-upload" className="btn-black">
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
                  <button onClick={() => setView('library')} className="btn-black w-full">Save Changes</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
