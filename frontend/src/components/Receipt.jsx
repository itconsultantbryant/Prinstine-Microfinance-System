import React from 'react';

const Receipt = ({ receipt, onClose, onPrint, onDownload }) => {
  if (!receipt) return null;

  const handlePrint = () => {
    window.print();
    if (onPrint) onPrint();
  };

  const handleDownload = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt - ${receipt.transaction_number}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 20px; }
            .details { margin: 20px 0; }
            .row { display: flex; justify-content: space-between; margin: 10px 0; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ccc; text-align: center; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          ${document.getElementById('receipt-content').innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
    if (onDownload) onDownload();
  };

  return (
    <div className="modal fade show" style={{ display: 'block', zIndex: 1060 }} tabIndex="-1">
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Transaction Receipt</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body" id="receipt-content">
            <div className="text-center mb-4">
              <img 
                src="/assets/prinstine_microfinance_logo.png" 
                alt="Prinstine Microfinance Logo" 
                style={{ maxHeight: '60px', marginBottom: '10px' }}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <h4>Prinstine Microfinance Loans and Savings</h4>
              <p className="text-muted">Transaction Receipt</p>
            </div>
            
            <div className="border p-4">
              <div className="row mb-3">
                <div className="col-6">
                  <strong>Receipt Number:</strong><br />
                  {receipt.transaction_number || receipt.receipt_number}
                </div>
                <div className="col-6 text-end">
                  <strong>Date:</strong><br />
                  {new Date(receipt.date || receipt.transaction_date || new Date()).toLocaleString()}
                </div>
              </div>

              {receipt.loan_number && (
                <div className="mb-3">
                  <strong>Loan Number:</strong> {receipt.loan_number}
                </div>
              )}

              {receipt.client_name && (
                <div className="mb-3">
                  <strong>Client:</strong> {receipt.client_name}
                </div>
              )}

              {receipt.account_number && (
                <div className="mb-3">
                  <strong>Account Number:</strong> {receipt.account_number}
                </div>
              )}

              <hr />

              <div className="mb-2">
                <div className="d-flex justify-content-between">
                  <span>Amount:</span>
                  <strong>${parseFloat(receipt.amount || 0).toFixed(2)}</strong>
                </div>
              </div>

              {receipt.principal !== undefined && (
                <div className="mb-2">
                  <div className="d-flex justify-content-between">
                    <span>Principal:</span>
                    <span>${parseFloat(receipt.principal || 0).toFixed(2)}</span>
                  </div>
                </div>
              )}

              {receipt.interest !== undefined && (
                <div className="mb-2">
                  <div className="d-flex justify-content-between">
                    <span>Interest:</span>
                    <span>${parseFloat(receipt.interest || 0).toFixed(2)}</span>
                  </div>
                </div>
              )}

              {receipt.penalty !== undefined && receipt.penalty > 0 && (
                <div className="mb-2">
                  <div className="d-flex justify-content-between">
                    <span>Penalty:</span>
                    <span>${parseFloat(receipt.penalty || 0).toFixed(2)}</span>
                  </div>
                </div>
              )}

              {receipt.outstanding_balance !== undefined && (
                <div className="mb-2">
                  <div className="d-flex justify-content-between">
                    <span>Outstanding Balance:</span>
                    <strong>${parseFloat(receipt.outstanding_balance || 0).toFixed(2)}</strong>
                  </div>
                </div>
              )}

              {receipt.balance !== undefined && (
                <div className="mb-2">
                  <div className="d-flex justify-content-between">
                    <span>Account Balance:</span>
                    <strong>${parseFloat(receipt.balance || 0).toFixed(2)}</strong>
                  </div>
                </div>
              )}

              {receipt.payment_method && (
                <div className="mb-2">
                  <div className="d-flex justify-content-between">
                    <span>Payment Method:</span>
                    <span>{receipt.payment_method.replace('_', ' ').toUpperCase()}</span>
                  </div>
                </div>
              )}

              {receipt.description && (
                <div className="mt-3">
                  <strong>Description:</strong><br />
                  <span className="text-muted">{receipt.description}</span>
                </div>
              )}

              <hr />

              <div className="text-center mt-4">
                <p className="text-muted small">
                  This is a computer-generated receipt. No signature required.
                </p>
                <p className="text-muted small">
                  Thank you for your business!
                </p>
              </div>
            </div>
          </div>
          <div className="modal-footer no-print">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
            <button type="button" className="btn btn-primary" onClick={handlePrint}>
              <i className="fas fa-print me-2"></i>Print
            </button>
            <button type="button" className="btn btn-success" onClick={handleDownload}>
              <i className="fas fa-download me-2"></i>Download PDF
            </button>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" onClick={onClose} style={{ zIndex: 1055 }}></div>
    </div>
  );
};

export default Receipt;

