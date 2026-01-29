import React, { useState, useEffect } from 'react';
import apiClient from '../config/axios';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import moment from 'moment';

const RecycleBin = () => {
  const [deletedUsers, setDeletedUsers] = useState([]);
  const [deletedClients, setDeletedClients] = useState([]);
  const [deletedLoans, setDeletedLoans] = useState([]);
  const [deletedTransactions, setDeletedTransactions] = useState([]);
  const [deletedSavings, setDeletedSavings] = useState([]);
  const [deletedCollaterals, setDeletedCollaterals] = useState([]);
  const [deletedKycDocs, setDeletedKycDocs] = useState([]);
  const [deletedBranches, setDeletedBranches] = useState([]);
  const [deletedRevenues, setDeletedRevenues] = useState([]);
  const [deletedLoanRepayments, setDeletedLoanRepayments] = useState([]);
  const [deletedCollections, setDeletedCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('clients');

  useEffect(() => {
    fetchDeletedItems();
  }, [activeTab]);

  const fetchDeletedItems = async () => {
    try {
      const response = await apiClient.get('/api/recycle', {
        params: { type: activeTab }
      });
      const data = response.data?.data ?? {};
      setDeletedUsers(data.users ?? []);
      setDeletedClients(data.clients ?? []);
      setDeletedLoans(data.loans ?? []);
      setDeletedTransactions(data.transactions ?? []);
      setDeletedSavings(data.savings ?? []);
      setDeletedCollaterals(data.collaterals ?? []);
      setDeletedKycDocs(data.kyc_documents ?? []);
      setDeletedBranches(data.branches ?? []);
      setDeletedRevenues(data.revenues ?? []);
      setDeletedLoanRepayments(data.loan_repayments ?? []);
      setDeletedCollections(data.collections ?? []);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch deleted items:', error);
      toast.error('Failed to load deleted items');
      setLoading(false);
    }
  };

  const handleRestore = async (type, id) => {
    try {
      const typeMap = {
        'users': 'users',
        'clients': 'clients',
        'loans': 'loans',
        'transactions': 'transactions',
        'savings': 'savings',
        'collaterals': 'collaterals',
        'kyc': 'kyc',
        'branches': 'branches',
        'revenues': 'revenues',
        'loan_repayments': 'loan-repayments',
        'collections': 'collections'
      };
      await apiClient.post(`/api/recycle/${typeMap[type]}/${id}/restore`);
      const itemNames = {
        'users': 'User',
        'clients': 'Client',
        'loans': 'Loan',
        'transactions': 'Transaction',
        'savings': 'Savings account',
        'collaterals': 'Collateral',
        'kyc': 'KYC document',
        'branches': 'Branch',
        'revenues': 'Revenue',
        'loan_repayments': 'Loan repayment',
        'collections': 'Collection'
      };
      toast.success(`${itemNames[type]} restored successfully!`);
      fetchDeletedItems();
    } catch (error) {
      toast.error(error.response?.data?.message || `Failed to restore ${type}`);
    }
  };

  const handlePermanentDelete = async (type, id) => {
    const itemNames = {
      'users': 'user',
      'clients': 'client',
      'loans': 'loan',
      'transactions': 'transaction',
      'savings': 'savings account',
      'collaterals': 'collateral',
      'kyc': 'KYC document',
      'branches': 'branch',
      'revenues': 'revenue',
      'loan_repayments': 'loan repayment',
      'collections': 'collection'
    };
    if (!window.confirm(`Are you sure you want to permanently delete this ${itemNames[type]}? This action cannot be undone!`)) {
      return;
    }
    try {
      const typeMap = {
        'users': 'users',
        'clients': 'clients',
        'loans': 'loans',
        'transactions': 'transactions',
        'savings': 'savings',
        'collaterals': 'collaterals',
        'kyc': 'kyc',
        'branches': 'branches',
        'revenues': 'revenues',
        'loan_repayments': 'loan-repayments',
        'collections': 'collections'
      };
      await apiClient.delete(`/api/recycle/${typeMap[type]}/${id}`);
      toast.success(`${itemNames[type]} permanently deleted`);
      fetchDeletedItems();
    } catch (error) {
      toast.error(error.response?.data?.message || `Failed to permanently delete ${type}`);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-1">
            <i className="fas fa-trash-restore me-2"></i>Recycle Bin
          </h1>
          <p className="text-muted">Restore or permanently delete deleted items</p>
        </div>
      </div>

      {/* Tabs */}
      <ul className="nav nav-tabs mb-4" style={{ flexWrap: 'wrap' }}>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <i className="fas fa-user-shield me-2"></i>Users ({deletedUsers.length})
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'clients' ? 'active' : ''}`}
            onClick={() => setActiveTab('clients')}
          >
            <i className="fas fa-users me-2"></i>Clients ({deletedClients.length})
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'loans' ? 'active' : ''}`}
            onClick={() => setActiveTab('loans')}
          >
            <i className="fas fa-hand-holding-usd me-2"></i>Loans ({deletedLoans.length})
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'transactions' ? 'active' : ''}`}
            onClick={() => setActiveTab('transactions')}
          >
            <i className="fas fa-exchange-alt me-2"></i>Transactions ({deletedTransactions.length})
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'savings' ? 'active' : ''}`}
            onClick={() => setActiveTab('savings')}
          >
            <i className="fas fa-piggy-bank me-2"></i>Savings ({deletedSavings.length})
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'collaterals' ? 'active' : ''}`}
            onClick={() => setActiveTab('collaterals')}
          >
            <i className="fas fa-shield-alt me-2"></i>Collaterals ({deletedCollaterals.length})
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'kyc' ? 'active' : ''}`}
            onClick={() => setActiveTab('kyc')}
          >
            <i className="fas fa-file-alt me-2"></i>KYC Docs ({deletedKycDocs.length})
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'branches' ? 'active' : ''}`}
            onClick={() => setActiveTab('branches')}
          >
            <i className="fas fa-building me-2"></i>Branches ({deletedBranches.length})
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'revenues' ? 'active' : ''}`}
            onClick={() => setActiveTab('revenues')}
          >
            <i className="fas fa-coins me-2"></i>Revenues ({deletedRevenues.length})
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'loan_repayments' ? 'active' : ''}`}
            onClick={() => setActiveTab('loan_repayments')}
          >
            <i className="fas fa-receipt me-2"></i>Loan Repayments ({deletedLoanRepayments.length})
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'collections' ? 'active' : ''}`}
            onClick={() => setActiveTab('collections')}
          >
            <i className="fas fa-hand-holding-heart me-2"></i>Collections ({deletedCollections.length})
          </button>
        </li>
      </ul>

      {/* Deleted Users */}
      {activeTab === 'users' && (
        <div className="card">
          <div className="card-body p-0">
            {deletedUsers.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Deleted At</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deletedUsers.map((user) => (
                      <tr key={user.id}>
                        <td><strong>{user.name}</strong></td>
                        <td>{user.username}</td>
                        <td>{user.email}</td>
                        <td>
                          <span className="badge bg-secondary">
                            {user.role?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        </td>
                        <td>{moment(user.deleted_at).format('YYYY-MM-DD HH:mm')}</td>
                        <td>
                          <button
                            className="btn btn-sm btn-success me-2"
                            onClick={() => handleRestore('users', user.id)}
                          >
                            <i className="fas fa-undo me-1"></i>Restore
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handlePermanentDelete('users', user.id)}
                          >
                            <i className="fas fa-trash me-1"></i>Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center p-4">
                <p className="text-muted">No deleted users found</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Deleted Clients */}
      {activeTab === 'clients' && (
        <div className="card">
          <div className="card-body p-0">
            {deletedClients.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead>
                    <tr>
                      <th>Client Number</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Deleted At</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deletedClients.map((client) => (
                      <tr key={client.id}>
                        <td><strong>{client.client_number}</strong></td>
                        <td>{client.first_name} {client.last_name}</td>
                        <td>{client.email}</td>
                        <td>{client.phone || '-'}</td>
                        <td>{moment(client.deleted_at).format('YYYY-MM-DD HH:mm')}</td>
                        <td>
                          <button
                            className="btn btn-sm btn-success me-2"
                            onClick={() => handleRestore('clients', client.id)}
                            title="Restore"
                          >
                            <i className="fas fa-undo me-1"></i>Restore
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handlePermanentDelete('clients', client.id)}
                            title="Permanently Delete"
                          >
                            <i className="fas fa-trash-alt me-1"></i>Delete Forever
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-5">
                <i className="fas fa-trash fa-3x text-muted mb-3 d-block"></i>
                <p className="text-muted">No deleted clients found</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Deleted Loans */}
      {activeTab === 'loans' && (
        <div className="card">
          <div className="card-body p-0">
            {deletedLoans.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead>
                    <tr>
                      <th>Loan Number</th>
                      <th>Client</th>
                      <th>Amount</th>
                      <th>Interest Rate</th>
                      <th>Term</th>
                      <th>Status</th>
                      <th>Deleted At</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deletedLoans.map((loan) => (
                      <tr key={loan.id}>
                        <td><strong>{loan.loan_number}</strong></td>
                        <td>
                          {loan.client ? `${loan.client.first_name} ${loan.client.last_name}` : '-'}
                        </td>
                        <td>${parseFloat(loan.amount).toLocaleString()}</td>
                        <td>{loan.interest_rate}%</td>
                        <td>{loan.term_months} months</td>
                        <td>
                          <span className={`badge bg-secondary`}>
                            {loan.status}
                          </span>
                        </td>
                        <td>{moment(loan.deleted_at).format('YYYY-MM-DD HH:mm')}</td>
                        <td>
                          <button
                            className="btn btn-sm btn-success me-2"
                            onClick={() => handleRestore('loans', loan.id)}
                            title="Restore"
                          >
                            <i className="fas fa-undo me-1"></i>Restore
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handlePermanentDelete('loans', loan.id)}
                            title="Permanently Delete"
                          >
                            <i className="fas fa-trash-alt me-1"></i>Delete Forever
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-5">
                <i className="fas fa-trash fa-3x text-muted mb-3 d-block"></i>
                <p className="text-muted">No deleted loans found</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Deleted Transactions */}
      {activeTab === 'transactions' && (
        <div className="card">
          <div className="card-body p-0">
            {deletedTransactions.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead>
                    <tr>
                      <th>Transaction Number</th>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Client</th>
                      <th>Deleted At</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deletedTransactions.map((transaction) => (
                      <tr key={transaction.id}>
                        <td><strong>{transaction.transaction_number}</strong></td>
                        <td>{transaction.type}</td>
                        <td>{transaction.currency === 'LRD' ? 'LRD' : '$'}{parseFloat(transaction.amount || 0).toLocaleString()}</td>
                        <td>{transaction.client ? `${transaction.client.first_name} ${transaction.client.last_name}` : '-'}</td>
                        <td>{moment(transaction.deleted_at).format('YYYY-MM-DD HH:mm')}</td>
                        <td>
                          <button className="btn btn-sm btn-success me-2" onClick={() => handleRestore('transactions', transaction.id)}>
                            <i className="fas fa-undo me-1"></i>Restore
                          </button>
                          <button className="btn btn-sm btn-danger" onClick={() => handlePermanentDelete('transactions', transaction.id)}>
                            <i className="fas fa-trash-alt me-1"></i>Delete Forever
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-5">
                <i className="fas fa-trash fa-3x text-muted mb-3 d-block"></i>
                <p className="text-muted">No deleted transactions found</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Deleted Savings */}
      {activeTab === 'savings' && (
        <div className="card">
          <div className="card-body p-0">
            {deletedSavings.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead>
                    <tr>
                      <th>Account Number</th>
                      <th>Client</th>
                      <th>Type</th>
                      <th>Balance</th>
                      <th>Deleted At</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deletedSavings.map((savings) => (
                      <tr key={savings.id}>
                        <td><strong>{savings.account_number}</strong></td>
                        <td>{savings.client ? `${savings.client.first_name} ${savings.client.last_name}` : '-'}</td>
                        <td>{savings.account_type}</td>
                        <td>{savings.currency === 'LRD' ? 'LRD' : '$'}{parseFloat(savings.balance || 0).toLocaleString()}</td>
                        <td>{moment(savings.deleted_at).format('YYYY-MM-DD HH:mm')}</td>
                        <td>
                          <button className="btn btn-sm btn-success me-2" onClick={() => handleRestore('savings', savings.id)}>
                            <i className="fas fa-undo me-1"></i>Restore
                          </button>
                          <button className="btn btn-sm btn-danger" onClick={() => handlePermanentDelete('savings', savings.id)}>
                            <i className="fas fa-trash-alt me-1"></i>Delete Forever
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-5">
                <i className="fas fa-trash fa-3x text-muted mb-3 d-block"></i>
                <p className="text-muted">No deleted savings accounts found</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Deleted Collaterals */}
      {activeTab === 'collaterals' && (
        <div className="card">
          <div className="card-body p-0">
            {deletedCollaterals.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Client</th>
                      <th>Estimated Value</th>
                      <th>Status</th>
                      <th>Deleted At</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deletedCollaterals.map((collateral) => (
                      <tr key={collateral.id}>
                        <td>{collateral.type}</td>
                        <td>{collateral.client ? `${collateral.client.first_name} ${collateral.client.last_name}` : '-'}</td>
                        <td>{collateral.currency === 'LRD' ? 'LRD' : '$'}{parseFloat(collateral.estimated_value || 0).toLocaleString()}</td>
                        <td>{collateral.status}</td>
                        <td>{moment(collateral.deleted_at).format('YYYY-MM-DD HH:mm')}</td>
                        <td>
                          <button className="btn btn-sm btn-success me-2" onClick={() => handleRestore('collaterals', collateral.id)}>
                            <i className="fas fa-undo me-1"></i>Restore
                          </button>
                          <button className="btn btn-sm btn-danger" onClick={() => handlePermanentDelete('collaterals', collateral.id)}>
                            <i className="fas fa-trash-alt me-1"></i>Delete Forever
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-5">
                <i className="fas fa-trash fa-3x text-muted mb-3 d-block"></i>
                <p className="text-muted">No deleted collaterals found</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Deleted KYC Documents */}
      {activeTab === 'kyc' && (
        <div className="card">
          <div className="card-body p-0">
            {deletedKycDocs.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead>
                    <tr>
                      <th>Document Type</th>
                      <th>Client</th>
                      <th>Document Number</th>
                      <th>Status</th>
                      <th>Deleted At</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deletedKycDocs.map((doc) => (
                      <tr key={doc.id}>
                        <td>{doc.document_type}</td>
                        <td>{doc.client ? `${doc.client.first_name} ${doc.client.last_name}` : '-'}</td>
                        <td>{doc.document_number || '-'}</td>
                        <td>{doc.status}</td>
                        <td>{moment(doc.deleted_at).format('YYYY-MM-DD HH:mm')}</td>
                        <td>
                          <button className="btn btn-sm btn-success me-2" onClick={() => handleRestore('kyc', doc.id)}>
                            <i className="fas fa-undo me-1"></i>Restore
                          </button>
                          <button className="btn btn-sm btn-danger" onClick={() => handlePermanentDelete('kyc', doc.id)}>
                            <i className="fas fa-trash-alt me-1"></i>Delete Forever
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-5">
                <i className="fas fa-trash fa-3x text-muted mb-3 d-block"></i>
                <p className="text-muted">No deleted KYC documents found</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Deleted Branches */}
      {activeTab === 'branches' && (
        <div className="card">
          <div className="card-body p-0">
            {deletedBranches.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Code</th>
                      <th>City</th>
                      <th>Manager</th>
                      <th>Deleted At</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deletedBranches.map((branch) => (
                      <tr key={branch.id}>
                        <td><strong>{branch.name}</strong></td>
                        <td>{branch.code}</td>
                        <td>{branch.city || '-'}</td>
                        <td>{branch.manager_name || '-'}</td>
                        <td>{moment(branch.deleted_at).format('YYYY-MM-DD HH:mm')}</td>
                        <td>
                          <button className="btn btn-sm btn-success me-2" onClick={() => handleRestore('branches', branch.id)}>
                            <i className="fas fa-undo me-1"></i>Restore
                          </button>
                          <button className="btn btn-sm btn-danger" onClick={() => handlePermanentDelete('branches', branch.id)}>
                            <i className="fas fa-trash-alt me-1"></i>Delete Forever
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-5">
                <i className="fas fa-trash fa-3x text-muted mb-3 d-block"></i>
                <p className="text-muted">No deleted branches found</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Deleted Revenues */}
      {activeTab === 'revenues' && (
        <div className="card">
          <div className="card-body p-0">
            {deletedRevenues.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead>
                    <tr>
                      <th>Revenue Number</th>
                      <th>Source</th>
                      <th>Amount</th>
                      <th>Currency</th>
                      <th>Related</th>
                      <th>Deleted At</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deletedRevenues.map((revenue) => (
                      <tr key={revenue.id}>
                        <td><strong>{revenue.revenue_number}</strong></td>
                        <td>{revenue.source}</td>
                        <td>{parseFloat(revenue.amount || 0).toLocaleString()}</td>
                        <td>{revenue.currency || 'USD'}</td>
                        <td>
                          {revenue.loan?.loan_number ? `Loan: ${revenue.loan.loan_number}` : 
                          revenue.transaction?.transaction_number ? `Txn: ${revenue.transaction.transaction_number}` : '-'}
                        </td>
                        <td>{moment(revenue.deleted_at).format('YYYY-MM-DD HH:mm')}</td>
                        <td>
                          <button className="btn btn-sm btn-success me-2" onClick={() => handleRestore('revenues', revenue.id)}>
                            <i className="fas fa-undo me-1"></i>Restore
                          </button>
                          <button className="btn btn-sm btn-danger" onClick={() => handlePermanentDelete('revenues', revenue.id)}>
                            <i className="fas fa-trash-alt me-1"></i>Delete Forever
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-5">
                <i className="fas fa-trash fa-3x text-muted mb-3 d-block"></i>
                <p className="text-muted">No deleted revenues found</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Deleted Loan Repayments */}
      {activeTab === 'loan_repayments' && (
        <div className="card">
          <div className="card-body p-0">
            {deletedLoanRepayments.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead>
                    <tr>
                      <th>Repayment Number</th>
                      <th>Loan</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Payment Date</th>
                      <th>Deleted At</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deletedLoanRepayments.map((repayment) => (
                      <tr key={repayment.id}>
                        <td><strong>{repayment.repayment_number}</strong></td>
                        <td>{repayment.loan?.loan_number || '-'}</td>
                        <td>{parseFloat(repayment.amount || 0).toLocaleString()}</td>
                        <td>{repayment.status}</td>
                        <td>{repayment.payment_date ? moment(repayment.payment_date).format('YYYY-MM-DD') : '-'}</td>
                        <td>{moment(repayment.deleted_at).format('YYYY-MM-DD HH:mm')}</td>
                        <td>
                          <button className="btn btn-sm btn-success me-2" onClick={() => handleRestore('loan_repayments', repayment.id)}>
                            <i className="fas fa-undo me-1"></i>Restore
                          </button>
                          <button className="btn btn-sm btn-danger" onClick={() => handlePermanentDelete('loan_repayments', repayment.id)}>
                            <i className="fas fa-trash-alt me-1"></i>Delete Forever
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-5">
                <i className="fas fa-trash fa-3x text-muted mb-3 d-block"></i>
                <p className="text-muted">No deleted loan repayments found</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Deleted Collections */}
      {activeTab === 'collections' && (
        <div className="card">
          <div className="card-body p-0">
            {deletedCollections.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead>
                    <tr>
                      <th>Collection Number</th>
                      <th>Loan</th>
                      <th>Amount Due</th>
                      <th>Amount Collected</th>
                      <th>Overdue Days</th>
                      <th>Status</th>
                      <th>Deleted At</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deletedCollections.map((collection) => (
                      <tr key={collection.id}>
                        <td><strong>{collection.collection_number}</strong></td>
                        <td>{collection.loan?.loan_number || '-'}</td>
                        <td>{parseFloat(collection.amount_due || 0).toLocaleString()}</td>
                        <td>{parseFloat(collection.amount_collected || 0).toLocaleString()}</td>
                        <td>{collection.overdue_days}</td>
                        <td>{collection.status}</td>
                        <td>{moment(collection.deleted_at).format('YYYY-MM-DD HH:mm')}</td>
                        <td>
                          <button className="btn btn-sm btn-success me-2" onClick={() => handleRestore('collections', collection.id)}>
                            <i className="fas fa-undo me-1"></i>Restore
                          </button>
                          <button className="btn btn-sm btn-danger" onClick={() => handlePermanentDelete('collections', collection.id)}>
                            <i className="fas fa-trash-alt me-1"></i>Delete Forever
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-5">
                <i className="fas fa-trash fa-3x text-muted mb-3 d-block"></i>
                <p className="text-muted">No deleted collections found</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RecycleBin;

