import React, { useState, useEffect } from 'react';
import apiClient from '../config/axios';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import Receipt from '../components/Receipt';
import { useAuth } from '../contexts/AuthContext';

const Savings = () => {
  const { user } = useAuth();
  const [savings, setSavings] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [editingAccount, setEditingAccount] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [formData, setFormData] = useState({
    client_id: '',
    account_type: 'regular',
    initial_deposit: '',
    interest_rate: '',
    currency: 'USD', // Default currency
    branch_id: ''
  });
  const [depositData, setDepositData] = useState({
    amount: '',
    description: ''
  });
  const [withdrawData, setWithdrawData] = useState({
    amount: '',
    description: ''
  });

  useEffect(() => {
    fetchSavings();
    fetchClients();
    
    // Real-time updates every 10 seconds
    const interval = setInterval(() => {
      fetchSavings();
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchSavings = async () => {
    try {
      const response = await apiClient.get('/api/savings');
      setSavings(response.data.data.savingsAccounts || []);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch savings:', error);
      toast.error('Failed to load savings accounts');
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await apiClient.get('/api/clients', { params: { all: 'true' } });
      setClients(response.data.data.clients || []);
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingAccount) {
        await apiClient.put(`/api/savings/${editingAccount.id}`, formData);
        toast.success('Savings account updated successfully!');
      } else {
        await apiClient.post('/api/savings', formData);
        toast.success('Savings account created successfully!');
      }
      setShowModal(false);
      setEditingAccount(null);
      setSelectedAccount(null);
      setFormData({
        client_id: '',
        account_type: 'regular',
        initial_deposit: '',
        interest_rate: '',
        currency: 'USD',
        branch_id: ''
      });
      // Immediately refresh both savings and clients
      await fetchSavings();
      await fetchClients();
    } catch (error) {
      console.error('Failed to save savings account:', error);
      toast.error(error.response?.data?.message || 'Failed to save savings account');
    }
  };

  const handleDeposit = async (e) => {
    e.preventDefault();
    try {
      const response = await apiClient.post(`/api/savings/${selectedAccount.id}/deposit`, depositData);
      toast.success('Deposit processed successfully!');
      setShowDepositModal(false);
      setDepositData({ amount: '', description: '' });
      setReceipt(response.data.data.receipt);
      // Immediately refresh savings and clients
      await fetchSavings();
      await fetchClients();
    } catch (error) {
      console.error('Failed to process deposit:', error);
      toast.error(error.response?.data?.message || 'Failed to process deposit');
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    try {
      const response = await apiClient.post(`/api/savings/${selectedAccount.id}/withdraw`, withdrawData);
      toast.success('Withdrawal processed successfully!');
      setShowWithdrawModal(false);
      setWithdrawData({ amount: '', description: '' });
      setReceipt(response.data.data.receipt);
      // Immediately refresh savings and clients
      await fetchSavings();
      await fetchClients();
    } catch (error) {
      console.error('Failed to process withdrawal:', error);
      toast.error(error.response?.data?.message || 'Failed to process withdrawal');
    }
  };

  const handleEdit = async (accountId) => {
    try {
      const response = await apiClient.get(`/api/savings/${accountId}`);
      const account = response.data.data.savingsAccount;
      setEditingAccount(account);
      setFormData({
        client_id: account.client_id || '',
        account_type: account.account_type || 'regular',
        initial_deposit: account.balance || '',
        interest_rate: account.interest_rate || '',
        currency: account.currency || 'USD',
        branch_id: account.branch_id || ''
      });
      setShowModal(true);
    } catch (error) {
      console.error('Failed to fetch savings account details:', error);
      toast.error('Failed to load savings account details');
    }
  };

  const handleDelete = async (accountId) => {
    if (!window.confirm('Are you sure you want to delete this savings account? It will be moved to the Recycle Bin.')) {
      return;
    }

    try {
      await apiClient.delete(`/api/savings/${accountId}`);
      toast.success('Savings account deleted successfully');
      // Immediately refresh both savings and clients
      await fetchSavings();
      await fetchClients();
    } catch (error) {
      console.error('Failed to delete savings account:', error);
      toast.error(error.response?.data?.message || 'Failed to delete savings account');
    }
  };

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-1">{user?.role === 'borrower' ? 'My Savings' : 'Savings Accounts'}</h1>
          <p className="text-muted">
            {user?.role === 'borrower' ? 'View your savings accounts' : 'Manage client savings accounts'}
          </p>
        </div>
        {user?.role !== 'borrower' && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <i className="fas fa-plus me-2"></i>Add Savings Account
          </button>
        )}
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
                    <th>Account Number</th>
                    <th>Client</th>
                    <th>Account Type</th>
                    <th>Balance</th>
                    <th>Interest Rate</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {savings.length > 0 ? (
                    savings.map((account) => (
                      <tr key={account.id}>
                        <td><strong>{account.account_number}</strong></td>
                        <td>{account.client?.first_name} {account.client?.last_name}</td>
                        <td>{account.account_type}</td>
                        <td>
                          <strong className="text-success">
                            ${parseFloat(account.balance || 0).toLocaleString()}
                          </strong>
                        </td>
                        <td>{account.interest_rate || 0}%</td>
                        <td>
                          <span className={`badge bg-${account.status === 'active' ? 'success' : 'secondary'}`}>
                            {account.status}
                          </span>
                        </td>
                        <td>
                          <div className="btn-group">
                            <Link
                              to={`/savings/${account.id}`}
                              className="btn btn-sm btn-outline-info"
                              title="View Details"
                            >
                              <i className="fas fa-eye"></i>
                            </Link>
                            {user?.role !== 'borrower' && (
                              <>
                                <button 
                                  className="btn btn-sm btn-outline-primary"
                                  onClick={() => handleEdit(account.id)}
                                  title="Edit"
                                >
                                  <i className="fas fa-edit"></i>
                                </button>
                                <button 
                                  className="btn btn-sm btn-outline-success"
                                  onClick={() => {
                                    setSelectedAccount(account);
                                    setShowDepositModal(true);
                                  }}
                                  title="Deposit"
                                >
                                  <i className="fas fa-plus"></i>
                                </button>
                                <button 
                                  className="btn btn-sm btn-outline-warning"
                                  onClick={() => {
                                    setSelectedAccount(account);
                                    setShowWithdrawModal(true);
                                  }}
                                  title="Withdraw"
                                  disabled={parseFloat(account.balance || 0) <= 0}
                                >
                                  <i className="fas fa-minus"></i>
                                </button>
                                {user?.role === 'admin' && (
                                  <button 
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => handleDelete(account.id)}
                                    title="Delete"
                                  >
                                    <i className="fas fa-trash"></i>
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="text-center text-muted py-4">
                        No savings accounts found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add Account Modal */}
      {showModal && (
        <>
          <div className="modal fade show" style={{ display: 'block', zIndex: 1050, overflowY: 'auto' }} tabIndex="-1" role="dialog">
            <div className="modal-dialog modal-lg modal-dialog-scrollable" style={{ maxHeight: 'calc(100vh - 3.5rem)' }}>
              <div className="modal-content" style={{ maxHeight: 'calc(100vh - 3.5rem)' }}>
                <div className="modal-header" style={{ flexShrink: 0 }}>
                  <h5 className="modal-title">{editingAccount ? 'Edit Savings Account' : 'Add Savings Account'}</h5>
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
                        <label className="form-label">Account Type <span className="text-danger">*</span></label>
                        <select
                          className="form-select"
                          value={formData.account_type}
                          onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
                          required
                        >
                          <option value="regular">Regular Savings</option>
                          <option value="fixed">Fixed Deposit</option>
                          <option value="joint">Joint Account</option>
                        </select>
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Initial Deposit</label>
                        <input
                          type="number"
                          className="form-control"
                          value={formData.initial_deposit}
                          onChange={(e) => setFormData({ ...formData, initial_deposit: e.target.value })}
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div className="col-md-6 mb-3">
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
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label">Interest Rate (%)</label>
                        <input
                          type="number"
                          className="form-control"
                          value={formData.interest_rate}
                          onChange={(e) => setFormData({ ...formData, interest_rate: e.target.value })}
                          min="0"
                          max="100"
                          step="0.01"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer" style={{ flexShrink: 0, borderTop: '1px solid #e2e8f0' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      <i className="fas fa-save me-2"></i>{editingAccount ? 'Update Account' : 'Create Account'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" onClick={() => setShowModal(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1040 }}></div>
        </>
      )}

      {/* Deposit Modal */}
      {showDepositModal && selectedAccount && (
        <>
          <div className="modal fade show" style={{ display: 'block', zIndex: 1050, overflowY: 'auto' }} tabIndex="-1" role="dialog">
            <div className="modal-dialog modal-dialog-scrollable" style={{ maxHeight: 'calc(100vh - 3.5rem)' }}>
              <div className="modal-content" style={{ maxHeight: 'calc(100vh - 3.5rem)' }}>
                <div className="modal-header" style={{ flexShrink: 0 }}>
                  <h5 className="modal-title">Deposit to {selectedAccount.account_number}</h5>
                  <button type="button" className="btn-close" onClick={() => setShowDepositModal(false)} aria-label="Close"></button>
                </div>
                <form onSubmit={handleDeposit} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div className="modal-body" style={{ overflowY: 'auto', overflowX: 'hidden', flex: '1 1 auto', minHeight: 0 }}>
                    <div className="mb-3">
                      <label className="form-label">Current Balance</label>
                      <div className="form-control-plaintext">
                        <strong className="text-success">${parseFloat(selectedAccount.balance || 0).toLocaleString()}</strong>
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Deposit Amount <span className="text-danger">*</span></label>
                      <input
                        type="number"
                        className="form-control"
                        value={depositData.amount}
                        onChange={(e) => setDepositData({ ...depositData, amount: e.target.value })}
                        min="0.01"
                        step="0.01"
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Description</label>
                      <textarea
                        className="form-control"
                        rows="2"
                        value={depositData.description}
                        onChange={(e) => setDepositData({ ...depositData, description: e.target.value })}
                      />
                    </div>
                    {depositData.amount && (
                      <div className="alert alert-info">
                        <strong>New Balance:</strong> ${(parseFloat(selectedAccount.balance || 0) + parseFloat(depositData.amount || 0)).toFixed(2)}
                      </div>
                    )}
                  </div>
                  <div className="modal-footer" style={{ flexShrink: 0, borderTop: '1px solid #e2e8f0' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowDepositModal(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-success">
                      <i className="fas fa-plus me-2"></i>Process Deposit
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" onClick={() => setShowDepositModal(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1040 }}></div>
        </>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && selectedAccount && (
        <>
          <div className="modal fade show" style={{ display: 'block', zIndex: 1050, overflowY: 'auto' }} tabIndex="-1" role="dialog">
            <div className="modal-dialog modal-dialog-scrollable" style={{ maxHeight: 'calc(100vh - 3.5rem)' }}>
              <div className="modal-content" style={{ maxHeight: 'calc(100vh - 3.5rem)' }}>
                <div className="modal-header" style={{ flexShrink: 0 }}>
                  <h5 className="modal-title">Withdraw from {selectedAccount.account_number}</h5>
                  <button type="button" className="btn-close" onClick={() => setShowWithdrawModal(false)} aria-label="Close"></button>
                </div>
                <form onSubmit={handleWithdraw} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div className="modal-body" style={{ overflowY: 'auto', overflowX: 'hidden', flex: '1 1 auto', minHeight: 0 }}>
                    <div className="mb-3">
                      <label className="form-label">Current Balance</label>
                      <div className="form-control-plaintext">
                        <strong className="text-danger">
                          {selectedAccount.currency === 'LRD' ? 'LRD' : '$'}
                          {parseFloat(selectedAccount.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </strong>
                        <small className="text-muted ms-2">({selectedAccount.currency || 'USD'})</small>
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Withdrawal Amount <span className="text-danger">*</span></label>
                      <div className="input-group">
                        <span className="input-group-text">{selectedAccount.currency === 'LRD' ? 'LRD' : '$'}</span>
                        <input
                          type="number"
                          className="form-control"
                          value={withdrawData.amount}
                          onChange={(e) => setWithdrawData({ ...withdrawData, amount: e.target.value })}
                          min="0.01"
                          max={selectedAccount.balance || 0}
                          step="0.01"
                          required
                        />
                      </div>
                      <small className="text-muted">Currency: {selectedAccount.currency || 'USD'}</small>
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Description</label>
                      <textarea
                        className="form-control"
                        rows="2"
                        value={withdrawData.description}
                        onChange={(e) => setWithdrawData({ ...withdrawData, description: e.target.value })}
                      />
                    </div>
                    {withdrawData.amount && (
                      <div className="alert alert-info">
                        <strong>New Balance:</strong> {selectedAccount.currency === 'LRD' ? 'LRD' : '$'}
                        {Math.max(0, parseFloat(selectedAccount.balance || 0) - parseFloat(withdrawData.amount || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    )}
                  </div>
                  <div className="modal-footer" style={{ flexShrink: 0, borderTop: '1px solid #e2e8f0' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowWithdrawModal(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-warning">
                      <i className="fas fa-minus me-2"></i>Process Withdrawal
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" onClick={() => setShowWithdrawModal(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1040 }}></div>
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
    </div>
  );
};

export default Savings;
