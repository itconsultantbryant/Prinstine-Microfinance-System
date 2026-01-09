import React, { useState, useEffect } from 'react';
import apiClient from '../config/axios';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import moment from 'moment';

const RecycleBin = () => {
  const [deletedClients, setDeletedClients] = useState([]);
  const [deletedLoans, setDeletedLoans] = useState([]);
  const [deletedTransactions, setDeletedTransactions] = useState([]);
  const [deletedSavings, setDeletedSavings] = useState([]);
  const [deletedCollaterals, setDeletedCollaterals] = useState([]);
  const [deletedKycDocs, setDeletedKycDocs] = useState([]);
  const [deletedBranches, setDeletedBranches] = useState([]);
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
      const data = response.data.data;
      setDeletedClients(data.clients || []);
      setDeletedLoans(data.loans || []);
      setDeletedTransactions(data.transactions || []);
      setDeletedSavings(data.savings || []);
      setDeletedCollaterals(data.collaterals || []);
      setDeletedKycDocs(data.kyc_documents || []);
      setDeletedBranches(data.branches || []);
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
        'clients': 'clients',
        'loans': 'loans',
        'transactions': 'transactions',
        'savings': 'savings',
        'collaterals': 'collaterals',
        'kyc': 'kyc',
        'branches': 'branches'
      };
      await apiClient.post(`/api/recycle/${typeMap[type]}/${id}/restore`);
      const itemNames = {
        'clients': 'Client',
        'loans': 'Loan',
        'transactions': 'Transaction',
        'savings': 'Savings account',
        'collaterals': 'Collateral',
        'kyc': 'KYC document',
        'branches': 'Branch'
      };
      toast.success(`${itemNames[type]} restored successfully!`);
      fetchDeletedItems();
    } catch (error) {
      toast.error(error.response?.data?.message || `Failed to restore ${type}`);
    }
  };

  const handlePermanentDelete = async (type, id) => {
    const itemNames = {
      'clients': 'client',
      'loans': 'loan',
      'transactions': 'transaction',
      'savings': 'savings account',
      'collaterals': 'collateral',
      'kyc': 'KYC document',
      'branches': 'branch'
    };
    if (!window.confirm(`Are you sure you want to permanently delete this ${itemNames[type]}? This action cannot be undone!`)) {
      return;
    }
    try {
      const typeMap = {
        'clients': 'clients',
        'loans': 'loans',
        'transactions': 'transactions',
        'savings': 'savings',
        'collaterals': 'collaterals',
        'kyc': 'kyc',
        'branches': 'branches'
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
      </ul>

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
    </div>
  );
};

export default RecycleBin;

