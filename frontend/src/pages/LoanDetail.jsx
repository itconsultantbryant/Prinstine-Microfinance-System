import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import apiClient from '../config/axios';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import moment from 'moment';

const LoanDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loan, setLoan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRepayModal, setShowRepayModal] = useState(false);
  const [repayData, setRepayData] = useState({
    amount: '',
    payment_method: 'cash',
    payment_date: new Date().toISOString().split('T')[0],
    description: ''
  });
  const [formData, setFormData] = useState({});
  const [clients, setClients] = useState([]);
  const [branches, setBranches] = useState([]);
  const [collaterals, setCollaterals] = useState([]);

  useEffect(() => {
    fetchLoan();
    fetchClients();
    fetchBranches();
    fetchCollaterals();
  }, [id]);

  const fetchLoan = async () => {
    try {
      const response = await apiClient.get(`/api/loans/${id}`);
      setLoan(response.data.data.loan);
      setFormData(response.data.data.loan);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch loan:', error);
      toast.error('Failed to load loan details');
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

  const fetchBranches = async () => {
    try {
      const response = await apiClient.get('/api/branches');
      setBranches(response.data.data.branches || []);
    } catch (error) {
      console.error('Failed to fetch branches:', error);
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

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await apiClient.put(`/api/loans/${id}`, formData);
      toast.success('Loan updated successfully!');
      setShowEditModal(false);
      fetchLoan();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update loan');
    }
  };

  const handleRepay = async (e) => {
    e.preventDefault();
    try {
      // Prepare data with proper types
      const submitData = {
        amount: parseFloat(repayData.amount),
        payment_method: repayData.payment_method || 'cash',
        payment_date: repayData.payment_date || new Date().toISOString().split('T')[0],
        description: repayData.description || null
      };

      // Validate amount
      if (!submitData.amount || isNaN(submitData.amount) || submitData.amount <= 0) {
        toast.error('Please enter a valid payment amount');
        return;
      }

      const response = await apiClient.post(`/api/loans/${id}/repay`, submitData);
      toast.success('Repayment processed successfully!');
      setShowRepayModal(false);
      setRepayData({
        amount: '',
        payment_method: 'cash',
        payment_date: new Date().toISOString().split('T')[0],
        description: ''
      });
      fetchLoan();
    } catch (error) {
      console.error('Repayment error:', error);
      const errorMessage = error.response?.data?.message || 
                          (error.response?.data?.errors && error.response.data.errors.map(e => e.msg).join(', ')) ||
                          'Failed to process repayment';
      toast.error(errorMessage);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this loan? This action can be undone from the recycle bin.')) {
      return;
    }
    try {
      await apiClient.delete(`/api/loans/${id}`);
      toast.success('Loan deleted successfully');
      navigate('/loans');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete loan');
    }
  };

  const handleApprove = async () => {
    try {
      await apiClient.post(`/api/loans/${id}/approve`);
      toast.success('Loan approved successfully!');
      fetchLoan();
    } catch (error) {
      toast.error('Failed to approve loan');
    }
  };

  const handleDisburse = async () => {
    try {
      await apiClient.post(`/api/loans/${id}/disburse`);
      toast.success('Loan disbursed successfully!');
      fetchLoan();
    } catch (error) {
      toast.error('Failed to disburse loan');
    }
  };

  const downloadSchedule = () => {
    if (!loan.repayment_schedule) {
      toast.error('No repayment schedule available');
      return;
    }

    const schedule = typeof loan.repayment_schedule === 'string' 
      ? JSON.parse(loan.repayment_schedule) 
      : loan.repayment_schedule;

    // Create HTML content for better formatting
    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Loan Repayment Schedule - ${loan.loan_number}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .header h1 { color: #333; margin-bottom: 10px; }
          .info { margin-bottom: 20px; }
          .info p { margin: 5px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #4CAF50; color: white; }
          tr:nth-child(even) { background-color: #f2f2f2; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Loan Repayment Schedule</h1>
        </div>
        <div class="info">
          <p><strong>Loan Number:</strong> ${loan.loan_number}</p>
          <p><strong>Client:</strong> ${loan.client?.first_name} ${loan.client?.last_name}</p>
          <p><strong>Principal Amount:</strong> $${parseFloat(loan.principal_amount || loan.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p><strong>Interest Rate:</strong> ${loan.interest_rate}%</p>
          <p><strong>Term:</strong> ${loan.term_months} months</p>
          <p><strong>Interest Method:</strong> ${loan.interest_method === 'flat' ? 'Flat Rate' : 'Declining Balance'}</p>
          <p><strong>Monthly Payment:</strong> $${parseFloat(loan.monthly_payment || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p><strong>Total Interest:</strong> $${parseFloat(loan.total_interest || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p><strong>Total Amount:</strong> $${parseFloat(loan.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Due Date</th>
              <th>Principal</th>
              <th>Interest</th>
              <th>Total Payment</th>
              <th>Outstanding Balance</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
    `;

    schedule.forEach((item) => {
      const repayment = loan.repayments?.find(r => 
        r.installment_number === item.installment_number || 
        r.due_date === item.due_date
      );
      const status = repayment ? repayment.status : 'Pending';
      const statusClass = status === 'completed' ? 'success' : status === 'partial' ? 'warning' : 'secondary';
      
      htmlContent += `
        <tr>
          <td>${item.installment_number}</td>
          <td>${moment(item.due_date).format('YYYY-MM-DD')}</td>
          <td>$${parseFloat(item.principal_payment).toFixed(2)}</td>
          <td>$${parseFloat(item.interest_payment).toFixed(2)}</td>
          <td><strong>$${parseFloat(item.total_payment).toFixed(2)}</strong></td>
          <td>$${parseFloat(item.outstanding_balance).toFixed(2)}</td>
          <td>${status}</td>
        </tr>
      `;
    });

    htmlContent += `
          </tbody>
        </table>
        <div class="footer">
          <p>Generated on ${moment().format('YYYY-MM-DD HH:mm:ss')}</p>
          <p>This is a system-generated document.</p>
        </div>
      </body>
      </html>
    `;

    // Create blob and download
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `loan_schedule_${loan.loan_number}.html`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Repayment schedule downloaded successfully!');
  };

  const printSchedule = () => {
    if (!loan.repayment_schedule) {
      toast.error('No repayment schedule available');
      return;
    }

    const schedule = typeof loan.repayment_schedule === 'string' 
      ? JSON.parse(loan.repayment_schedule) 
      : loan.repayment_schedule;

    // Create HTML content for printing
    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Loan Repayment Schedule - ${loan.loan_number}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .header h1 { color: #333; margin-bottom: 10px; }
          .info { margin-bottom: 20px; }
          .info p { margin: 5px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #4CAF50; color: white; }
          tr:nth-child(even) { background-color: #f2f2f2; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
            @page { margin: 1cm; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Loan Repayment Schedule</h1>
        </div>
        <div class="info">
          <p><strong>Loan Number:</strong> ${loan.loan_number}</p>
          <p><strong>Client:</strong> ${loan.client?.first_name} ${loan.client?.last_name}</p>
          <p><strong>Principal Amount:</strong> $${parseFloat(loan.principal_amount || loan.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p><strong>Interest Rate:</strong> ${loan.interest_rate}%</p>
          <p><strong>Term:</strong> ${loan.term_months} months</p>
          <p><strong>Interest Method:</strong> ${loan.interest_method === 'flat' ? 'Flat Rate' : 'Declining Balance'}</p>
          <p><strong>Monthly Payment:</strong> $${parseFloat(loan.monthly_payment || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p><strong>Total Interest:</strong> $${parseFloat(loan.total_interest || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p><strong>Total Amount:</strong> $${parseFloat(loan.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Due Date</th>
              <th>Principal</th>
              <th>Interest</th>
              <th>Total Payment</th>
              <th>Outstanding Balance</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
    `;

    schedule.forEach((item) => {
      const repayment = loan.repayments?.find(r => 
        r.installment_number === item.installment_number || 
        r.due_date === item.due_date
      );
      const status = repayment ? repayment.status : 'Pending';
      
      htmlContent += `
        <tr>
          <td>${item.installment_number}</td>
          <td>${moment(item.due_date).format('YYYY-MM-DD')}</td>
          <td>$${parseFloat(item.principal_payment).toFixed(2)}</td>
          <td>$${parseFloat(item.interest_payment).toFixed(2)}</td>
          <td><strong>$${parseFloat(item.total_payment).toFixed(2)}</strong></td>
          <td>$${parseFloat(item.outstanding_balance).toFixed(2)}</td>
          <td>${status}</td>
        </tr>
      `;
    });

    htmlContent += `
          </tbody>
        </table>
        <div class="footer">
          <p>Generated on ${moment().format('YYYY-MM-DD HH:mm:ss')}</p>
          <p>This is a system-generated document.</p>
        </div>
      </body>
      </html>
    `;

    // Open print window
    const printWindow = window.open('', '_blank');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
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

  if (!loan) {
    return (
      <div className="text-center py-5">
        <p className="text-muted">Loan not found</p>
        <Link to="/loans" className="btn btn-primary">Back to Loans</Link>
      </div>
    );
  }

  const isAdmin = user?.role === 'admin';
  const schedule = loan.repayment_schedule 
    ? (typeof loan.repayment_schedule === 'string' ? JSON.parse(loan.repayment_schedule) : loan.repayment_schedule)
    : [];

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Link to="/loans" className="btn btn-outline-secondary btn-sm mb-2">
            <i className="fas fa-arrow-left me-2"></i>Back to Loans
          </Link>
          <h1 className="h3 mb-1">Loan {loan.loan_number}</h1>
          <p className="text-muted">
            Client: <Link to={`/clients/${loan.client_id}`}>{loan.client?.first_name} {loan.client?.last_name}</Link>
          </p>
        </div>
        <div>
          <button
            className="btn btn-primary me-2"
            onClick={() => setShowEditModal(true)}
          >
            <i className="fas fa-edit me-2"></i>Edit Loan
          </button>
          {(loan.status === 'active' || loan.status === 'disbursed') && (
            <button
              className="btn btn-success me-2"
              onClick={() => setShowRepayModal(true)}
            >
              <i className="fas fa-money-bill-wave me-2"></i>Make Repayment
            </button>
          )}
          {loan.status === 'pending' && (
            <button
              className="btn btn-success me-2"
              onClick={handleApprove}
            >
              <i className="fas fa-check me-2"></i>Approve
            </button>
          )}
          {loan.status === 'approved' && (
            <button
              className="btn btn-info me-2"
              onClick={handleDisburse}
            >
              <i className="fas fa-money-bill-wave me-2"></i>Disburse
            </button>
          )}
          {isAdmin && (
            <button
              className="btn btn-danger"
              onClick={handleDelete}
            >
              <i className="fas fa-trash me-2"></i>Delete
            </button>
          )}
        </div>
      </div>

      <div className="row">
        {/* Loan Information */}
        <div className="col-md-6 mb-4">
          <div className="card">
            <div className="card-header bg-primary text-white">
              <h5 className="mb-0"><i className="fas fa-info-circle me-2"></i>Loan Information</h5>
            </div>
            <div className="card-body">
              <table className="table table-borderless">
                <tbody>
                  <tr>
                    <th width="40%">Loan Number:</th>
                    <td><strong>{loan.loan_number}</strong></td>
                  </tr>
                  <tr>
                    <th>Client:</th>
                    <td>
                      <Link to={`/clients/${loan.client_id}`}>
                        {loan.client?.first_name} {loan.client?.last_name}
                      </Link>
                    </td>
                  </tr>
                  <tr>
                    <th>Loan Type:</th>
                    <td>{loan.loan_type ? loan.loan_type.replace('_', ' ').charAt(0).toUpperCase() + loan.loan_type.replace('_', ' ').slice(1) : '-'}</td>
                  </tr>
                  <tr>
                    <th>Amount:</th>
                    <td><strong className="text-primary">${parseFloat(loan.amount).toLocaleString()}</strong></td>
                  </tr>
                  <tr>
                    <th>Interest Rate:</th>
                    <td>{loan.interest_rate}%</td>
                  </tr>
                  <tr>
                    <th>Interest Method:</th>
                    <td>
                      <span className="badge bg-info">
                        {loan.interest_method === 'flat' ? 'Flat Rate' : 'Declining Balance'}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <th>Term:</th>
                    <td>{loan.term_months} months</td>
                  </tr>
                  <tr>
                    <th>Payment Frequency:</th>
                    <td>{loan.payment_frequency ? loan.payment_frequency.replace('_', ' ').charAt(0).toUpperCase() + loan.payment_frequency.replace('_', ' ').slice(1) : 'Monthly'}</td>
                  </tr>
                  <tr>
                    <th>Status:</th>
                    <td>
                      <span className={`badge bg-${loan.status === 'active' ? 'success' : loan.status === 'pending' ? 'warning' : loan.status === 'completed' ? 'info' : 'secondary'}`}>
                        {loan.status}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Financial Details */}
        <div className="col-md-6 mb-4">
          <div className="card">
            <div className="card-header bg-success text-white">
              <h5 className="mb-0"><i className="fas fa-calculator me-2"></i>Financial Details</h5>
            </div>
            <div className="card-body">
              <table className="table table-borderless">
                <tbody>
                  <tr>
                    <th width="40%">Principal Amount:</th>
                    <td><strong>${parseFloat(loan.principal_amount || loan.amount).toLocaleString()}</strong></td>
                  </tr>
                  <tr>
                    <th>Outstanding Balance:</th>
                    <td><strong className="text-danger">${parseFloat(loan.outstanding_balance || 0).toLocaleString()}</strong></td>
                  </tr>
                  <tr>
                    <th>Total Paid:</th>
                    <td><strong className="text-success">${parseFloat(loan.total_paid || 0).toLocaleString()}</strong></td>
                  </tr>
                  <tr>
                    <th>Monthly Payment:</th>
                    <td><strong>${parseFloat(loan.monthly_payment || 0).toLocaleString()}</strong></td>
                  </tr>
                  <tr>
                    <th>Total Interest:</th>
                    <td>${parseFloat(loan.total_interest || 0).toLocaleString()}</td>
                  </tr>
                  <tr>
                    <th>Total Amount:</th>
                    <td><strong>${parseFloat(loan.total_amount || loan.amount).toLocaleString()}</strong></td>
                  </tr>
                  <tr>
                    <th>Application Date:</th>
                    <td>{loan.application_date ? moment(loan.application_date).format('YYYY-MM-DD') : '-'}</td>
                  </tr>
                  <tr>
                    <th>Disbursement Date:</th>
                    <td>{loan.disbursement_date ? moment(loan.disbursement_date).format('YYYY-MM-DD') : '-'}</td>
                  </tr>
                  <tr>
                    <th>Branch:</th>
                    <td>{loan.branch?.name || '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Loan Purpose & Notes */}
        <div className="col-md-6 mb-4">
          <div className="card">
            <div className="card-header bg-info text-white">
              <h5 className="mb-0"><i className="fas fa-file-alt me-2"></i>Additional Information</h5>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <strong>Loan Purpose:</strong>
                <p className="text-muted">{loan.loan_purpose || 'Not specified'}</p>
              </div>
              {loan.notes && (
                <div>
                  <strong>Notes:</strong>
                  <p className="text-muted">{loan.notes}</p>
                </div>
              )}
              {loan.collateral && (
                <div>
                  <strong>Collateral:</strong>
                  <p className="text-muted">{loan.collateral.description || loan.collateral.type}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Repayment Schedule */}
        <div className="col-12 mb-4">
          <div className="card">
            <div className="card-header bg-warning text-white d-flex justify-content-between align-items-center">
              <h5 className="mb-0"><i className="fas fa-calendar-alt me-2"></i>Repayment Schedule</h5>
              {schedule.length > 0 && (
                <div className="btn-group">
                  <button className="btn btn-sm btn-light" onClick={downloadSchedule} title="Download Schedule">
                    <i className="fas fa-download me-2"></i>Download
                  </button>
                  <button className="btn btn-sm btn-light" onClick={printSchedule} title="Print Schedule">
                    <i className="fas fa-print me-2"></i>Print
                  </button>
                </div>
              )}
            </div>
            <div className="card-body">
              {schedule.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Due Date</th>
                        <th>Principal</th>
                        <th>Interest</th>
                        <th>Total Payment</th>
                        <th>Outstanding Balance</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schedule.map((item, index) => {
                        const repayment = loan.repayments?.find(r => r.installment_number === item.installment_number || r.due_date === item.due_date);
                        return (
                          <tr key={index}>
                            <td>{item.installment_number}</td>
                            <td>{moment(item.due_date).format('YYYY-MM-DD')}</td>
                            <td>${parseFloat(item.principal_payment).toFixed(2)}</td>
                            <td>${parseFloat(item.interest_payment).toFixed(2)}</td>
                            <td><strong>${parseFloat(item.total_payment).toFixed(2)}</strong></td>
                            <td>${parseFloat(item.outstanding_balance).toFixed(2)}</td>
                            <td>
                              {repayment ? (
                                <span className={`badge bg-${repayment.status === 'completed' ? 'success' : repayment.status === 'partial' ? 'warning' : 'danger'}`}>
                                  {repayment.status}
                                </span>
                              ) : (
                                <span className="badge bg-secondary">Pending</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted text-center py-3">No repayment schedule available</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal - Similar to Loans.jsx but simplified */}
      {showEditModal && (
        <>
          <div className="modal fade show" style={{ display: 'block', zIndex: 1050 }} tabIndex="-1">
            <div className="modal-dialog modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Edit Loan</h5>
                  <button type="button" className="btn-close" onClick={() => setShowEditModal(false)}></button>
                </div>
                <form onSubmit={handleUpdate}>
                  <div className="modal-body">
                    <div className="mb-3">
                      <label className="form-label">Loan Purpose</label>
                      <textarea
                        className="form-control"
                        rows="3"
                        value={formData.loan_purpose || ''}
                        onChange={(e) => setFormData({ ...formData, loan_purpose: e.target.value })}
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Notes</label>
                      <textarea
                        className="form-control"
                        rows="3"
                        value={formData.notes || ''}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Status</label>
                      <select
                        className="form-select"
                        value={formData.status || 'pending'}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      >
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="disbursed">Disbursed</option>
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                        <option value="overdue">Overdue</option>
                      </select>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      <i className="fas fa-save me-2"></i>Update Loan
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" onClick={() => setShowEditModal(false)} style={{ zIndex: 1040 }}></div>
        </>
      )}

      {/* Repayment Modal */}
      {showRepayModal && (
        <>
          <div className="modal fade show" style={{ display: 'block', zIndex: 1050 }} tabIndex="-1">
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Make Repayment - {loan.loan_number}</h5>
                  <button type="button" className="btn-close" onClick={() => setShowRepayModal(false)}></button>
                </div>
                <form onSubmit={handleRepay}>
                  <div className="modal-body">
                    <div className="mb-3">
                      <label className="form-label">Outstanding Balance</label>
                      <div className="form-control-plaintext">
                        <strong className="text-danger">${parseFloat(loan.outstanding_balance || 0).toLocaleString()}</strong>
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Payment Amount <span className="text-danger">*</span></label>
                      <input
                        type="number"
                        className="form-control"
                        required
                        step="0.01"
                        min="0.01"
                        max={loan.outstanding_balance || loan.amount}
                        value={repayData.amount}
                        onChange={(e) => setRepayData({ ...repayData, amount: e.target.value })}
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Payment Method</label>
                      <select
                        className="form-select"
                        value={repayData.payment_method}
                        onChange={(e) => setRepayData({ ...repayData, payment_method: e.target.value })}
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
                      />
                    </div>
                    {repayData.amount && (
                      <div className="alert alert-info">
                        <strong>New Outstanding Balance:</strong> ${Math.max(0, parseFloat(loan.outstanding_balance || 0) - parseFloat(repayData.amount || 0)).toFixed(2)}
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
    </div>
  );
};

export default LoanDetail;

