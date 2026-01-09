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
  const [financialSummary, setFinancialSummary] = useState({
    lrd: {
      totalSavings: 0,
      totalPersonalInterest: 0,
      totalGeneralInterest: 0,
      totalOutstandingDues: 0,
      outstandingDues: 0,
      monthlyDues: 0,
      totalOutstandingLoans: 0,
      totalLoans: 0,
      outstandingSavings: 0,
      totalFines: 0,
      clientsWithOutstandingDues: 0,
      clientsPaidDues: 0,
      grandTotal: 0,
      overallTotalSavings: 0
    },
    usd: {
      totalSavings: 0,
      totalPersonalInterest: 0,
      totalGeneralInterest: 0,
      totalOutstandingDues: 0,
      outstandingDues: 0,
      monthlyDues: 0,
      totalOutstandingLoans: 0,
      totalLoans: 0,
      outstandingSavings: 0,
      totalFines: 0,
      clientsWithOutstandingDues: 0,
      clientsPaidDues: 0,
      grandTotal: 0,
      overallTotalSavings: 0
    }
  });
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
    } else if (activeTab === 'reports') {
      fetchFinancialSummary();
    }
  }, [activeTab]);

  const fetchFinancialSummary = async () => {
    try {
      const [savingsRes, transactionsRes, clientsRes, loansRes] = await Promise.all([
        apiClient.get('/api/savings'),
        apiClient.get('/api/transactions', { params: { limit: 1000 } }),
        apiClient.get('/api/clients'),
        apiClient.get('/api/loans')
      ]);

      const savings = savingsRes.data.data.savingsAccounts || [];
      const transactions = transactionsRes.data.data.transactions || [];
      const clients = clientsRes.data.data.clients || [];
      const loans = loansRes.data.data.loans || [];

      // Initialize currency-separated totals
      const summary = {
        lrd: {
          totalSavings: 0,
          totalPersonalInterest: 0,
          totalGeneralInterest: 0,
          totalOutstandingDues: 0,
          outstandingDues: 0,
          monthlyDues: 0,
          totalOutstandingLoans: 0,
          totalLoans: 0,
          outstandingSavings: 0,
          totalFines: 0,
          clientsWithOutstandingDues: 0,
          clientsPaidDues: 0,
          grandTotal: 0,
          overallTotalSavings: 0
        },
        usd: {
          totalSavings: 0,
          totalPersonalInterest: 0,
          totalGeneralInterest: 0,
          totalOutstandingDues: 0,
          outstandingDues: 0,
          monthlyDues: 0,
          totalOutstandingLoans: 0,
          totalLoans: 0,
          outstandingSavings: 0,
          totalFines: 0,
          clientsWithOutstandingDues: 0,
          clientsPaidDues: 0,
          grandTotal: 0,
          overallTotalSavings: 0
        }
      };

      // Calculate savings by currency
      savings.forEach(acc => {
        const currency = acc.currency || 'USD';
        const balance = parseFloat(acc.balance || 0);
        if (currency === 'LRD') {
          summary.lrd.totalSavings += balance;
        } else {
          summary.usd.totalSavings += balance;
        }
      });

      // Calculate interest by currency
      transactions.forEach(t => {
        const currency = t.currency || 'USD';
        const amount = parseFloat(t.amount || 0);
        if (t.type === 'personal_interest_payment') {
          if (currency === 'LRD') {
            summary.lrd.totalPersonalInterest += amount;
          } else {
            summary.usd.totalPersonalInterest += amount;
          }
        } else if (t.type === 'general_interest') {
          if (currency === 'LRD') {
            summary.lrd.totalGeneralInterest += amount;
          } else {
            summary.usd.totalGeneralInterest += amount;
          }
        } else if (t.type === 'penalty' || t.type === 'fee') {
          if (currency === 'LRD') {
            summary.lrd.totalFines += amount;
          } else {
            summary.usd.totalFines += amount;
          }
        } else if (t.type === 'due_payment') {
          if (currency === 'LRD') {
            summary.lrd.clientsPaidDues += 1;
          } else {
            summary.usd.clientsPaidDues += 1;
          }
        }
      });

      // Calculate loans by currency
      loans.forEach(loan => {
        const currency = loan.currency || 'USD';
        const amount = parseFloat(loan.amount || 0);
        const outstanding = parseFloat(loan.outstanding_balance || 0);
        if (currency === 'LRD') {
          summary.lrd.totalLoans += amount;
          summary.lrd.totalOutstandingLoans += outstanding;
        } else {
          summary.usd.totalLoans += amount;
          summary.usd.totalOutstandingLoans += outstanding;
        }
      });

      // Calculate dues by currency
      clients.forEach(client => {
        const duesCurrency = client.dues_currency || 'USD';
        const totalDues = parseFloat(client.total_dues || 0);
        if (totalDues < 0) {
          const outstanding = Math.abs(totalDues);
          if (duesCurrency === 'LRD') {
            summary.lrd.outstandingDues += outstanding;
            summary.lrd.clientsWithOutstandingDues += 1;
          } else {
            summary.usd.outstandingDues += outstanding;
            summary.usd.clientsWithOutstandingDues += 1;
          }
        }
        if (duesCurrency === 'LRD') {
          summary.lrd.totalOutstandingDues += totalDues;
        } else {
          summary.usd.totalOutstandingDues += totalDues;
        }
      });

      // Calculate monthly dues (outstanding dues / 12)
      summary.lrd.monthlyDues = summary.lrd.outstandingDues / 12;
      summary.usd.monthlyDues = summary.usd.outstandingDues / 12;

      // Calculate outstanding savings (savings that are negative)
      savings.forEach(acc => {
        const currency = acc.currency || 'USD';
        const balance = parseFloat(acc.balance || 0);
        if (balance < 0) {
          if (currency === 'LRD') {
            summary.lrd.outstandingSavings += Math.abs(balance);
          } else {
            summary.usd.outstandingSavings += Math.abs(balance);
          }
        }
      });

      // Grand Total = Total Savings + Personal Interest + General Interest - Outstanding Dues
      summary.lrd.grandTotal = summary.lrd.totalSavings + summary.lrd.totalPersonalInterest + summary.lrd.totalGeneralInterest - summary.lrd.outstandingDues;
      summary.usd.grandTotal = summary.usd.totalSavings + summary.usd.totalPersonalInterest + summary.usd.totalGeneralInterest - summary.usd.outstandingDues;

      // Overall Total Savings = Grand Total - Outstanding Loans
      summary.lrd.overallTotalSavings = summary.lrd.grandTotal - summary.lrd.totalOutstandingLoans;
      summary.usd.overallTotalSavings = summary.usd.grandTotal - summary.usd.totalOutstandingLoans;

      setFinancialSummary(summary);
    } catch (error) {
      console.error('Failed to fetch financial summary:', error);
    }
  };

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
          {/* LRD Financial Summary */}
          <div className="col-md-12 mb-4">
            <div className="card">
              <div className="card-header bg-primary text-white">
                <h5 className="mb-0"><i className="fas fa-coins me-2"></i>LRD Financial Reports</h5>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-2">
                    <div className="card bg-primary text-white">
                      <div className="card-body text-center">
                        <h6 className="card-subtitle mb-2 text-white-50 small">Total Savings</h6>
                        <h5 className="card-title mb-0">
                          LRD {financialSummary.lrd?.totalSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </h5>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="card bg-success text-white">
                      <div className="card-body text-center">
                        <h6 className="card-subtitle mb-2 text-white-50 small">Personal Interest</h6>
                        <h5 className="card-title mb-0">
                          LRD {financialSummary.lrd?.totalPersonalInterest.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </h5>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="card bg-info text-white">
                      <div className="card-body text-center">
                        <h6 className="card-subtitle mb-2 text-white-50 small">General Interest</h6>
                        <h5 className="card-title mb-0">
                          LRD {financialSummary.lrd?.totalGeneralInterest.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </h5>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="card bg-danger text-white">
                      <div className="card-body text-center">
                        <h6 className="card-subtitle mb-2 text-white-50 small">Outstanding Dues</h6>
                        <h5 className="card-title mb-0">
                          LRD {financialSummary.lrd?.outstandingDues.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </h5>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="card bg-warning text-white">
                      <div className="card-body text-center">
                        <h6 className="card-subtitle mb-2 text-white-50 small">Monthly Dues</h6>
                        <h5 className="card-title mb-0">
                          LRD {financialSummary.lrd?.monthlyDues.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </h5>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="card bg-secondary text-white">
                      <div className="card-body text-center">
                        <h6 className="card-subtitle mb-2 text-white-50 small">Grand Total</h6>
                        <h5 className="card-title mb-0">
                          LRD {financialSummary.lrd?.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </h5>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="card bg-dark text-white">
                      <div className="card-body text-center">
                        <h6 className="card-subtitle mb-2 text-white-50 small">Total Loans</h6>
                        <h5 className="card-title mb-0">
                          LRD {financialSummary.lrd?.totalLoans.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </h5>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="card bg-danger text-white">
                      <div className="card-body text-center">
                        <h6 className="card-subtitle mb-2 text-white-50 small">Outstanding Loans</h6>
                        <h5 className="card-title mb-0">
                          LRD {financialSummary.lrd?.totalOutstandingLoans.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </h5>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="card bg-warning text-white">
                      <div className="card-body text-center">
                        <h6 className="card-subtitle mb-2 text-white-50 small">Outstanding Savings</h6>
                        <h5 className="card-title mb-0">
                          LRD {financialSummary.lrd?.outstandingSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </h5>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="card bg-secondary text-white">
                      <div className="card-body text-center">
                        <h6 className="card-subtitle mb-2 text-white-50 small">Total Fines</h6>
                        <h5 className="card-title mb-0">
                          LRD {financialSummary.lrd?.totalFines.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </h5>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="card bg-danger text-white">
                      <div className="card-body text-center">
                        <h6 className="card-subtitle mb-2 text-white-50 small">Clients with Dues</h6>
                        <h5 className="card-title mb-0">
                          {financialSummary.lrd?.clientsWithOutstandingDues || 0}
                        </h5>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="card bg-success text-white">
                      <div className="card-body text-center">
                        <h6 className="card-subtitle mb-2 text-white-50 small">Clients Paid Dues</h6>
                        <h5 className="card-title mb-0">
                          {financialSummary.lrd?.clientsPaidDues || 0}
                        </h5>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-12 mt-3">
                    <div className="card bg-success text-white">
                      <div className="card-body text-center">
                        <h6 className="card-subtitle mb-2 text-white-50">Grand Total Savings (LRD)</h6>
                        <h2 className="card-title mb-0">
                          LRD {financialSummary.lrd?.overallTotalSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </h2>
                        <small className="text-white-50">Grand Total - Outstanding Loans</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* USD Financial Summary */}
          <div className="col-md-12 mb-4">
            <div className="card">
              <div className="card-header bg-success text-white">
                <h5 className="mb-0"><i className="fas fa-dollar-sign me-2"></i>USD Financial Reports</h5>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-2">
                    <div className="card bg-primary text-white">
                      <div className="card-body text-center">
                        <h6 className="card-subtitle mb-2 text-white-50 small">Total Savings</h6>
                        <h5 className="card-title mb-0">
                          ${financialSummary.usd?.totalSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </h5>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="card bg-success text-white">
                      <div className="card-body text-center">
                        <h6 className="card-subtitle mb-2 text-white-50 small">Personal Interest</h6>
                        <h5 className="card-title mb-0">
                          ${financialSummary.usd?.totalPersonalInterest.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </h5>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="card bg-info text-white">
                      <div className="card-body text-center">
                        <h6 className="card-subtitle mb-2 text-white-50 small">General Interest</h6>
                        <h5 className="card-title mb-0">
                          ${financialSummary.usd?.totalGeneralInterest.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </h5>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="card bg-danger text-white">
                      <div className="card-body text-center">
                        <h6 className="card-subtitle mb-2 text-white-50 small">Outstanding Dues</h6>
                        <h5 className="card-title mb-0">
                          ${financialSummary.usd?.outstandingDues.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </h5>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="card bg-warning text-white">
                      <div className="card-body text-center">
                        <h6 className="card-subtitle mb-2 text-white-50 small">Monthly Dues</h6>
                        <h5 className="card-title mb-0">
                          ${financialSummary.usd?.monthlyDues.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </h5>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="card bg-secondary text-white">
                      <div className="card-body text-center">
                        <h6 className="card-subtitle mb-2 text-white-50 small">Grand Total</h6>
                        <h5 className="card-title mb-0">
                          ${financialSummary.usd?.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </h5>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="card bg-dark text-white">
                      <div className="card-body text-center">
                        <h6 className="card-subtitle mb-2 text-white-50 small">Total Loans</h6>
                        <h5 className="card-title mb-0">
                          ${financialSummary.usd?.totalLoans.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </h5>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="card bg-danger text-white">
                      <div className="card-body text-center">
                        <h6 className="card-subtitle mb-2 text-white-50 small">Outstanding Loans</h6>
                        <h5 className="card-title mb-0">
                          ${financialSummary.usd?.totalOutstandingLoans.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </h5>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="card bg-warning text-white">
                      <div className="card-body text-center">
                        <h6 className="card-subtitle mb-2 text-white-50 small">Outstanding Savings</h6>
                        <h5 className="card-title mb-0">
                          ${financialSummary.usd?.outstandingSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </h5>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="card bg-secondary text-white">
                      <div className="card-body text-center">
                        <h6 className="card-subtitle mb-2 text-white-50 small">Total Fines</h6>
                        <h5 className="card-title mb-0">
                          ${financialSummary.usd?.totalFines.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </h5>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="card bg-danger text-white">
                      <div className="card-body text-center">
                        <h6 className="card-subtitle mb-2 text-white-50 small">Clients with Dues</h6>
                        <h5 className="card-title mb-0">
                          {financialSummary.usd?.clientsWithOutstandingDues || 0}
                        </h5>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="card bg-success text-white">
                      <div className="card-body text-center">
                        <h6 className="card-subtitle mb-2 text-white-50 small">Clients Paid Dues</h6>
                        <h5 className="card-title mb-0">
                          {financialSummary.usd?.clientsPaidDues || 0}
                        </h5>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-12 mt-3">
                    <div className="card bg-success text-white">
                      <div className="card-body text-center">
                        <h6 className="card-subtitle mb-2 text-white-50">Grand Total Savings (USD)</h6>
                        <h2 className="card-title mb-0">
                          ${financialSummary.usd?.overallTotalSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </h2>
                        <small className="text-white-50">Grand Total - Outstanding Loans</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Report Cards */}
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
