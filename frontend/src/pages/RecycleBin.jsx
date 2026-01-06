import React, { useState, useEffect } from 'react';
import apiClient from '../config/axios';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import moment from 'moment';

const RecycleBin = () => {
  const [deletedClients, setDeletedClients] = useState([]);
  const [deletedLoans, setDeletedLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('clients'); // 'clients' or 'loans'

  useEffect(() => {
    fetchDeletedItems();
  }, [activeTab]);

  const fetchDeletedItems = async () => {
    try {
      const response = await apiClient.get('/api/recycle', {
        params: { type: activeTab }
      });
      if (activeTab === 'clients') {
        setDeletedClients(response.data.data.clients || []);
      } else {
        setDeletedLoans(response.data.data.loans || []);
      }
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch deleted items:', error);
      toast.error('Failed to load deleted items');
      setLoading(false);
    }
  };

  const handleRestore = async (type, id) => {
    try {
      await apiClient.post(`/api/recycle/${type}/${id}/restore`);
      toast.success(`${type === 'clients' ? 'Client' : 'Loan'} restored successfully!`);
      fetchDeletedItems();
    } catch (error) {
      toast.error(error.response?.data?.message || `Failed to restore ${type}`);
    }
  };

  const handlePermanentDelete = async (type, id) => {
    if (!window.confirm(`Are you sure you want to permanently delete this ${type === 'clients' ? 'client' : 'loan'}? This action cannot be undone!`)) {
      return;
    }
    try {
      await apiClient.delete(`/api/recycle/${type}/${id}`);
      toast.success(`${type === 'clients' ? 'Client' : 'Loan'} permanently deleted`);
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
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'clients' ? 'active' : ''}`}
            onClick={() => setActiveTab('clients')}
          >
            <i className="fas fa-users me-2"></i>Deleted Clients ({deletedClients.length})
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'loans' ? 'active' : ''}`}
            onClick={() => setActiveTab('loans')}
          >
            <i className="fas fa-hand-holding-usd me-2"></i>Deleted Loans ({deletedLoans.length})
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
    </div>
  );
};

export default RecycleBin;

