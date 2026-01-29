import React, { useState, useEffect } from 'react';
import apiClient from '../config/axios';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const LoanApplications = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApplications();
    
    // Real-time updates every 5 seconds
    const interval = setInterval(() => {
      fetchApplications();
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchApplications = async () => {
    try {
      const response = await apiClient.get('/api/loans', { params: { status: 'pending' } });
      setApplications(response.data.data.loans || []);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch applications:', error);
      toast.error('Failed to load loan applications');
      setLoading(false);
    }
  };

  const handleEdit = async (loanId) => {
    try {
      const response = await apiClient.get(`/api/loans/${loanId}`);
      // Navigate to loans page with edit mode
      window.location.href = `/loans?edit=${loanId}`;
    } catch (error) {
      console.error('Failed to fetch loan details:', error);
      toast.error('Failed to load loan details');
    }
  };

  const handleDelete = async (loanId) => {
    if (!window.confirm('Are you sure you want to delete this loan application? It will be moved to the Recycle Bin.')) {
      return;
    }

    try {
      await apiClient.delete(`/api/loans/${loanId}`);
      toast.success('Loan application deleted successfully');
      fetchApplications();
    } catch (error) {
      console.error('Failed to delete loan application:', error);
      toast.error(error.response?.data?.message || 'Failed to delete loan application');
    }
  };

  const handleApprove = async (loanId) => {
    try {
      await apiClient.post(`/api/loans/${loanId}/approve`);
      toast.success('Loan application approved successfully!');
      fetchApplications();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve loan application');
    }
  };

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-1">Loan Applications</h1>
          <p className="text-muted">Review and process loan applications</p>
        </div>
      </div>

      <div className="card">
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
                    <th>Loan Number</th>
                    <th>Client</th>
                    <th>Amount</th>
                    <th>Currency</th>
                    <th>Type</th>
                    <th>Term</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.length > 0 ? (
                    applications.map((app) => (
                      <tr key={app.id} className="hover-lift">
                        <td><strong>{app.loan_number}</strong></td>
                        <td>{app.client?.first_name} {app.client?.last_name}</td>
                        <td>{app.currency === 'LRD' ? 'LRD' : '$'}{parseFloat(app.amount).toLocaleString()}</td>
                        <td>{app.currency || 'USD'}</td>
                        <td>{app.loan_type}</td>
                        <td>{app.term_months} months</td>
                        <td>
                          <span className="badge bg-warning">{app.status}</span>
                        </td>
                        <td>
                          <div className="btn-group">
                            <Link
                              to={`/loans/${app.id}`}
                              className="btn btn-sm btn-outline-info"
                              title="View Details"
                            >
                              <i className="fas fa-eye"></i>
                            </Link>
                            {user?.role !== 'borrower' && user?.role === 'admin' && (
                              <button
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => handleEdit(app.id)}
                                title="Edit"
                              >
                                <i className="fas fa-edit"></i>
                              </button>
                            )}
                            {user?.role !== 'borrower' && (
                              <button
                                className="btn btn-sm btn-outline-success"
                                onClick={() => handleApprove(app.id)}
                                title="Approve"
                              >
                                <i className="fas fa-check"></i>
                              </button>
                            )}
                            {user?.role === 'admin' && (
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleDelete(app.id)}
                                title="Delete"
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="text-center text-muted py-5">
                        No pending applications
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoanApplications;

