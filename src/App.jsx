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
  ToggleLeft,
  ToggleRight,
  Edit2,
  UploadCloud,
  Clock,
  LayoutDashboard,
  ShieldCheck,
  Eye,
  FilePlus2,
  Building2,
  FileUp,
  Save,
  Trash
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

  const SidebarItem = ({ icon: Icon, label, id, active }) => (
    <button 
      onClick={() => setView(id)}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all group"
      style={{
        backgroundColor: active ? 'var(--emerald)' : 'transparent',
        color: active ? 'var(--white)' : 'var(--muted)',
        boxShadow: active ? '0 4px 6px var(--emerald-light)' : 'none'
      }}
    >
      <Icon size={20} style={{ color: active ? 'var(--white)' : 'var(--emerald)' }} />
      <span className="font-bold text-sm tracking-tight">{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-[#FDFDFF] text-slate-800 font-sans overflow-hidden">
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-[300px] bg-white border-r border-slate-100 flex flex-col p-8 z-50">
        <div className="flex items-center gap-3 mb-12 px-2">
           <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg">
             <FileUp className="text-white w-5 h-5" />
           </div>
           <span className="font-black text-2xl tracking-tight text-slate-900">OrthoGen</span>
        </div>

        <div className="flex-1 space-y-3">
           <SidebarItem icon={LayoutDashboard} label="Library" id="library" active={view === 'library'} />
           <SidebarItem icon={Clock} label="History" id="history" active={view === 'history'} />
           <SidebarItem icon={Building2} label="Manufacturers" id="admin" active={view === 'admin'} />
           <button
             onClick={() => {
               setEditingTemplate({
                 id: Date.now().toString(),
                 name: 'New Template',
                 description: 'Custom quotation structure.',
                 requiresAttachment: true,
                 subject: 'Sub : Quotation for Orthopedic Implants & instruments',
                 defaultDiscount: '40%',
                 defaultGst: '5%',
                 defaultPayment: '30 days',
                 defaultValidity: '31.03.2027',
                 content: []
               });
               setView('builder');
             }}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all group ${view === 'builder' ? ' text-white shadow-xl shadow-indigo-100' : 'text-slate-400 hover:bg-indigo-50 hover:text-indigo-600'}`}
           >
             <Plus size={20} className={view === 'builder' ? 'text-white' : 'group-hover:text-indigo-600'} />
             <span className="font-bold text-sm tracking-tight">New Template</span>
           </button>
        </div>

        <div className="pt-8 border-t border-slate-50 space-y-3">
           <SidebarItem icon={Settings} label="Company Settings" id="settings" active={view === 'settings'} />
        </div>
      </aside>

      {/* VIEWPORT CONTENT */}
      <main className="flex-1 overflow-hidden relative flex flex-col">
        
        {/* VIEW: LIBRARY */}
        {view === 'library' && (
          <div className="flex-1 overflow-y-auto p-16 bg-[#F8FAFC]">
             <div className="max-w-5xl mx-auto">
                <header className="mb-14">
                   <h1 className="text-5xl font-black text-slate-900 mb-3 tracking-tighter">Library</h1>
                   <p className="text-slate-500 text-lg font-medium">Choose a professional structure to start your document.</p>
                </header>

                <div className="grid grid-cols-2 gap-10">
                   {templates.map(t => (
                      <LibraryCard
                        key={t.id}
                        template={t}
                        onUse={useTemplate}
                        onEdit={(template) => { setEditingTemplate(template); setView('builder'); }}
                        onDelete={(id) => setTemplates(templates.filter(t => t.id !== id))}
                      />
                   ))}
                </div>
             </div>
          </div>
        )}

        {/* VIEW: ADMIN / MANUFACTURERS */}
        {view === 'admin' && (
          <div className="flex-1 overflow-y-auto p-16 bg-white">
             <div className="max-w-4xl mx-auto">
                <header className="mb-14">
                   <h1 className="text-5xl font-black text-slate-900 mb-3 tracking-tighter">Manufacturers</h1>
                   <p className="text-slate-500 text-lg font-medium">Manage and upload manufacturer PDF price lists.</p>
                </header>

                 <div className="bg-white p-12 rounded-3xl border-2 border-slate-900 mb-10 text-center">
                    <div className="w-20 h-20 bg-slate-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-6">
                       <UploadCloud size={40} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 mb-2">Upload Price List</h2>
                    <p className="text-slate-500 font-medium mb-8">Select a PDF price list to map it to a brand name.</p>
                    
                    <input type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" id="admin-upload" />
                    <label htmlFor="admin-upload" className="inline-flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-black transition-all cursor-pointer border-2 border-slate-900">
                       <Plus size={20} /> Select PDF File
                    </label>
                 </div>

                 <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Linked Price Lists ({attachments.length})</h3>
                    {attachments.map(att => (
                      <div key={att.id} className="flex items-center justify-between p-6 bg-white border-2 border-slate-900 rounded-2xl hover:bg-slate-50 transition-all group">
                         <div className="flex items-center gap-5">
                            <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center">
                               <Building2 size={24} />
                            </div>
                           <div>
                              <p className="font-black text-slate-900 text-xl uppercase tracking-tight">{att.label}</p>
                              <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">{att.fileName || 'BRAND_ATTACHMENT.pdf'}</p>
                           </div>
                        </div>
                        <button onClick={() => setAttachments(attachments.filter(a => a.id !== att.id))} className="w-12 h-12 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all">
                           <Trash2 size={24} />
                        </button>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        )}

        {/* VIEW: DRAFTING WORKSPACE (CRASH FIXED) */}
        {view === 'drafting' && (
          <div className="flex-1 flex overflow-hidden">
             {/* Editor Pane */}
             <div className="w-[500px] bg-white border-r border-slate-100 flex flex-col p-10 overflow-y-auto">
                <button onClick={() => setView('library')} className="flex items-center gap-2 text-indigo-400 font-black text-[11px] uppercase tracking-widest mb-12 hover:text-indigo-600 transition-all">
                   <ChevronLeft size={16} /> Close Workspace
                </button>

                <div className="space-y-12 flex-1 pb-20">
                   <section className="space-y-8">
                      <h2 className="flex items-center gap-4 text-slate-900 font-black text-xs uppercase tracking-widest px-2">
                         <div className="w-8 h-8  text-white rounded-lg flex items-center justify-center shadow-lg shadow-indigo-100">1</div> Recipient Details
                      </h2>
                      <div className="space-y-5">
                         <div className="space-y-2">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">Hospital Name</label>
                            <input name="hospitalName" value={formData.hospitalName} onChange={handleInputChange} className="w-full px-5 py-4 border-2 border-slate-100 rounded-2xl text-base font-bold focus:border-indigo-600 outline-none transition-all" placeholder="Enter name..." />
                         </div>
                         <div className="space-y-2">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">Address</label>
                            <textarea name="address" value={formData.address} onChange={handleInputChange} rows="2" className="w-full px-5 py-4 border-2 border-slate-100 rounded-2xl text-sm font-medium focus:border-indigo-600 outline-none transition-all resize-none" placeholder="Full address..." />
                         </div>
                      </div>
                   </section>

                   <section className="space-y-8">
                      <h2 className="flex items-center gap-4 text-slate-900 font-black text-xs uppercase tracking-widest px-2">
                         <div className="w-8 h-8  text-white rounded-lg flex items-center justify-center shadow-lg shadow-indigo-100">2</div> Quotation Data
                      </h2>
                      <div className="space-y-5">
                         <div className="space-y-2">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">Subject</label>
                            <textarea name="subject" value={formData.subject} onChange={handleInputChange} rows="2" className="w-full px-5 py-4 bg-indigo-50/50 border-2 border-indigo-100 rounded-2xl text-sm font-bold text-indigo-900 outline-none focus:border-indigo-600 resize-none" />
                         </div>
                         
                         {draftRequiresAttachment && (
                            <div className="space-y-2">
                               <label className="text-[11px] font-black text-indigo-400 uppercase tracking-widest px-1">Attachment (Brand)</label>
                               <select name="make" value={formData.make} onChange={handleInputChange} className="w-full px-5 py-4  text-white border-none rounded-2xl text-sm font-black outline-none cursor-pointer shadow-xl shadow-indigo-200">
                                  <option value="">-- NO ATTACHMENT --</option>
                                  {attachments.map(a => <option key={a.id} value={a.label}>{a.label}</option>)}
                               </select>
                            </div>
                         )}

                         <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                               <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">Discount%</label>
                               <input name="discount" value={formData.discount} onChange={handleInputChange} className="w-full px-5 py-3 border-2 border-slate-100 rounded-2xl text-xs font-bold" />
                            </div>
                            <div className="space-y-2">
                               <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">GST%</label>
                               <input name="gst" value={formData.gst} onChange={handleInputChange} className="w-full px-5 py-3 border-2 border-slate-100 rounded-2xl text-xs font-bold" />
                            </div>
                         </div>
                      </div>
                   </section>

                   <section className="space-y-8">
                      <h2 className="flex items-center gap-4 text-slate-900 font-black text-xs uppercase tracking-widest px-2">
                         <div className="w-8 h-8  text-white rounded-lg flex items-center justify-center shadow-lg shadow-indigo-100">3</div> Content
                      </h2>
                      <div className="space-y-6">
                         {draftContent.map((block, bIdx) => (
                           <div key={bIdx} className="space-y-2 px-1">
                              {block.type === 'text' ? (
                                <textarea value={block.value} onChange={(e) => {
                                   const nc = [...draftContent]; nc[bIdx].value = e.target.value; setDraftContent(nc);
                                }} className="w-full p-5 border-2 border-slate-100 rounded-3xl text-sm font-medium leading-relaxed outline-none focus:border-indigo-600 min-h-[140px] shadow-sm" />
                              ) : (
                                <div className="space-y-2">
                                   {block.rows.map((row, rIdx) => (
                                     <div key={rIdx} className="grid grid-cols-4 gap-1.5">
                                        {row.map((cell, cIdx) => (
                                          <input key={cIdx} value={cell} onChange={(e) => {
                                             const nc = [...draftContent]; nc[bIdx].rows[rIdx][cIdx] = e.target.value; setDraftContent(nc);
                                          }} className="w-full px-2 py-3 bg-white border border-slate-100 rounded-xl text-[10px] font-bold outline-none focus:border-indigo-400" />
                                        ))}
                                     </div>
                                   ))}
                                </div>
                              )}
                           </div>
                         ))}
                      </div>
                   </section>
                </div>

                <div className="pt-8 border-t border-slate-50 sticky bottom-0 bg-white pb-6 px-2">
                    <button onClick={generatePDF} disabled={isGenerating} className="w-full bg-slate-900 hover:bg-black text-white font-black py-5 rounded-3xl text-xs tracking-widest uppercase shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95 border-2 border-slate-900">
                       {isGenerating ? 'Processing...' : <><Download size={20} /> Generate Final PDF</>}
                    </button>
                </div>
             </div>

             {/* Live Preview Pane */}
             <div className="flex-1 bg-slate-50/50 flex flex-col items-center justify-center p-12 overflow-auto">
                <div className="bg-white px-8 py-3 rounded-full mb-10 shadow-lg border border-slate-100 font-black text-indigo-600 text-[11px] uppercase tracking-widest flex items-center gap-2">
                   <Eye size={16} /> Real-Time A4 Document Preview
                </div>
                <div className="shadow-[0_60px_120px_-30px_rgba(0,0,0,0.2)] scale-[0.75] origin-center bg-white">
                   <QuotationTemplate data={formData} company={companyData} template={{ content: draftContent }} />
                </div>
             </div>
          </div>
        )}

        {/* VIEW: HISTORY */}
        {view === 'history' && (
           <div className="flex-1 overflow-y-auto p-16 bg-[#FDFDFF]">
              <div className="max-w-5xl mx-auto">
                 <header className="mb-14">
                    <h1 className="text-5xl font-black text-slate-900 mb-3 tracking-tighter">History</h1>
                    <p className="text-slate-500 text-lg font-medium">Your recent quotations and documents.</p>
                 </header>
                 <div className="bg-white rounded-[40px] border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden">
                    <table className="w-full text-left">
                       <thead className="bg-slate-50 border-b border-slate-100">
                          <tr>
                             <th className="p-8 text-[11px] font-black text-slate-300 uppercase tracking-widest">Hospital Name</th>
                             <th className="p-8 text-[11px] font-black text-slate-300 uppercase tracking-widest">Reference</th>
                             <th className="p-8 text-[11px] font-black text-slate-300 uppercase tracking-widest">Date</th>
                             <th className="p-8"></th>
                          </tr>
                       </thead>
                       <tbody>
                          {quotationHistory.map(h => (
                            <tr key={h.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                               <td className="p-8 font-black text-slate-900 uppercase text-base tracking-tight">{h.hospital}</td>
                               <td className="p-8 text-indigo-600 font-black text-sm tracking-tight">{h.ref}</td>
                               <td className="p-8 text-slate-400 font-bold text-xs uppercase">{h.date}</td>
                               <td className="p-8 text-right">
                                  <button onClick={() => setQuotationHistory(quotationHistory.filter(i => i.id !== h.id))} className="text-slate-200 hover:text-red-500 transition-colors"><Trash2 size={24}/></button>
                               </td>
                            </tr>
                          ))}
                       </tbody>
                    </table>
                    {quotationHistory.length === 0 && <div className="p-24 text-center text-slate-200 italic font-black uppercase text-xs tracking-widest">No quotations yet.</div>}
                 </div>
              </div>
           </div>
        )}

        {/* VIEW: SETTINGS */}
        {view === 'settings' && (
           <div className="flex-1 p-20 max-w-2xl mx-auto w-full">
              <header className="mb-14">
                 <h1 className="text-5xl font-black text-slate-900 mb-3 tracking-tighter uppercase">Identity</h1>
                 <p className="text-slate-500 text-lg font-medium">Business details for the letterhead.</p>
              </header>
              <div className="bg-white rounded-[50px] p-12 border border-slate-100 shadow-2xl space-y-10">
                 <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-2">Business Name</label>
                    <input type="text" value={companyData.name} onChange={(e) => setCompanyData({...companyData, name: e.target.value})} className="w-full px-6 py-5 border-2 border-slate-100 rounded-3xl text-xl font-black focus:border-indigo-600 outline-none transition-all" />
                 </div>
                 <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-2">Full Address</label>
                    <textarea value={companyData.address} onChange={(e) => setCompanyData({...companyData, address: e.target.value})} rows="3" className="w-full px-6 py-5 border-2 border-slate-100 rounded-3xl text-lg font-bold focus:border-indigo-600 outline-none resize-none transition-all" />
                 </div>
                  <button onClick={() => setView('library')} className="w-full bg-slate-900 text-white font-black py-6 rounded-3xl text-sm tracking-widest uppercase shadow-xl hover:bg-black transition-all border-2 border-slate-900">Apply Changes</button>
              </div>
           </div>
        )}

        {/* VIEW: BUILDER — Full Template Designer */}
        {view === 'builder' && (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">

            {/* ── Mobile sticky top bar ── */}
            <div className="md:hidden flex items-center justify-between bg-white border-b border-slate-100 px-5 py-4 sticky top-0 z-10 shadow-sm">
              <button
                onClick={() => { setEditingTemplate(null); setView('library'); }}
                className="flex items-center gap-2 font-bold text-sm uppercase tracking-widest"
                style={{ color: 'var(--emerald)' }}
              >
                <ChevronLeft size={18} /> Back
              </button>
              <span className="font-black text-slate-800 text-base">Template Designer</span>
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
                className="text-white text-xs font-black px-4 py-2 rounded-xl uppercase tracking-widest"
                style={{ background: 'var(--emerald)' }}
              >
                Save
              </button>
            </div>

            {/* ── Left Config Panel (white card on desktop, hidden on mobile) ── */}
            <div className="hidden md:flex w-[360px] bg-white border-r border-slate-100 flex-col p-8 overflow-y-auto shadow-sm">
              {/* Header */}
              <button
                onClick={() => { setEditingTemplate(null); setView('library'); }}
                className="flex items-center gap-2 font-bold text-[11px] uppercase tracking-widest mb-10 transition-all"
                style={{ color: 'var(--emerald)' }}
              >
                <ChevronLeft size={16} /> Cancel
              </button>

              <div className="flex items-center gap-3 mb-8">
                <div className="w-1.5 h-7 rounded-full" style={{ background: 'var(--emerald)' }}></div>
                <h2 className="text-xl font-black text-slate-900">Template Designer</h2>
              </div>

              <div className="space-y-6 flex-1">
                {/* Name */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Template Name</label>
                  <input
                    type="text"
                    value={editingTemplate?.name || ''}
                    onChange={e => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold text-slate-800 outline-none transition-all"
                    style={{ '--tw-ring-color': 'var(--emerald)' }}
                    onFocus={e => e.target.style.borderColor = 'var(--emerald)'}
                    onBlur={e => e.target.style.borderColor = '#f1f5f9'}
                    placeholder="e.g. Standard Implants"
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</label>
                  <input
                    type="text"
                    value={editingTemplate?.description || ''}
                    onChange={e => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-medium text-slate-800 outline-none transition-all"
                    onFocus={e => e.target.style.borderColor = 'var(--emerald)'}
                    onBlur={e => e.target.style.borderColor = '#f1f5f9'}
                    placeholder="Short description"
                  />
                </div>

                {/* Default Subject */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Default Subject</label>
                  <textarea
                    rows="2"
                    value={editingTemplate?.subject || ''}
                    onChange={e => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-medium text-slate-800 outline-none resize-none transition-all"
                    onFocus={e => e.target.style.borderColor = 'var(--emerald)'}
                    onBlur={e => e.target.style.borderColor = '#f1f5f9'}
                  />
                </div>

                {/* Default Terms */}
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Default Terms</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Discount', key: 'defaultDiscount' },
                      { label: 'GST', key: 'defaultGst' },
                      { label: 'Payment', key: 'defaultPayment' },
                      { label: 'Validity', key: 'defaultValidity' },
                    ].map(({ label, key }) => (
                      <div key={key} className="space-y-1">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">{label}</span>
                        <input
                          value={editingTemplate?.[key] || ''}
                          onChange={e => setEditingTemplate({ ...editingTemplate, [key]: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-100 rounded-lg text-xs font-bold text-slate-700 outline-none transition-all"
                          onFocus={e => e.target.style.borderColor = 'var(--emerald)'}
                          onBlur={e => e.target.style.borderColor = '#f1f5f9'}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Attachment Toggle */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border-2 border-slate-100">
                  <label className="text-xs font-bold text-slate-600">Needs Attachment?</label>
                  <button
                    onClick={() => setEditingTemplate({ ...editingTemplate, requiresAttachment: !editingTemplate?.requiresAttachment })}
                    style={{ color: editingTemplate?.requiresAttachment ? 'var(--emerald)' : '#cbd5e1' }}
                    className="transition-colors"
                  >
                    {editingTemplate?.requiresAttachment ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                  </button>
                </div>

                {/* Add Blocks */}
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Add Section</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setEditingTemplate({ ...editingTemplate, content: [...(editingTemplate?.content || []), { type: 'text', value: '' }] })}
                      className="bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl flex flex-col items-center gap-2 transition-all group"
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--emerald)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = '#f1f5f9'}
                    >
                      <Type size={18} className="text-slate-400 group-hover:text-emerald-600 transition-colors" />
                      <span className="text-[10px] font-black uppercase text-slate-400 group-hover:text-emerald-600 transition-colors">Text Block</span>
                    </button>
                    <button
                      onClick={() => setEditingTemplate({ ...editingTemplate, content: [...(editingTemplate?.content || []), { type: 'table', headers: ['S.No', 'Item', 'Qty', 'MRP'], rows: [['1', '', '1', '']] }] })}
                      className="bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl flex flex-col items-center gap-2 transition-all group"
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--emerald)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = '#f1f5f9'}
                    >
                      <TableIcon size={18} className="text-slate-400 group-hover:text-emerald-600 transition-colors" />
                      <span className="text-[10px] font-black uppercase text-slate-400 group-hover:text-emerald-600 transition-colors">Table Block</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Save Button */}
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
                className="mt-10 w-full text-white font-black py-5 rounded-2xl text-xs tracking-widest uppercase transition-all active:scale-95 flex items-center justify-center gap-2"
                style={{ background: 'var(--emerald)', boxShadow: '0 8px 24px rgba(5,150,105,0.25)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--emerald-dark)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--emerald)'}
              >
                <Save size={16} /> Save to Library
              </button>
            </div>

            {/* ── Designer Canvas ── */}
            <div className="flex-1 bg-[#F8FAFC] overflow-y-auto p-6 md:p-12">
              <div className="max-w-3xl mx-auto space-y-6">

                {/* Canvas header (desktop only) */}
                <div className="hidden md:flex items-center justify-between mb-2">
                  <div>
                    <h1 className="text-2xl font-black text-slate-900">
                      {editingTemplate?.name || 'New Template'}
                    </h1>
                    <p className="text-slate-400 text-sm font-medium mt-1">Add sections below to build your quotation structure.</p>
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest px-4 py-2 rounded-full text-white" style={{ background: 'var(--emerald)' }}>
                    {(editingTemplate?.content || []).length} sections
                  </span>
                </div>

                {/* Mobile: add block buttons visible below top bar */}
                <div className="md:hidden grid grid-cols-2 gap-3 mb-2">
                  <button
                    onClick={() => setEditingTemplate({ ...editingTemplate, content: [...(editingTemplate?.content || []), { type: 'text', value: '' }] })}
                    className="flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-slate-200 bg-white text-xs font-black uppercase text-slate-500"
                  >
                    <Type size={16} /> Text Block
                  </button>
                  <button
                    onClick={() => setEditingTemplate({ ...editingTemplate, content: [...(editingTemplate?.content || []), { type: 'table', headers: ['S.No', 'Item', 'Qty', 'MRP'], rows: [['1', '', '1', '']] }] })}
                    className="flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-slate-200 bg-white text-xs font-black uppercase text-slate-500"
                  >
                    <TableIcon size={16} /> Table Block
                  </button>
                </div>

                {(editingTemplate?.content || []).length === 0 && (
                  <div className="flex flex-col items-center justify-center py-32 text-slate-300">
                    <Database size={48} className="mb-4" />
                    <p className="font-bold text-sm uppercase tracking-widest">No sections yet</p>
                    <p className="text-xs mt-1 text-slate-400">Use the panel to add Text or Table blocks</p>
                  </div>
                )}

                {(editingTemplate?.content || []).map((block, idx) => (
                  <div key={idx} className="bg-white rounded-3xl border-2 border-slate-100 p-6 md:p-8 relative group shadow-sm hover:shadow-md hover:border-emerald-100 transition-all">
                    {/* Delete block */}
                    <button
                      onClick={() => {
                        const nc = [...editingTemplate.content]; nc.splice(idx, 1);
                        setEditingTemplate({ ...editingTemplate, content: nc });
                      }}
                      className="absolute -top-3 -right-3 w-8 h-8 bg-white border border-slate-200 text-slate-300 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:text-red-500 hover:border-red-200 shadow-lg transition-all"
                    >
                      <Trash2 size={14} />
                    </button>

                    <div className="flex items-center gap-2 mb-5">
                      <div className="w-1.5 h-5 rounded-full" style={{ background: 'var(--emerald)' }}></div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Section {idx + 1} — {block.type === 'text' ? 'Text Block' : 'Table Block'}
                      </span>
                    </div>

                    {block.type === 'text' ? (
                      <textarea
                        value={block.value}
                        onChange={e => {
                          const nc = [...editingTemplate.content]; nc[idx].value = e.target.value;
                          setEditingTemplate({ ...editingTemplate, content: nc });
                        }}
                        className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-normal leading-relaxed outline-none min-h-[140px] transition-all resize-none"
                        onFocus={e => e.target.style.borderColor = 'var(--emerald)'}
                        onBlur={e => e.target.style.borderColor = '#f1f5f9'}
                        placeholder="Type the paragraph content for this section..."
                      />
                    ) : (
                      <div className="border-2 border-slate-100 rounded-2xl overflow-hidden">
                        <table className="w-full border-collapse">
                          <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                              {block.headers.map((h, hi) => (
                                <th key={hi} className="p-3 border-r border-slate-100 last:border-none">
                                  <input
                                    value={h}
                                    onChange={e => {
                                      const nc = [...editingTemplate.content]; nc[idx].headers[hi] = e.target.value;
                                      setEditingTemplate({ ...editingTemplate, content: nc });
                                    }}
                                    className="w-full bg-transparent outline-none font-black text-center text-[10px] uppercase tracking-wider text-slate-600"
                                  />
                                </th>
                              ))}
                              <th className="w-8 bg-slate-50"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {block.rows.map((row, ri) => (
                              <tr key={ri} className="border-b border-slate-100 last:border-none hover:bg-slate-50/50">
                                {row.map((cell, ci) => (
                                  <td key={ci} className="p-2 border-r border-slate-100 last:border-none">
                                    <input
                                      value={cell}
                                      onChange={e => {
                                        const nc = [...editingTemplate.content]; nc[idx].rows[ri][ci] = e.target.value;
                                        setEditingTemplate({ ...editingTemplate, content: nc });
                                      }}
                                      className="w-full bg-transparent outline-none text-center text-sm font-medium text-slate-700"
                                    />
                                  </td>
                                ))}
                                <td className="p-2 text-center">
                                  <button
                                    onClick={() => {
                                      const nc = [...editingTemplate.content]; nc[idx].rows.splice(ri, 1);
                                      setEditingTemplate({ ...editingTemplate, content: nc });
                                    }}
                                    className="text-slate-300 hover:text-red-500 transition-colors"
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
                          className="w-full py-3 text-[10px] font-black uppercase tracking-widest transition-all"
                          style={{ color: 'var(--emerald)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--emerald-light)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          + Add Row
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {/* Mobile Save Button */}
                <div className="md:hidden pt-4 pb-8">
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
                    className="w-full text-white font-black py-5 rounded-2xl text-sm tracking-widest uppercase transition-all active:scale-95 flex items-center justify-center gap-2"
                    style={{ background: 'var(--emerald)', boxShadow: '0 8px 24px rgba(5,150,105,0.25)' }}
                  >
                    <Save size={16} /> Save to Library
                  </button>
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
