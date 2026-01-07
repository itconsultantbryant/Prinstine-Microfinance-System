import React, { useState, useEffect } from 'react';
import apiClient from '../config/axios';
import { toast } from 'react-toastify';
import Receipt from '../components/Receipt';

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [clients, setClients] = useState([]);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [formData, setFormData] = useState({
    client_id: '',
    loan_id: '',
    type: 'deposit',
    amount: '',
    description: '',
    transaction_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchTransactions();
    fetchClients();
    fetchLoans();
    
    // Real-time updates every 5 seconds
    const interval = setInterval(() => {
      fetchTransactions();
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await apiClient.post('/api/transactions', formData);
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
          date: transaction.transaction_date,
          type: transaction.type,
          description: transaction.description
        });
      }
      
      setFormData({
        client_id: '',
        loan_id: '',
        type: 'deposit',
        amount: '',
        description: '',
        transaction_date: new Date().toISOString().split('T')[0]
      });
      fetchTransactions();
    } catch (error) {
      console.error('Failed to create transaction:', error);
      toast.error(error.response?.data?.message || 'Failed to create transaction');
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
          <h1 className="h3 mb-1">Transactions</h1>
          <p className="text-muted">Manage all financial transactions</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <i className="fas fa-plus me-2"></i>Add Transaction
        </button>
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
                    <th>Client</th>
                    <th>Loan</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.length > 0 ? (
                    transactions.map((transaction) => (
                      <tr key={transaction.id}>
                        <td><strong>{transaction.transaction_number}</strong></td>
                        <td>
                          <span className={`badge bg-${getTypeBadge(transaction.type)}`}>
                            {transaction.type.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td>${parseFloat(transaction.amount || 0).toLocaleString()}</td>
                        <td>{transaction.client?.first_name} {transaction.client?.last_name}</td>
                        <td>{transaction.loan?.loan_number || 'N/A'}</td>
                        <td>{new Date(transaction.transaction_date).toLocaleDateString()}</td>
                        <td>
                          <span className={`badge bg-${transaction.status === 'completed' ? 'success' : 'warning'}`}>
                            {transaction.status}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => {
                              setReceipt({
                                transaction_number: transaction.transaction_number,
                                client_name: transaction.client ? `${transaction.client.first_name} ${transaction.client.last_name}` : '',
                                amount: transaction.amount,
                                date: transaction.transaction_date,
                                type: transaction.type,
                                description: transaction.description
                              });
                            }}
                            title="View Receipt"
                          >
                            <i className="fas fa-receipt"></i>
                          </button>
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
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Add Transaction</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
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
                      </select>
                    </div>
                    <div className="col-md-6 mb-3">
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
                    <div className="col-md-6 mb-3">
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
                          onChange={(e) => setFormData({ ...formData, loan_id: e.target.value })}
                        >
                          <option value="">Select Loan</option>
                          {loans.filter(l => l.client_id === parseInt(formData.client_id)).map((loan) => (
                            <option key={loan.id} value={loan.id}>
                              {loan.loan_number} - ${parseFloat(loan.amount || 0).toLocaleString()}
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
                <div className="modal-footer">
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
          <div className="modal-backdrop fade show" onClick={() => setShowModal(false)} style={{ zIndex: 1040 }}></div>
        </div>
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
    </div>
  );
};

export default Transactions;
