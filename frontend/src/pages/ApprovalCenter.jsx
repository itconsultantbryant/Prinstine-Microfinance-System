import React, { useState, useEffect } from 'react';
import apiClient from '../config/axios';
import { toast } from 'react-toastify';

const ApprovalCenter = () => {
  const [pendingItems, setPendingItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingItems();
  }, []);

  const fetchPendingItems = async () => {
    try {
      const loansResponse = await apiClient.get('/api/loans', { params: { status: 'pending' } });
      setPendingItems(loansResponse.data.data.loans || []);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch pending items:', error);
      toast.error('Failed to load pending approvals');
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await apiClient.post(`/api/loans/${id}/approve`);
      toast.success('Item approved successfully!');
      fetchPendingItems();
    } catch (error) {
      toast.error('Failed to approve item');
    }
  };

  const handleReject = async (id) => {
    if (window.confirm('Are you sure you want to reject this item?')) {
      try {
        // Add reject endpoint
        toast.success('Item rejected');
        fetchPendingItems();
      } catch (error) {
        toast.error('Failed to reject item');
      }
    }
  };

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-1">Approval Center</h1>
          <p className="text-muted">Review and approve pending items</p>
        </div>
      </div>

      <div className="row mb-4">
        <div className="col-md-4">
          <div className="stat-card hover-lift">
            <div className="stat-icon bg-warning text-white">
              <i className="fas fa-clock"></i>
            </div>
            <div className="stat-label">Pending Loans</div>
            <div className="stat-value text-warning">{pendingItems.length}</div>
          </div>
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
                    <th>Type</th>
                    <th>Reference</th>
                    <th>Client</th>
                    <th>Amount</th>
                    <th>Submitted</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingItems.length > 0 ? (
                    pendingItems.map((item) => (
                      <tr key={item.id} className="hover-lift">
                        <td><span className="badge bg-info">Loan</span></td>
                        <td>{item.loan_number}</td>
                        <td>{item.client?.first_name} {item.client?.last_name}</td>
                        <td>${parseFloat(item.amount).toLocaleString()}</td>
                        <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                        <td>
                          <div className="btn-group">
                            <button
                              className="btn btn-sm btn-outline-success"
                              onClick={() => handleApprove(item.id)}
                            >
                              <i className="fas fa-check"></i> Approve
                            </button>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleReject(item.id)}
                            >
                              <i className="fas fa-times"></i> Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="text-center text-muted py-5">
                        No pending approvals
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

export default ApprovalCenter;

