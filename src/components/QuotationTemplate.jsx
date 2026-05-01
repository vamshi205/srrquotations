import React from 'react';

const QuotationTemplate = ({ data, company, template }) => {
  const { hospitalName, address, date, referenceNumber, discount, payment, gst, validity, make } = data;
  const { name: companyName, address: companyAddress, phone: companyPhone, email: companyEmail, website: companyWebsite } = company;

  const formatDate = (dateStr) => {
    if (!dateStr) return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.');
    const [y, m, d] = dateStr.split('-');
    return `${d}.${m}.${y}`;
  };

  return (
    <div id="quotation-template" className="quotation-page bg-white text-black font-['Roboto'] select-none p-[10mm]" style={{ width: '210mm', minHeight: '297mm', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <div className="flex-1">
          <h1 className="text-[20pt] font-bold text-slate-900 leading-tight uppercase tracking-tight whitespace-nowrap">{companyName}</h1>
          <div className="text-[9pt] text-slate-700 font-medium mt-1 leading-relaxed">
            <p>{companyAddress}</p>
            <p>Phone: {companyPhone}</p>
            <p>Email: {companyEmail} | Website: {companyWebsite}</p>
          </div>
        </div>
        <div className="w-[50mm] ml-4 flex justify-end">
          <img src="/logo.png" alt="Logo" className="w-full object-contain max-h-[28mm]" onError={(e) => e.target.style.display = 'none'} />
        </div>
      </div>

      <div className="w-full h-[2px] bg-slate-900 mb-6"></div>

      <div className="flex justify-between items-center mb-6 text-[11pt]">
        <div className="font-bold">Ref No: {referenceNumber}</div>
        <div className="font-bold text-right">Date: {formatDate(date)}</div>
      </div>

      <div className="mb-6 text-[11pt]">
        <p className="font-bold mb-1">To</p>
        <div className="max-w-md">
          <p className="font-bold uppercase text-[12pt] mb-1">{hospitalName || '[HOSPITAL NAME]'}</p>
          <p className="whitespace-pre-wrap">{address || '[HOSPITAL ADDRESS]'}</p>
        </div>
      </div>

      <div className="mb-6 text-center text-[11pt]">
        <p className="font-bold mb-0.5 underline">Sub : Quotation for Orthopedic Implants & instruments</p>
        <p className="font-bold">Kind attn: Department purchase</p>
      </div>

      {/* RENDER DYNAMIC TEMPLATE CONTENT */}
      <div className="flex-1">
        {template ? (
          template.content.map((block, idx) => (
            <div key={idx} className="mb-6 text-[11pt] leading-[1.6]">
              {block.type === 'text' ? (
                <p className="text-justify whitespace-pre-wrap">{block.value}</p>
              ) : (
                <table className="w-full border-collapse border border-slate-300 mt-2">
                  <thead>
                    <tr className="bg-slate-50">
                      {block.headers.map((h, hi) => (
                        <th key={hi} className="border border-slate-300 p-2 text-center font-bold text-[10pt] uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, ri) => (
                      <tr key={ri}>
                        {row.map((cell, ci) => (
                          <td key={ci} className="border border-slate-300 p-2 text-center text-[10pt]">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))
        ) : (
          <div className="p-10 text-slate-300 text-center border-2 border-dashed border-slate-100 rounded-3xl italic">
            Select a template from the sidebar to populate document content
          </div>
        )}
      </div>

      {/* Footer / Terms Section (Remains Static) */}
      <div className="mt-8 border-t border-slate-200 pt-6">
        <p className="font-bold underline mb-3 text-[11pt]">Terms and Conditions:</p>
        <table className="w-full text-[10.5pt] mb-8">
          <tbody>
            <tr><td className="w-32 py-1 font-bold">Make</td><td className="w-4 py-1 text-center">:</td><td className="py-1 uppercase">{make || 'As Per Attachment'}</td></tr>
            <tr><td className="py-1 font-bold">Payment</td><td className="py-1 text-center">:</td><td className="py-1">{payment}</td></tr>
            <tr><td className="py-1 font-bold">GST</td><td className="py-1 text-center">:</td><td className="py-1">{gst}</td></tr>
            <tr><td className="py-1 font-bold">Discount</td><td className="py-1 text-center">:</td><td className="py-1"><span className="bg-yellow-200 font-bold px-1.5 border border-yellow-400">{discount} on MRP Price</span></td></tr>
            <tr><td className="py-1 font-bold">Validity</td><td className="py-1 text-center">:</td><td className="py-1">{validity}</td></tr>
          </tbody>
        </table>

        <div className="flex justify-between items-end">
          <div className="flex-1">
            <p className="font-bold underline mb-2 text-[10pt]">Bank Details:</p>
            <div className="grid grid-cols-1 text-[9pt] leading-snug">
              <p><span className="font-bold">Name:</span> <span className="uppercase">{companyName}</span></p>
              <p><span className="font-bold">Bank:</span> HDFC, KALYAN NAGAR | <span className="font-bold">A/C:</span> 50200095456569</p>
              <p><span className="font-bold">IFSC:</span> HDFC0004348</p>
            </div>
          </div>
          <div className="text-center w-64">
            <p className="font-bold text-[10pt]">For {companyName.toUpperCase()}</p>
            <div className="h-16"></div>
            <p className="font-bold text-[11pt]">(A. Padmavathi)</p>
            <p className="text-[9pt] font-medium italic">Proprietor</p>
          </div>
        </div>
      </div>

    </div>
  );
};

export default QuotationTemplate;
