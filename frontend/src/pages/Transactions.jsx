import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../config/axios';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import Receipt from '../components/Receipt';

const Transactions = () => {
  const { user } = useAuth();
  const printRef = useRef(null);
  const [transactions, setTransactions] = useState([]);
  const [clients, setClients] = useState([]);
  const [loans, setLoans] = useState([]);
  const [savingsAccounts, setSavingsAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [formData, setFormData] = useState({
    client_id: '',
    loan_id: '',
    savings_account_id: '',
    type: 'deposit',
    amount: '',
    currency: 'USD', // Default currency
    description: '',
    transaction_date: new Date().toISOString().split('T')[0]
  });

  // Define all fetch functions before useEffect hooks
  const fetchTransactions = async () => {
    try {
      const response = await apiClient.get('/api/transactions');
      setTransactions(response.data.data.transactions || []);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      toast.error('Failed to load transactions');
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await apiClient.get('/api/clients');
      setClients(response.data.data.clients || []);
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    }
  };

  const fetchLoans = async () => {
    try {
      const response = await apiClient.get('/api/loans');
      setLoans(response.data.data.loans || []);
    } catch (error) {
      console.error('Failed to fetch loans:', error);
    }
  };

  const fetchSavingsAccounts = async () => {
    try {
      const response = await apiClient.get('/api/savings');
      setSavingsAccounts(response.data.data.savingsAccounts || []);
    } catch (error) {
      console.error('Failed to fetch savings accounts:', error);
    }
  };

  useEffect(() => {
    fetchTransactions();
    fetchClients();
    fetchLoans();
    fetchSavingsAccounts();
    
    // Real-time updates every 5 seconds
    const interval = setInterval(() => {
      fetchTransactions();
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // Auto-set currency when loan or client is selected
  useEffect(() => {
    if (formData.loan_id) {
      const selectedLoan = loans.find(l => l.id === parseInt(formData.loan_id));
      if (selectedLoan && selectedLoan.currency) {
        setFormData(prev => ({ ...prev, currency: selectedLoan.currency }));
      }
    } else if (formData.client_id && formData.type === 'due_payment') {
      const selectedClient = clients.find(c => c.id === parseInt(formData.client_id));
      if (selectedClient && selectedClient.dues_currency) {
        setFormData(prev => ({ ...prev, currency: selectedClient.dues_currency }));
      }
    }
  }, [formData.loan_id, formData.client_id, formData.type, loans, clients]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Validate required fields before preparing data
      if (!formData.client_id || formData.client_id === '') {
        toast.error('Please select a client');
        return;
      }
      if (!formData.amount || formData.amount === '' || isNaN(parseFloat(formData.amount)) || parseFloat(formData.amount) <= 0) {
        toast.error('Please enter a valid amount greater than 0');
        return;
      }
      if (!formData.type || formData.type === '') {
        toast.error('Please select a transaction type');
        return;
      }

      // Prepare data for submission - ensure all fields are properly formatted
      const submitData = {
        client_id: parseInt(formData.client_id),
        type: formData.type,
        amount: parseFloat(formData.amount),
        currency: formData.currency || 'USD'
      };

      // Add optional fields only if they have values
      if (formData.loan_id && formData.loan_id !== '') {
        submitData.loan_id = parseInt(formData.loan_id);
      }
      if (formData.savings_account_id && formData.savings_account_id !== '') {
        submitData.savings_account_id = parseInt(formData.savings_account_id);
      }
      if (formData.description && formData.description.trim() !== '') {
        submitData.description = formData.description.trim();
      }
      if (formData.transaction_date) {
        submitData.transaction_date = formData.transaction_date;
      }

      console.log('Submitting transaction:', submitData);
      const response = await apiClient.post('/api/transactions', submitData);
      toast.success('Transaction created successfully!');
      setShowModal(false);
      
      // Generate receipt
      if (response.data.data.receipt) {
        setReceipt(response.data.data.receipt);
      } else {
        // Create receipt from transaction data
        const transaction = response.data.data.transaction;
        setReceipt({
          transaction_number: transaction.transaction_number,
          client_name: transaction.client ? `${transaction.client.first_name} ${transaction.client.last_name}` : '',
          amount: transaction.amount,
          currency: transaction.currency || 'USD',
          date: transaction.transaction_date,
          type: transaction.type,
          description: transaction.description
        });
      }
      
      setFormData({
        client_id: '',
        loan_id: '',
        savings_account_id: '',
        type: 'deposit',
        amount: '',
        currency: 'USD',
        description: '',
        transaction_date: new Date().toISOString().split('T')[0]
      });
      fetchTransactions();
    } catch (error) {
      console.error('Failed to create transaction:', error);
      console.error('Error response:', error.response?.data);
      
      // Extract and display validation errors
      if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        const errorMessages = error.response.data.errors.map(err => err.msg || err.message || JSON.stringify(err)).join(', ');
        toast.error(`Validation errors: ${errorMessages}`);
      } else {
        const errorMessage = error.response?.data?.message || 
                            error.response?.data?.error || 
                            'Failed to create transaction';
        toast.error(errorMessage);
      }
    }
  };

  const getTypeBadge = (type) => {
    const badges = {
      deposit: 'success',
      withdrawal: 'warning',
      loan_payment: 'primary',
      loan_disbursement: 'info',
      fee: 'danger',
      interest: 'secondary',
      personal_interest_payment: 'success',
      general_interest: 'info',
      due_payment: 'primary'
    };
    return badges[type] || 'secondary';
  };

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-1">{user?.role === 'borrower' ? 'Transaction History' : 'Transactions'}</h1>
          <p className="text-muted">{user?.role === 'borrower' ? 'View your transaction history' : 'Manage all financial transactions'}</p>
        </div>
        <div className="d-flex gap-2">
          {user?.role === 'borrower' && (
            <>
              <button className="btn btn-outline-primary" onClick={() => window.print()}>
                <i className="fas fa-print me-2"></i>Print All
              </button>
            </>
          )}
          {user?.role !== 'borrower' && (
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <i className="fas fa-plus me-2"></i>Add Transaction
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead>
                  <tr>
                    <th>Transaction Number</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Currency</th>
                    <th>Client</th>
                    <th>Loan</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.length > 0 ? (
                    transactions.map((transaction) => (
                      <tr key={transaction.id}>
                        <td><strong>{transaction.transaction_number}</strong></td>
                        <td>
                          <span className={`badge bg-${getTypeBadge(transaction.type)}`}>
                            {transaction.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        </td>
                        <td>{(transaction.currency === 'LRD' ? 'LRD' : '$')}{parseFloat(transaction.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td>{transaction.currency || 'USD'}</td>
                        <td>{transaction.client?.first_name} {transaction.client?.last_name}</td>
                        <td>{transaction.loan?.loan_number || 'N/A'}</td>
                        <td>{new Date(transaction.transaction_date).toLocaleDateString()}</td>
                        <td>
                          <span className={`badge bg-${transaction.status === 'completed' ? 'success' : 'warning'}`}>
                            {transaction.status}
                          </span>
                        </td>
                        <td>
                          <div className="btn-group">
                            <button
                              className="btn btn-sm btn-outline-info"
                              onClick={() => handleView(transaction.id)}
                              title="View"
                            >
                              <i className="fas fa-eye"></i>
                            </button>
                            {user?.role !== 'borrower' && (
                              <>
                                <button
                                  className="btn btn-sm btn-outline-primary"
                                  onClick={() => handleEdit(transaction.id)}
                                  title="Edit"
                                >
                                  <i className="fas fa-edit"></i>
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => handleDelete(transaction.id)}
                                  title="Delete"
                                >
                                  <i className="fas fa-trash"></i>
                                </button>
                              </>
                            )}
                            <button
                              className="btn btn-sm btn-outline-secondary"
                              onClick={() => {
                                setReceipt({
                                  transaction_number: transaction.transaction_number,
                                  client_name: transaction.client ? `${transaction.client.first_name} ${transaction.client.last_name}` : '',
                                  amount: transaction.amount,
                                  currency: transaction.currency || 'USD',
                                  date: transaction.transaction_date,
                                  type: transaction.type,
                                  description: transaction.description
                                });
                              }}
                              title="View Receipt"
                            >
                              <i className="fas fa-receipt"></i>
                            </button>
                            {user?.role === 'borrower' && (
                              <button
                                className="btn btn-sm btn-outline-success"
                                onClick={() => {
                                  const printWindow = window.open('', '_blank');
                                  printWindow.document.write(`
                                    <html>
                                      <head>
                                        <title>Transaction Receipt - ${transaction.transaction_number}</title>
                                        <style>
                                          body { font-family: Arial, sans-serif; padding: 20px; }
                                          .header { text-align: center; margin-bottom: 30px; }
                                          .details { margin: 20px 0; }
                                          .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 10px; border-bottom: 1px solid #eee; }
                                          .label { font-weight: bold; }
                                          .footer { margin-top: 30px; text-align: center; color: #666; }
                                        </style>
                                      </head>
                                      <body>
                                        <div class="header">
                                          <h1>Transaction Receipt</h1>
                                          <p>Transaction Number: ${transaction.transaction_number}</p>
                                        </div>
                                        <div class="details">
                                          <div class="detail-row">
                                            <span class="label">Date:</span>
                                            <span>${new Date(transaction.transaction_date).toLocaleDateString()}</span>
                                          </div>
                                          <div class="detail-row">
                                            <span class="label">Type:</span>
                                            <span>${transaction.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                                          </div>
                                          <div class="detail-row">
                                            <span class="label">Amount:</span>
                                            <span>${transaction.currency === 'LRD' ? 'LRD' : '$'}${parseFloat(transaction.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                          </div>
                                          <div class="detail-row">
                                            <span class="label">Currency:</span>
                                            <span>${transaction.currency || 'USD'}</span>
                                          </div>
                                          ${transaction.description ? `
                                          <div class="detail-row">
                                            <span class="label">Description:</span>
                                            <span>${transaction.description}</span>
                                          </div>
                                          ` : ''}
                                          <div class="detail-row">
                                            <span class="label">Status:</span>
                                            <span>${transaction.status || 'completed'}</span>
                                          </div>
                                        </div>
                                        <div class="footer">
                                          <p>Generated on ${new Date().toLocaleString()}</p>
                                        </div>
                                      </body>
                                    </html>
                                  `);
                                  printWindow.document.close();
                                  printWindow.print();
                                }}
                                title="Print Transaction"
                              >
                                <i className="fas fa-print"></i>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="text-center text-muted py-4">
                        No transactions found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showModal && (
        <>
          <div className="modal fade show" style={{ display: 'block', zIndex: 1050, overflowY: 'auto' }} tabIndex="-1" role="dialog">
            <div className="modal-dialog modal-lg modal-dialog-scrollable" style={{ maxHeight: 'calc(100vh - 3.5rem)' }}>
              <div className="modal-content" style={{ maxHeight: 'calc(100vh - 3.5rem)' }}>
                <div className="modal-header" style={{ flexShrink: 0 }}>
                  <h5 className="modal-title">Add Transaction</h5>
                  <button type="button" className="btn-close" onClick={() => setShowModal(false)} aria-label="Close"></button>
                </div>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div className="modal-body" style={{ overflowY: 'auto', overflowX: 'hidden', flex: '1 1 auto', minHeight: 0 }}>
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Client <span className="text-danger">*</span></label>
                        <select
                          className="form-select"
                          value={formData.client_id}
                          onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                          required
                        >
                          <option value="">Select Client</option>
                          {clients.map((client) => (
                            <option key={client.id} value={client.id}>
                              {client.first_name} {client.last_name} - {client.client_number}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Transaction Type <span className="text-danger">*</span></label>
                        <select
                          className="form-select"
                          value={formData.type}
                          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                          required
                        >
                          <option value="deposit">Deposit</option>
                          <option value="withdrawal">Withdrawal</option>
                          <option value="loan_payment">Loan Payment</option>
                          <option value="loan_disbursement">Loan Disbursement</option>
                          <option value="fee">Fee</option>
                          <option value="interest">Interest</option>
                          <option value="penalty">Penalty</option>
                          <option value="transfer">Transfer</option>
                          <option value="push_back">Push Back</option>
                          <option value="personal_interest_payment">Personal Interest Payment</option>
                          <option value="general_interest">General Interest</option>
                          <option value="due_payment">Due Payment</option>
                        </select>
                      </div>
                      <div className="col-md-4 mb-3">
                        <label className="form-label">Amount <span className="text-danger">*</span></label>
                        <input
                          type="number"
                          className="form-control"
                          value={formData.amount}
                          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                          min="0.01"
                          step="0.01"
                          required
                        />
                      </div>
                      <div className="col-md-4 mb-3">
                        <label className="form-label">Currency <span className="text-danger">*</span></label>
                        <select
                          className="form-select"
                          required
                          value={formData.currency || 'USD'}
                          onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                        >
                          <option value="LRD">Liberian Dollar (LRD)</option>
                          <option value="USD">US Dollar (USD)</option>
                        </select>
                        <small className="text-muted">Currency will inherit from loan/savings if applicable</small>
                      </div>
                      <div className="col-md-4 mb-3">
                        <label className="form-label">Transaction Date</label>
                        <input
                          type="date"
                          className="form-control"
                          value={formData.transaction_date}
                          onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                        />
                      </div>
                      {formData.type === 'loan_payment' && (
                        <div className="col-md-6 mb-3">
                          <label className="form-label">Loan</label>
                          <select
                            className="form-select"
                            value={formData.loan_id}
                            onChange={(e) => {
                              const selectedLoan = loans.find(l => l.id === parseInt(e.target.value));
                              setFormData({ 
                                ...formData, 
                                loan_id: e.target.value,
                                // Inherit currency from loan if loan is selected
                                currency: selectedLoan?.currency || formData.currency || 'USD'
                              });
                            }}
                          >
                            <option value="">Select Loan</option>
                            {loans.filter(l => l.client_id === parseInt(formData.client_id)).map((loan) => (
                              <option key={loan.id} value={loan.id}>
                                {loan.loan_number} - {loan.currency || 'USD'} {parseFloat(loan.amount || 0).toLocaleString()}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div className="col-md-12 mb-3">
                        <label className="form-label">Description</label>
                        <textarea
                          className="form-control"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          rows="3"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer" style={{ flexShrink: 0, borderTop: '1px solid #e2e8f0' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      <i className="fas fa-save me-2"></i>Create Transaction
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" onClick={() => setShowModal(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1040 }}></div>
        </>
      )}

      {/* Receipt Modal */}
      {receipt && (
        <Receipt
          receipt={receipt}
          onClose={() => setReceipt(null)}
          onPrint={() => toast.success('Receipt printed!')}
          onDownload={() => toast.success('Receipt downloaded!')}
        />
      )}

      {/* View Transaction Modal */}
      {showViewModal && selectedTransaction && (
        <div 
          className="modal fade show" 
          style={{ display: 'block', zIndex: 1050 }} 
          tabIndex="-1"
          onClick={(e) => {
            if (e.target.classList.contains('modal')) {
              setShowViewModal(false);
              setSelectedTransaction(null);
            }
          }}
        >
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  <i className="fas fa-eye me-2"></i>Transaction Details
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedTransaction(null);
                  }}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-bold text-muted">Transaction Number</label>
                    <p className="form-control-plaintext"><strong>{selectedTransaction.transaction_number}</strong></p>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-bold text-muted">Type</label>
                    <p className="form-control-plaintext">
                      <span className={`badge bg-${getTypeBadge(selectedTransaction.type)}`}>
                        {selectedTransaction.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    </p>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-bold text-muted">Amount</label>
                    <p className="form-control-plaintext">
                      {selectedTransaction.currency === 'LRD' ? 'LRD' : '$'}{parseFloat(selectedTransaction.amount || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-bold text-muted">Currency</label>
                    <p className="form-control-plaintext">{selectedTransaction.currency || 'USD'}</p>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-bold text-muted">Client</label>
                    <p className="form-control-plaintext">
                      {selectedTransaction.client ? `${selectedTransaction.client.first_name} ${selectedTransaction.client.last_name}` : 'N/A'}
                    </p>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-bold text-muted">Loan</label>
                    <p className="form-control-plaintext">
                      {selectedTransaction.loan ? selectedTransaction.loan.loan_number : 'N/A'}
                    </p>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-bold text-muted">Status</label>
                    <p className="form-control-plaintext">
                      <span className={`badge bg-${selectedTransaction.status === 'completed' ? 'success' : 'warning'}`}>
                        {selectedTransaction.status}
                      </span>
                    </p>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-bold text-muted">Transaction Date</label>
                    <p className="form-control-plaintext">
                      {new Date(selectedTransaction.transaction_date).toLocaleString()}
                    </p>
                  </div>
                  {selectedTransaction.description && (
                    <div className="col-12 mb-3">
                      <label className="form-label fw-bold text-muted">Description</label>
                      <p className="form-control-plaintext">{selectedTransaction.description}</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedTransaction(null);
                  }}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setShowViewModal(false);
                    handleEdit(selectedTransaction.id);
                  }}
                >
                  <i className="fas fa-edit me-2"></i>Edit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Transaction Modal */}
      {showEditModal && selectedTransaction && (
        <div 
          className="modal fade show" 
          style={{ display: 'block', zIndex: 1050 }} 
          tabIndex="-1"
          onClick={(e) => {
            if (e.target.classList.contains('modal')) {
              setShowEditModal(false);
              setSelectedTransaction(null);
            }
          }}
        >
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  <i className="fas fa-edit me-2"></i>Edit Transaction
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedTransaction(null);
                  }}
                ></button>
              </div>
              <form onSubmit={handleEditSubmit}>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Client <span className="text-danger">*</span></label>
                      <select
                        className="form-select"
                        name="client_id"
                        value={formData.client_id}
                        onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                        required
                      >
                        <option value="">Select Client</option>
                        {clients.map(client => (
                          <option key={client.id} value={client.id}>
                            {client.first_name} {client.last_name} ({client.client_number})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Transaction Type <span className="text-danger">*</span></label>
                      <select
                        className="form-select"
                        name="type"
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        required
                      >
                        <option value="deposit">Deposit</option>
                        <option value="withdrawal">Withdrawal</option>
                        <option value="loan_payment">Loan Payment</option>
                        <option value="loan_disbursement">Loan Disbursement</option>
                        <option value="fee">Fee</option>
                        <option value="interest">Interest</option>
                        <option value="penalty">Penalty</option>
                        <option value="transfer">Transfer</option>
                        <option value="push_back">Push Back</option>
                        <option value="personal_interest_payment">Personal Interest Payment</option>
                        <option value="general_interest">General Interest</option>
                        <option value="due_payment">Due Payment</option>
                      </select>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Amount <span className="text-danger">*</span></label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control"
                        name="amount"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Currency <span className="text-danger">*</span></label>
                      <select
                        className="form-select"
                        name="currency"
                        value={formData.currency}
                        onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                        required
                      >
                        <option value="USD">USD</option>
                        <option value="LRD">LRD</option>
                      </select>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Loan (Optional)</label>
                      <select
                        className="form-select"
                        name="loan_id"
                        value={formData.loan_id}
                        onChange={(e) => setFormData({ ...formData, loan_id: e.target.value })}
                      >
                        <option value="">Select Loan</option>
                        {loans.map(loan => (
                          <option key={loan.id} value={loan.id}>
                            {loan.loan_number} - {loan.client?.first_name} {loan.client?.last_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Savings Account (Optional)</label>
                      <select
                        className="form-select"
                        name="savings_account_id"
                        value={formData.savings_account_id}
                        onChange={(e) => setFormData({ ...formData, savings_account_id: e.target.value })}
                      >
                        <option value="">Select Savings Account</option>
                        {savingsAccounts.map(account => (
                          <option key={account.id} value={account.id}>
                            {account.account_number} - {account.client?.first_name} {account.client?.last_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Transaction Date</label>
                      <input
                        type="date"
                        className="form-control"
                        name="transaction_date"
                        value={formData.transaction_date}
                        onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                      />
                    </div>
                    <div className="col-12 mb-3">
                      <label className="form-label">Description</label>
                      <textarea
                        className="form-control"
                        name="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows="3"
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedTransaction(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    <i className="fas fa-save me-2"></i>Update Transaction
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Backdrop */}
      {(showModal || showViewModal || showEditModal) && <div className="modal-backdrop fade show"></div>}
    </div>
  );
};

export default Transactions;
