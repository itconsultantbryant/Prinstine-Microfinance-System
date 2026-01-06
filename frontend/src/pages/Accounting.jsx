import React, { useState, useEffect } from 'react';
import apiClient from '../config/axios';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';

const Accounting = () => {
  const [accounts, setAccounts] = useState([]);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('chart');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'asset',
    normal_balance: 'debit',
    opening_balance: '',
    category: '',
    description: '',
    is_active: true
  });

  useEffect(() => {
    if (activeTab === 'chart') {
      fetchChartOfAccounts();
    } else if (activeTab === 'ledger') {
      fetchGeneralLedger();
    }
  }, [activeTab]);

  const fetchChartOfAccounts = async () => {
    try {
      const response = await apiClient.get('/api/accounting/chart-of-accounts');
      setAccounts(response.data.data.accounts || []);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch chart of accounts:', error);
      toast.error('Failed to load chart of accounts');
      setLoading(false);
    }
  };

  const fetchGeneralLedger = async () => {
    try {
      const response = await apiClient.get('/api/accounting/general-ledger');
      setLedgerEntries(response.data.data.entries || []);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch general ledger:', error);
      // Don't show error toast if it's just empty data
      if (error.response?.status !== 500) {
        toast.error('Failed to load general ledger');
      }
      setLedgerEntries([]);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/api/accounting/chart-of-accounts', formData);
      toast.success('Account created successfully!');
      setShowModal(false);
      setFormData({
        code: '',
        name: '',
        type: 'asset',
        normal_balance: 'debit',
        opening_balance: '',
        category: '',
        description: '',
        is_active: true
      });
      fetchChartOfAccounts();
    } catch (error) {
      console.error('Failed to create account:', error);
      toast.error(error.response?.data?.message || 'Failed to create account');
    }
  };

  const getAccountTypeColor = (type) => {
    const colors = {
      asset: 'primary',
      liability: 'warning',
      equity: 'info',
      revenue: 'success',
      expense: 'danger'
    };
    return colors[type] || 'secondary';
  };

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-1">Accounting</h1>
          <p className="text-muted">Financial management and bookkeeping</p>
        </div>
        <div className="btn-group">
          <button className="btn btn-outline-primary">
            <i className="fas fa-file-excel me-2"></i>Export
          </button>
        </div>
      </div>

      {/* Tabs */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'chart' ? 'active' : ''}`}
            onClick={() => setActiveTab('chart')}
          >
            <i className="fas fa-list me-2"></i>Chart of Accounts
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'ledger' ? 'active' : ''}`}
            onClick={() => setActiveTab('ledger')}
          >
            <i className="fas fa-book me-2"></i>General Ledger
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            <i className="fas fa-chart-bar me-2"></i>Financial Reports
          </button>
        </li>
      </ul>

      {/* Chart of Accounts */}
      {activeTab === 'chart' && (
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Chart of Accounts</h5>
            <button className="btn btn-sm btn-primary" onClick={() => setShowModal(true)}>
              <i className="fas fa-plus me-2"></i>Add Account
            </button>
          </div>
          <div className="card-body p-0">
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Account Name</th>
                      <th>Type</th>
                      <th>Balance</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.length > 0 ? (
                      accounts.map((account) => (
                        <tr key={account.id} className="hover-lift">
                          <td><strong>{account.code}</strong></td>
                          <td>{account.name}</td>
                          <td>
                            <span className={`badge bg-${getAccountTypeColor(account.type)}`}>
                              {account.type}
                            </span>
                          </td>
                          <td>${parseFloat(account.balance || 0).toLocaleString()}</td>
                          <td>
                            <span className={`badge bg-${account.is_active ? 'success' : 'secondary'}`}>
                              {account.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td>
                            <button className="btn btn-sm btn-outline-primary">
                              <i className="fas fa-eye"></i>
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="text-center text-muted py-5">
                          No accounts found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* General Ledger */}
      {activeTab === 'ledger' && (
        <div className="card">
          <div className="card-header">
            <h5 className="mb-0">General Ledger</h5>
          </div>
          <div className="card-body p-0">
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead>
                    <tr>
                      <th>Entry Number</th>
                      <th>Account</th>
                      <th>Debit</th>
                      <th>Credit</th>
                      <th>Balance</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerEntries.length > 0 ? (
                      ledgerEntries.map((entry) => (
                        <tr key={entry.id} className="hover-lift">
                          <td>{entry.entry_number}</td>
                          <td>{entry.account?.name || '-'}</td>
                          <td>${parseFloat(entry.debit || 0).toLocaleString()}</td>
                          <td>${parseFloat(entry.credit || 0).toLocaleString()}</td>
                          <td>${parseFloat(entry.balance || 0).toLocaleString()}</td>
                          <td>{new Date(entry.transaction_date).toLocaleDateString()}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="text-center text-muted py-5">
                          No ledger entries found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Financial Reports */}
      {activeTab === 'reports' && (
        <div className="row">
          <div className="col-md-4 mb-4">
            <div className="card hover-lift">
              <div className="card-body text-center">
                <i className="fas fa-file-invoice-dollar fa-3x text-primary mb-3"></i>
                <h5>Profit & Loss</h5>
                <p className="text-muted">Income statement report</p>
                <button className="btn btn-primary">View Report</button>
              </div>
            </div>
          </div>
          <div className="col-md-4 mb-4">
            <div className="card hover-lift">
              <div className="card-body text-center">
                <i className="fas fa-balance-scale fa-3x text-info mb-3"></i>
                <h5>Balance Sheet</h5>
                <p className="text-muted">Financial position report</p>
                <button className="btn btn-info">View Report</button>
              </div>
            </div>
          </div>
          <div className="col-md-4 mb-4">
            <div className="card hover-lift">
              <div className="card-body text-center">
                <i className="fas fa-money-bill-wave fa-3x text-success mb-3"></i>
                <h5>Cash Flow</h5>
                <p className="text-muted">Cash movement report</p>
                <button className="btn btn-success">View Report</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Account Modal */}
      {showModal && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Add Chart of Account</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Account Code <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        placeholder="e.g., 1000, 2000"
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Account Name <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Account Type <span className="text-danger">*</span></label>
                      <select
                        className="form-select"
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        required
                      >
                        <option value="asset">Asset</option>
                        <option value="liability">Liability</option>
                        <option value="equity">Equity</option>
                        <option value="revenue">Revenue</option>
                        <option value="expense">Expense</option>
                      </select>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Normal Balance <span className="text-danger">*</span></label>
                      <select
                        className="form-select"
                        value={formData.normal_balance}
                        onChange={(e) => setFormData({ ...formData, normal_balance: e.target.value })}
                        required
                      >
                        <option value="debit">Debit</option>
                        <option value="credit">Credit</option>
                      </select>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Opening Balance</label>
                      <input
                        type="number"
                        className="form-control"
                        value={formData.opening_balance}
                        onChange={(e) => setFormData({ ...formData, opening_balance: e.target.value })}
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Category</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        placeholder="e.g., Current Assets, Fixed Assets"
                      />
                    </div>
                    <div className="col-md-12 mb-3">
                      <label className="form-label">Description</label>
                      <textarea
                        className="form-control"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows="3"
                      />
                    </div>
                    <div className="col-md-12 mb-3">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={formData.is_active}
                          onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        />
                        <label className="form-check-label">Active Account</label>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    <i className="fas fa-save me-2"></i>Create Account
                  </button>
                </div>
              </form>
            </div>
          </div>
          <div className="modal-backdrop fade show" onClick={() => setShowModal(false)}></div>
        </div>
      )}
    </div>
  );
};

export default Accounting;
