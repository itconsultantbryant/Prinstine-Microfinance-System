import React, { useState, useEffect } from 'react';
import apiClient from '../config/axios';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Receipt from '../components/Receipt';

const Loans = () => {
  const { user } = useAuth();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingLoan, setEditingLoan] = useState(null);
  const [clients, setClients] = useState([]);
  const [collaterals, setCollaterals] = useState([]);
  const [branches, setBranches] = useState([]);
  const [schedulePreview, setSchedulePreview] = useState(null);
  const [showRepayModal, setShowRepayModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [repayData, setRepayData] = useState({
    amount: '',
    payment_method: 'cash',
    payment_date: new Date().toISOString().split('T')[0],
    description: ''
  });
  const [receipt, setReceipt] = useState(null);
  const [formData, setFormData] = useState({
    client_id: '',
    amount: '',
    interest_rate: '',
    term_months: '',
    loan_type: 'personal',
    payment_frequency: 'monthly',
    interest_method: 'declining_balance', // Default to declining balance
    loan_purpose: '',
    collateral_id: '',
    disbursement_date: new Date().toISOString().split('T')[0],
    branch_id: '',
    notes: ''
  });

  useEffect(() => {
    fetchLoans();
    fetchClients();
    fetchCollaterals();
    fetchBranches();
    
    // Real-time updates every 5 seconds
    const interval = setInterval(() => {
      fetchLoans();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [search, statusFilter]);

  const fetchLoans = async () => {
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;
      
      const response = await apiClient.get('/api/loans', { params });
      setLoans(response.data.data.loans || []);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch loans:', error);
      toast.error('Failed to load loans');
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

  const fetchCollaterals = async () => {
    try {
      const response = await apiClient.get('/api/collaterals');
      setCollaterals(response.data.data.collaterals || []);
    } catch (error) {
      console.error('Failed to fetch collaterals:', error);
    }
  };

  const fetchBranches = async () => {
    try {
      const response = await apiClient.get('/api/branches');
      setBranches(response.data.data.branches || []);
    } catch (error) {
      console.error('Failed to fetch branches:', error);
    }
  };

  // Calculate repayment schedule preview
  const calculateSchedulePreview = async () => {
    if (!formData.amount || !formData.interest_rate || !formData.term_months) {
      setSchedulePreview(null);
      return;
    }

    try {
      const response = await apiClient.post('/api/loans/calculate-schedule', {
        principal: parseFloat(formData.amount),
        interest_rate: parseFloat(formData.interest_rate),
        term_months: parseInt(formData.term_months),
        interest_method: formData.interest_method,
        payment_frequency: formData.payment_frequency,
        start_date: formData.disbursement_date
      });
      setSchedulePreview(response.data.data);
    } catch (error) {
      console.error('Failed to calculate schedule:', error);
    }
  };

  useEffect(() => {
    if (formData.amount && formData.interest_rate && formData.term_months) {
      const timer = setTimeout(() => {
        calculateSchedulePreview();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [formData.amount, formData.interest_rate, formData.term_months, formData.interest_method, formData.payment_frequency, formData.disbursement_date]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Prepare data with proper types
      const submitData = {
        client_id: parseInt(formData.client_id),
        amount: parseFloat(formData.amount),
        interest_rate: parseFloat(formData.interest_rate),
        term_months: parseInt(formData.term_months),
        loan_type: formData.loan_type,
        payment_frequency: formData.payment_frequency,
        interest_method: formData.interest_method,
        loan_purpose: formData.loan_purpose || null,
        collateral_id: formData.collateral_id ? parseInt(formData.collateral_id) : null,
        disbursement_date: formData.disbursement_date || new Date().toISOString().split('T')[0],
        branch_id: formData.branch_id ? parseInt(formData.branch_id) : null,
        notes: formData.notes || null
      };

      // Validate required fields
      if (!submitData.client_id || !submitData.amount || !submitData.interest_rate || !submitData.term_months) {
        toast.error('Please fill in all required fields');
        return;
      }

      if (isNaN(submitData.client_id) || isNaN(submitData.amount) || isNaN(submitData.interest_rate) || isNaN(submitData.term_months)) {
        toast.error('Please enter valid numeric values');
        return;
      }

      const response = await apiClient.post('/api/loans', submitData);
      toast.success('Loan created successfully!');
      
      // Show success with schedule info
      if (response.data.data.schedule_summary) {
        toast.info(`Monthly Payment: $${response.data.data.schedule_summary.monthly_payment.toFixed(2)}`);
      }
      
      setShowModal(false);
      setFormData({
        client_id: '',
        amount: '',
        interest_rate: '',
        term_months: '',
        loan_type: 'personal',
        payment_frequency: 'monthly',
        interest_method: 'declining_balance',
        loan_purpose: '',
        collateral_id: '',
        disbursement_date: new Date().toISOString().split('T')[0],
        branch_id: '',
        notes: ''
      });
      setSchedulePreview(null);
      fetchLoans();
    } catch (error) {
      console.error('Loan creation error:', error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          (error.response?.data?.errors && error.response.data.errors.map(e => e.msg).join(', ')) ||
                          'Failed to create loan';
      toast.error(errorMessage);
    }
  };

  const handleApprove = async (loanId) => {
    try {
      await apiClient.post(`/api/loans/${loanId}/approve`);
      toast.success('Loan approved successfully!');
      fetchLoans();
    } catch (error) {
      toast.error('Failed to approve loan');
    }
  };

  const handleDisburse = async (loanId) => {
    try {
      await apiClient.post(`/api/loans/${loanId}/disburse`);
      toast.success('Loan disbursed successfully!');
      fetchLoans();
    } catch (error) {
      toast.error('Failed to disburse loan');
    }
  };

  const handleRepay = async (e) => {
    e.preventDefault();
    try {
      const response = await apiClient.post(`/api/loans/${selectedLoan.id}/repay`, repayData);
      toast.success('Repayment processed successfully!');
      setShowRepayModal(false);
      setRepayData({
        amount: '',
        payment_method: 'cash',
        payment_date: new Date().toISOString().split('T')[0],
        description: ''
      });
      setReceipt(response.data.data.receipt);
      fetchLoans(); // Real-time update
    } catch (error) {
      console.error('Failed to process repayment:', error);
      toast.error(error.response?.data?.message || 'Failed to process repayment');
    }
  };

  const downloadSchedule = async (loanId) => {
    try {
      const response = await apiClient.get(`/api/loans/${loanId}/schedule`);
      // Generate HTML for printing/downloading
      const schedule = response.data.data.schedule || [];
      const loan = response.data.data.loan || {};
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Repayment Schedule - ${loan.loan_number}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <h1>Loan Repayment Schedule</h1>
          <p><strong>Loan Number:</strong> ${loan.loan_number}</p>
          <p><strong>Amount:</strong> $${parseFloat(loan.amount || 0).toFixed(2)}</p>
          <p><strong>Interest Rate:</strong> ${loan.interest_rate}%</p>
          <p><strong>Term:</strong> ${loan.term_months} months</p>
          <p><strong>Monthly Payment:</strong> $${parseFloat(loan.monthly_payment || 0).toFixed(2)}</p>
          <table>
            <thead>
              <tr>
                <th>Installment</th>
                <th>Due Date</th>
                <th>Principal</th>
                <th>Interest</th>
                <th>Total Payment</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${schedule.map(item => `
                <tr>
                  <td>${item.installment_number}</td>
                  <td>${item.due_date}</td>
                  <td>$${parseFloat(item.principal_payment || 0).toFixed(2)}</td>
                  <td>$${parseFloat(item.interest_payment || 0).toFixed(2)}</td>
                  <td>$${parseFloat(item.total_payment || 0).toFixed(2)}</td>
                  <td>${item.status || 'pending'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
        </html>
      `;
      
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `loan-schedule-${loanId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Repayment schedule downloaded!');
    } catch (error) {
      toast.error('Failed to download schedule');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'warning',
      approved: 'info',
      disbursed: 'primary',
      active: 'success',
      overdue: 'danger',
      completed: 'secondary',
      cancelled: 'dark',
      defaulted: 'danger'
    };
    return badges[status] || 'secondary';
  };

  // Filter collaterals by selected client
  const clientCollaterals = formData.client_id 
    ? collaterals.filter(c => c.client_id === parseInt(formData.client_id))
    : [];

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-1">Loans</h1>
          <p className="text-muted">Manage all loan applications and disbursements</p>
        </div>
        <button
          className="btn btn-primary hover-lift"
          onClick={() => setShowModal(true)}
        >
          <i className="fas fa-plus me-2"></i>New Loan Application
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-8">
              <div className="input-group">
                <span className="input-group-text">
                  <i className="fas fa-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search loans by loan number..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-4">
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="disbursed">Disbursed</option>
                <option value="active">Active</option>
                <option value="overdue">Overdue</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Loans Table */}
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
                    <th>Interest Rate</th>
                    <th>Method</th>
                    <th>Term</th>
                    <th>Outstanding</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loans.length > 0 ? (
                    loans.map((loan) => (
                      <tr key={loan.id} className="hover-lift">
                        <td>
                          <strong>{loan.loan_number}</strong>
                        </td>
                        <td>
                          {loan.client?.first_name} {loan.client?.last_name}
                        </td>
                        <td>${parseFloat(loan.amount).toLocaleString()}</td>
                        <td>{loan.interest_rate}%</td>
                        <td>
                          <span className="badge bg-info">
                            {loan.interest_method === 'flat' ? 'Flat' : 'Declining'}
                          </span>
                        </td>
                        <td>{loan.term_months} months</td>
                        <td>${parseFloat(loan.outstanding_balance || 0).toLocaleString()}</td>
                        <td>
                          <span className={`badge bg-${getStatusBadge(loan.status)}`}>
                            {loan.status}
                          </span>
                        </td>
                        <td>
                          <div className="btn-group">
                            <Link
                              to={`/loans/${loan.id}`}
                              className="btn btn-sm btn-outline-primary"
                              title="View Details"
                            >
                              <i className="fas fa-eye"></i>
                            </Link>
                            {loan.status === 'pending' && (
                              <button
                                className="btn btn-sm btn-outline-success"
                                onClick={() => handleApprove(loan.id)}
                                title="Approve"
                              >
                                <i className="fas fa-check"></i>
                              </button>
                            )}
                            {loan.status === 'approved' && (
                              <button
                                className="btn btn-sm btn-outline-info"
                                onClick={() => handleDisburse(loan.id)}
                                title="Disburse"
                              >
                                <i className="fas fa-money-bill-wave"></i>
                              </button>
                            )}
                            {(loan.status === 'active' || loan.status === 'disbursed') && (
                              <>
                                <button
                                  className="btn btn-sm btn-outline-success"
                                  onClick={() => {
                                    setSelectedLoan(loan);
                                    setShowRepayModal(true);
                                  }}
                                  title="Make Repayment"
                                >
                                  <i className="fas fa-money-bill-wave"></i>
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-secondary"
                                  onClick={() => downloadSchedule(loan.id)}
                                  title="Download Schedule"
                                >
                                  <i className="fas fa-download"></i>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="9" className="text-center text-muted py-5">
                        <i className="fas fa-hand-holding-usd fa-3x mb-3 d-block"></i>
                        No loans found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Comprehensive Create Loan Modal */}
      {showModal && (
        <>
          <div className="modal fade show" style={{ display: 'block', zIndex: 1050 }} tabIndex="-1">
            <div className="modal-dialog modal-xl modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">New Loan Application</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => {
                      setShowModal(false);
                      setSchedulePreview(null);
                    }}
                  ></button>
                </div>
                <form onSubmit={handleSubmit}>
                  <div className="modal-body">
                    {/* Basic Information */}
                    <h6 className="mb-3 text-primary">
                      <i className="fas fa-info-circle me-2"></i>Basic Information
                    </h6>
                    <div className="row g-3 mb-4">
                      <div className="col-md-6">
                        <label className="form-label">Client <span className="text-danger">*</span></label>
                        <select
                          className="form-select"
                          required
                          value={formData.client_id}
                          onChange={(e) => setFormData({ ...formData, client_id: e.target.value, collateral_id: '' })}
                        >
                          <option value="">Select Client</option>
                          {clients.map((client) => (
                            <option key={client.id} value={client.id}>
                              {client.first_name} {client.last_name} - {client.client_number}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Loan Type <span className="text-danger">*</span></label>
                        <select
                          className="form-select"
                          required
                          value={formData.loan_type}
                          onChange={(e) => setFormData({ ...formData, loan_type: e.target.value })}
                        >
                          <option value="personal">Personal</option>
                          <option value="business">Business</option>
                          <option value="agricultural">Agricultural</option>
                          <option value="education">Education</option>
                          <option value="housing">Housing</option>
                          <option value="micro">Micro</option>
                          <option value="group">Group</option>
                          <option value="emergency">Emergency</option>
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Loan Purpose</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g., Business expansion, Education fees"
                          value={formData.loan_purpose}
                          onChange={(e) => setFormData({ ...formData, loan_purpose: e.target.value })}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Branch</label>
                        <select
                          className="form-select"
                          value={formData.branch_id}
                          onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                        >
                          <option value="">Select Branch</option>
                          {branches.map((branch) => (
                            <option key={branch.id} value={branch.id}>
                              {branch.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Loan Terms */}
                    <h6 className="mb-3 text-primary">
                      <i className="fas fa-calculator me-2"></i>Loan Terms
                    </h6>
                    <div className="row g-3 mb-4">
                      <div className="col-md-4">
                        <label className="form-label">Loan Amount <span className="text-danger">*</span></label>
                        <input
                          type="number"
                          className="form-control"
                          required
                          min="0"
                          step="0.01"
                          value={formData.amount}
                          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Interest Rate (%) <span className="text-danger">*</span></label>
                        <input
                          type="number"
                          className="form-control"
                          required
                          min="0"
                          max="100"
                          step="0.01"
                          value={formData.interest_rate}
                          onChange={(e) => setFormData({ ...formData, interest_rate: e.target.value })}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Interest Method <span className="text-danger">*</span></label>
                        <select
                          className="form-select"
                          required
                          value={formData.interest_method}
                          onChange={(e) => setFormData({ ...formData, interest_method: e.target.value })}
                        >
                          <option value="declining_balance">Declining Balance (Default)</option>
                          <option value="flat">Flat Rate</option>
                        </select>
                        <small className="text-muted">Declining balance is recommended for most loans</small>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Term (Months) <span className="text-danger">*</span></label>
                        <input
                          type="number"
                          className="form-control"
                          required
                          min="1"
                          value={formData.term_months}
                          onChange={(e) => setFormData({ ...formData, term_months: e.target.value })}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Payment Frequency <span className="text-danger">*</span></label>
                        <select
                          className="form-select"
                          required
                          value={formData.payment_frequency}
                          onChange={(e) => setFormData({ ...formData, payment_frequency: e.target.value })}
                        >
                          <option value="weekly">Weekly</option>
                          <option value="biweekly">Bi-weekly</option>
                          <option value="monthly">Monthly</option>
                          <option value="quarterly">Quarterly</option>
                          <option value="lump_sum">Lump Sum</option>
                        </select>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Disbursement Date</label>
                        <input
                          type="date"
                          className="form-control"
                          value={formData.disbursement_date}
                          onChange={(e) => setFormData({ ...formData, disbursement_date: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Collateral */}
                    <h6 className="mb-3 text-primary">
                      <i className="fas fa-shield-alt me-2"></i>Collateral (Optional)
                    </h6>
                    <div className="row g-3 mb-4">
                      <div className="col-md-12">
                        <label className="form-label">Select Collateral</label>
                        <select
                          className="form-select"
                          value={formData.collateral_id}
                          onChange={(e) => setFormData({ ...formData, collateral_id: e.target.value })}
                          disabled={!formData.client_id}
                        >
                          <option value="">No Collateral</option>
                          {clientCollaterals.map((collateral) => (
                            <option key={collateral.id} value={collateral.id}>
                              {collateral.collateral_type || collateral.type} - ${parseFloat(collateral.estimated_value || 0).toLocaleString()}
                            </option>
                          ))}
                        </select>
                        {!formData.client_id && (
                          <small className="text-muted">Please select a client first</small>
                        )}
                        {formData.client_id && clientCollaterals.length === 0 && (
                          <small className="text-warning">No collaterals found for this client</small>
                        )}
                      </div>
                    </div>

                    {/* Schedule Preview */}
                    {schedulePreview && (
                      <div className="mb-4">
                        <h6 className="mb-3 text-success">
                          <i className="fas fa-calendar-alt me-2"></i>Repayment Schedule Preview
                        </h6>
                        <div className="alert alert-info">
                          <div className="row">
                            <div className="col-md-4">
                              <strong>Monthly Payment:</strong> ${schedulePreview.monthly_payment?.toFixed(2) || 'N/A'}
                            </div>
                            <div className="col-md-4">
                              <strong>Total Interest:</strong> ${schedulePreview.total_interest?.toFixed(2) || 'N/A'}
                            </div>
                            <div className="col-md-4">
                              <strong>Total Amount:</strong> ${schedulePreview.total_amount?.toFixed(2) || 'N/A'}
                            </div>
                          </div>
                        </div>
                        {schedulePreview.schedule && schedulePreview.schedule.length > 0 && (
                          <div className="table-responsive" style={{ maxHeight: '300px' }}>
                            <table className="table table-sm table-bordered">
                              <thead className="table-light sticky-top">
                                <tr>
                                  <th>#</th>
                                  <th>Due Date</th>
                                  <th>Principal</th>
                                  <th>Interest</th>
                                  <th>Total Payment</th>
                                  <th>Outstanding</th>
                                </tr>
                              </thead>
                              <tbody>
                                {schedulePreview.schedule.slice(0, 12).map((item, idx) => (
                                  <tr key={idx}>
                                    <td>{item.installment_number}</td>
                                    <td>{new Date(item.due_date).toLocaleDateString()}</td>
                                    <td>${item.principal_amount.toFixed(2)}</td>
                                    <td>${item.interest_amount.toFixed(2)}</td>
                                    <td><strong>${item.total_payment.toFixed(2)}</strong></td>
                                    <td>${item.outstanding_balance.toFixed(2)}</td>
                                  </tr>
                                ))}
                                {schedulePreview.schedule.length > 12 && (
                                  <tr>
                                    <td colSpan="6" className="text-center text-muted">
                                      ... and {schedulePreview.schedule.length - 12} more installments
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Notes */}
                    <div className="mb-3">
                      <label className="form-label">Notes</label>
                      <textarea
                        className="form-control"
                        rows="3"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Additional notes or comments..."
                      />
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setShowModal(false);
                        setSchedulePreview(null);
                      }}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      <i className="fas fa-save me-2"></i>Create Loan Application
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" onClick={() => {
            setShowModal(false);
            setSchedulePreview(null);
          }} style={{ zIndex: 1040 }}></div>
        </>
      )}

      {/* Repayment Modal */}
      {showRepayModal && selectedLoan && (
        <>
          <div className="modal fade show" style={{ display: 'block', zIndex: 1050 }} tabIndex="-1">
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Make Repayment - {selectedLoan.loan_number}</h5>
                  <button type="button" className="btn-close" onClick={() => setShowRepayModal(false)}></button>
                </div>
                <form onSubmit={handleRepay}>
                  <div className="modal-body">
                    <div className="mb-3">
                      <label className="form-label">Outstanding Balance</label>
                      <div className="form-control-plaintext">
                        <strong className="text-danger">${parseFloat(selectedLoan.outstanding_balance || selectedLoan.amount || 0).toLocaleString()}</strong>
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Payment Amount <span className="text-danger">*</span></label>
                      <input
                        type="number"
                        className="form-control"
                        value={repayData.amount}
                        onChange={(e) => setRepayData({ ...repayData, amount: e.target.value })}
                        min="0.01"
                        max={selectedLoan.outstanding_balance || selectedLoan.amount || 0}
                        step="0.01"
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Payment Method <span className="text-danger">*</span></label>
                      <select
                        className="form-select"
                        value={repayData.payment_method}
                        onChange={(e) => setRepayData({ ...repayData, payment_method: e.target.value })}
                        required
                      >
                        <option value="cash">Cash</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="mobile_money">Mobile Money</option>
                        <option value="check">Check</option>
                      </select>
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Payment Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={repayData.payment_date}
                        onChange={(e) => setRepayData({ ...repayData, payment_date: e.target.value })}
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Description</label>
                      <textarea
                        className="form-control"
                        rows="2"
                        value={repayData.description}
                        onChange={(e) => setRepayData({ ...repayData, description: e.target.value })}
                        placeholder="Payment notes..."
                      />
                    </div>
                    {repayData.amount && (
                      <div className="alert alert-info">
                        <strong>New Outstanding Balance:</strong> ${Math.max(0, parseFloat(selectedLoan.outstanding_balance || selectedLoan.amount || 0) - parseFloat(repayData.amount || 0)).toFixed(2)}
                      </div>
                    )}
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowRepayModal(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-success">
                      <i className="fas fa-money-bill-wave me-2"></i>Process Repayment
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" onClick={() => setShowRepayModal(false)} style={{ zIndex: 1040 }}></div>
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

export default Loans;
