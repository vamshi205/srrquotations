import React from 'react';

const QuotationTemplate = ({ id = "quotation-template", data, company, content }) => {
  const { hospitalName, address, date, referenceNumber, discount, payment, gst, validity, make, delivery, subject } = data;
  const { name: companyName, address: companyAddress, phone: companyPhone, email: companyEmail, website: companyWebsite } = company;

  const numberToWords = (num) => {
    if (num === 0) return 'Zero';
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    if ((num = num.toString()).length > 9) return 'overflow';
    const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return;
    let str = '';
    str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
    str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
    str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
    str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
    str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
    return str.trim() + ' Only';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    if (dateStr.includes('-')) {
      const [y, m, d] = dateStr.split('-');
      return `${d}/${m}/${y}`;
    }
    return dateStr.replace(/\./g, '/');
  };

  const containerRef = React.useRef(null);
  const contentRef = React.useRef(null);
  const [scale, setScale] = React.useState(1);

  React.useLayoutEffect(() => {
    if (!containerRef.current || !contentRef.current) return;
    
    contentRef.current.style.transform = 'none';
    contentRef.current.style.width = '100%';
    
    const style = window.getComputedStyle(containerRef.current);
    const paddingTop = parseFloat(style.paddingTop) || 0;
    const paddingBottom = parseFloat(style.paddingBottom) || 0;
    
    const availableHeight = containerRef.current.clientHeight - paddingTop - paddingBottom;
    const contentHeight = contentRef.current.scrollHeight;
    
    if (contentHeight > availableHeight && availableHeight > 0) {
      const newScale = availableHeight / contentHeight;
      setScale(newScale * 0.995);
    } else {
      setScale(1);
    }
  }, [data, company, content]);

  return (
    <div id={id} ref={containerRef} className="quotation-page bg-white text-black font-sans select-none p-[10mm]" style={{ width: '210mm', height: '297mm', maxHeight: '297mm', overflow: 'hidden', position: 'relative' }}>
      <div 
        ref={contentRef} 
        style={{ 
          transform: `scale(${scale})`, 
          transformOrigin: 'top left', 
          width: `${100 / scale}%`,
          display: 'flex', 
          flexDirection: 'column',
          minHeight: '100%'
        }}
      >
      
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <div className="flex-1">
          <h1 className="text-[20pt] font-bold text-slate-900 leading-tight uppercase whitespace-nowrap">{companyName}</h1>
          <div className="text-[9pt] text-slate-700 font-medium mt-1 leading-[1.15]">
            <p>{companyAddress}</p>
            <p>Phone: {companyPhone}</p>
            <p>Email: {companyEmail} | Website: {companyWebsite}</p>
          </div>
        </div>
        <div className="w-[50mm] ml-4 flex justify-end">
          <img src="/logo.png" alt="Logo" className="w-full object-contain max-h-[28mm]" onError={(e) => e.target.style.display = 'none'} />
        </div>
      </div>

      <div className="w-full h-[1.5px] bg-slate-900 mb-3"></div>

      <div className="flex justify-between items-center mb-3 text-[11pt]">
        <div className="font-bold">Ref No: {referenceNumber}</div>
        <div className="font-bold text-right">Date: {formatDate(date)}</div>
      </div>

      <div className="mb-3 text-[11pt]">
        <p className="font-bold mb-1">To</p>
        <div className="max-w-md">
          <p className="font-bold uppercase text-[12pt] mb-1">{hospitalName || '[HOSPITAL NAME]'}</p>
          <div className="text-left">
            {(address || '[HOSPITAL ADDRESS]').split('\n').map((line, i) => (
              <React.Fragment key={i}>{line}<br/></React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-4 text-center text-[11pt]">
        <p className="font-bold mb-0.5 underline">Sub : {(subject || 'Quotation for Orthopedic Implants & instruments').replace(/^Sub\s*:\s*/i, '')}</p>
        <p className="font-bold">Kind attn: Department purchase</p>
      </div>

      {/* RENDER DYNAMIC TEMPLATE CONTENT */}
      <div className="mb-2">
        {content && content.length > 0 ? (
          content.map((block, idx) => (
            <div key={idx} className="mb-4 text-[11pt] leading-[1.5]">
              {block.type === 'text' ? (
                <div className="text-left">
                  {(block.value || '').split('\n').map((line, i) => (
                    <React.Fragment key={i}>{line}<br/></React.Fragment>
                  ))}
                </div>
              ) : (
                <table className="w-full border-collapse mt-2" style={{ border: '1px solid #111' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f4f4f6' }}>
                      {block.headers.map((h, hi) => (
                        <th key={hi} className="py-1 px-2 text-center font-bold text-[10pt] uppercase" style={{ border: '1px solid #111' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, ri) => (
                      <tr key={ri}>
                        {row.map((cell, ci) => (
                          <td key={ci} className="py-1 px-2 text-center text-[10pt]" style={{ border: '1px solid #111' }}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                    {(() => {
                      const headers = block.headers.map(h => h.toLowerCase());
                      const amountIdx = headers.findIndex(h => h === 'amount' || h === 'total');
                      if (amountIdx === -1) return null;

                      const subtotal = block.rows.reduce((sum, row) => sum + (parseFloat(row[amountIdx]) || 0), 0);
                      if (subtotal === 0) return null;

                      const gstStr = data.gst ? data.gst.toString() : '0';
                      const gstMatch = gstStr.match(/\d+(\.\d+)?/);
                      const gstPercent = gstMatch ? parseFloat(gstMatch[0]) : 0;
                      const gstAmount = subtotal * (gstPercent / 100);
                      const grandTotal = subtotal + gstAmount;
                      const roundedTotal = Math.round(grandTotal);

                      return (
                        <>
                          <tr>
                            <td colSpan={block.headers.length - 1} className="py-1 px-2 text-right font-bold text-[10pt]" style={{ border: '1px solid #111' }}>Subtotal</td>
                            <td className="py-1 px-2 text-center font-bold text-[10pt]" style={{ border: '1px solid #111' }}>{subtotal.toFixed(2).replace(/\.00$/, '')}</td>
                          </tr>
                          {gstPercent > 0 && (
                            <tr>
                              <td colSpan={block.headers.length - 1} className="py-1 px-2 text-right font-bold text-[10pt]" style={{ border: '1px solid #111' }}>GST ({gstStr})</td>
                              <td className="py-1 px-2 text-center font-bold text-[10pt]" style={{ border: '1px solid #111' }}>{gstAmount.toFixed(2).replace(/\.00$/, '')}</td>
                            </tr>
                          )}
                          <tr>
                            <td colSpan={block.headers.length - 1} className="py-1 px-2 text-right font-bold text-[10pt]" style={{ border: '1px solid #111', backgroundColor: '#f4f4f6' }}>Grand Total</td>
                            <td className="py-1 px-2 text-center font-bold text-[10pt]" style={{ border: '1px solid #111', backgroundColor: '#f4f4f6' }}>{roundedTotal.toFixed(2).replace(/\.00$/, '')}</td>
                          </tr>
                          <tr>
                            <td colSpan={block.headers.length} className="py-1 px-2 text-left font-bold text-[10pt] italic" style={{ border: '1px solid #111' }}>
                              Amount in Words: Rupees {numberToWords(roundedTotal)}
                            </td>
                          </tr>
                        </>
                      );
                    })()}
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
      <div className="mt-4 border-t border-slate-200 pt-4">
        <p className="font-bold underline mb-2 text-[11pt]">Terms and Conditions:</p>
        <table className="w-full text-[11pt] leading-[1.5] mb-3">
          <tbody>
            {make && <tr><td className="w-32 font-bold">Make</td><td className="w-4 text-center">:</td><td className="uppercase">{make}</td></tr>}
            {delivery && <tr><td className="w-32 font-bold">Delivery</td><td className="w-4 text-center">:</td><td>{delivery}</td></tr>}
            {payment && <tr><td className="w-32 font-bold">Payment</td><td className="w-4 text-center">:</td><td>{payment}</td></tr>}
            {gst && <tr><td className="w-32 font-bold">GST</td><td className="w-4 text-center">:</td><td>{gst}</td></tr>}
            {discount && <tr><td className="w-32 font-bold">Discount</td><td className="w-4 text-center">:</td><td><span className="bg-yellow-200 font-bold px-1.5 border border-yellow-400">{discount} on MRP Price</span></td></tr>}
            {validity && <tr><td className="w-32 font-bold">Validity</td><td className="w-4 text-center">:</td><td>{formatDate(validity)}</td></tr>}
          </tbody>
        </table>

        <div className="mb-4 text-[11pt] leading-[1.5]">
          <p>We look forward to receive your valuable orders assuring you the best service all the time.</p>
          <p>Thanking you,</p>
        </div>

        <div className="flex justify-between items-end">
          <div className="flex-1">
            <p className="font-bold underline mb-2 text-[10pt]">Bank Details:</p>
            <div className="grid grid-cols-1 text-[9pt] leading-[1.15]">
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
    </div>
  );
};

export default QuotationTemplate;
