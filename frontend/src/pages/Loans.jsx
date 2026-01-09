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
  const [loanTypes, setLoanTypes] = useState({});
  const [formData, setFormData] = useState({
    client_id: '',
    amount: '',
    currency: 'USD', // Default currency
    interest_rate: '',
    upfront_percentage: '',
    upfront_amount: '',
    default_charges_percentage: '',
    default_charges_amount: '',
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
    fetchLoanTypes();
    
    // Real-time updates every 5 seconds
    const interval = setInterval(() => {
      fetchLoans();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [search, statusFilter]);

  const fetchLoanTypes = async () => {
    try {
      const response = await apiClient.get('/api/loans/types');
      setLoanTypes(response.data.data.loan_types || {});
    } catch (error) {
      console.error('Failed to fetch loan types:', error);
    }
  };

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

  // Calculate upfront amount and update form
  const calculateUpfront = (loanAmount, upfrontPercentage) => {
    if (!loanAmount || !upfrontPercentage) return 0;
    return (parseFloat(loanAmount) * parseFloat(upfrontPercentage)) / 100;
  };

  // Calculate principal amount (after upfront deduction)
  const calculatePrincipal = (loanAmount, upfrontAmount) => {
    return Math.max(0, parseFloat(loanAmount) - parseFloat(upfrontAmount));
  };

  // Calculate default charges amount
  const calculateDefaultCharges = (principal, defaultChargesPercentage) => {
    if (!principal || !defaultChargesPercentage) return 0;
    return (parseFloat(principal) * parseFloat(defaultChargesPercentage)) / 100;
  };

  // Handle loan type change - auto-populate interest rate and upfront percentage
  const handleLoanTypeChange = (loanType) => {
    const config = loanTypes[loanType];
    if (config) {
      const newFormData = {
        ...formData,
        loan_type: loanType,
        interest_rate: config.interestRate.toString(),
        upfront_percentage: config.upfrontPercentage.toString(),
        interest_method: config.interestMethod
      };
      
      // Calculate upfront amount if loan amount exists
      if (formData.amount) {
        const upfrontAmount = calculateUpfront(formData.amount, config.upfrontPercentage);
        newFormData.upfront_amount = upfrontAmount.toFixed(2);
      }
      
      setFormData(newFormData);
    } else {
      setFormData({ ...formData, loan_type: loanType });
    }
  };

  // Handle amount change - recalculate upfront
  const handleAmountChange = (amount) => {
    const newFormData = { ...formData, amount };
    
    if (amount && formData.upfront_percentage) {
      const upfrontAmount = calculateUpfront(amount, formData.upfront_percentage);
      newFormData.upfront_amount = upfrontAmount.toFixed(2);
      
      // Recalculate default charges if applicable
      const principal = calculatePrincipal(amount, upfrontAmount);
      if (formData.default_charges_percentage) {
        const defaultChargesAmount = calculateDefaultCharges(principal, formData.default_charges_percentage);
        newFormData.default_charges_amount = defaultChargesAmount.toFixed(2);
      }
    }
    
    setFormData(newFormData);
  };

  // Handle upfront percentage change
  const handleUpfrontPercentageChange = (percentage) => {
    const newFormData = { ...formData, upfront_percentage: percentage };
    
    if (formData.amount && percentage) {
      const upfrontAmount = calculateUpfront(formData.amount, percentage);
      newFormData.upfront_amount = upfrontAmount.toFixed(2);
      
      // Recalculate default charges
      const principal = calculatePrincipal(formData.amount, upfrontAmount);
      if (formData.default_charges_percentage) {
        const defaultChargesAmount = calculateDefaultCharges(principal, formData.default_charges_percentage);
        newFormData.default_charges_amount = defaultChargesAmount.toFixed(2);
      }
    }
    
    setFormData(newFormData);
  };

  // Handle default charges percentage change
  const handleDefaultChargesPercentageChange = (percentage) => {
    const newFormData = { ...formData, default_charges_percentage: percentage };
    
    if (formData.amount && formData.upfront_percentage && percentage) {
      const upfrontAmount = calculateUpfront(formData.amount, formData.upfront_percentage);
      const principal = calculatePrincipal(formData.amount, upfrontAmount);
      const defaultChargesAmount = calculateDefaultCharges(principal, percentage);
      newFormData.default_charges_amount = defaultChargesAmount.toFixed(2);
    }
    
    setFormData(newFormData);
  };

  // Calculate repayment schedule preview
  const calculateSchedulePreview = async () => {
    const loanAmount = parseFloat(formData.amount);
    const upfrontAmount = parseFloat(formData.upfront_amount || 0);
    const principal = calculatePrincipal(loanAmount, upfrontAmount);
    
    if (!loanAmount || !formData.term_months) {
      setSchedulePreview(null);
      return;
    }

    try {
      const response = await apiClient.post('/api/loans/calculate-schedule', {
        loan_amount: loanAmount,
        upfront_percentage: parseFloat(formData.upfront_percentage) || 0,
        loan_type: formData.loan_type,
        principal: principal,
        interest_rate: parseFloat(formData.interest_rate) || 0,
        term_months: parseInt(formData.term_months),
        interest_method: formData.interest_method,
        payment_frequency: formData.payment_frequency,
        start_date: formData.disbursement_date,
        default_charges_percentage: parseFloat(formData.default_charges_percentage) || 0
      });
      setSchedulePreview(response.data.data);
    } catch (error) {
      console.error('Failed to calculate schedule:', error);
    }
  };

  useEffect(() => {
    const loanAmount = parseFloat(formData.amount);
    
    if (loanAmount > 0 && formData.term_months) {
      const timer = setTimeout(() => {
        calculateSchedulePreview();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [formData.amount, formData.upfront_percentage, formData.upfront_amount, formData.loan_type, formData.interest_rate, formData.term_months, formData.interest_method, formData.payment_frequency, formData.disbursement_date, formData.default_charges_percentage]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Prepare data with proper types
      const submitData = {
        client_id: parseInt(formData.client_id),
        amount: parseFloat(formData.amount),
        currency: formData.currency || 'USD', // Include currency
        interest_rate: parseFloat(formData.interest_rate),
        upfront_percentage: parseFloat(formData.upfront_percentage) || 0,
        default_charges_percentage: parseFloat(formData.default_charges_percentage) || 0,
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
      const missingFields = [];
      if (!submitData.client_id || isNaN(submitData.client_id)) missingFields.push('Client');
      if (!submitData.amount || isNaN(submitData.amount) || submitData.amount <= 0) missingFields.push('Loan Amount');
      if (submitData.interest_rate === undefined || submitData.interest_rate === null || isNaN(submitData.interest_rate) || submitData.interest_rate < 0) missingFields.push('Interest Rate');
      if (!submitData.term_months || isNaN(submitData.term_months) || submitData.term_months < 1) missingFields.push('Term (months)');

      if (missingFields.length > 0) {
        toast.error(`Please fill in all required fields: ${missingFields.join(', ')}`);
        return;
      }
      
      // Log the data being sent for debugging
      console.log('Submitting loan data:', submitData);

      let response;
      if (editingLoan) {
        // Update existing loan
        response = await apiClient.put(`/api/loans/${editingLoan.id}`, submitData);
        toast.success('Loan updated successfully!');
      } else {
        // Create new loan
        response = await apiClient.post('/api/loans', submitData);
        toast.success('Loan created successfully!');
        
        // Show success with schedule info
        if (response.data.data.schedule_summary) {
          toast.info(`Monthly Payment: $${response.data.data.schedule_summary.monthly_payment.toFixed(2)}`);
        }
      }
      
      setShowModal(false);
      setEditingLoan(null);
      const defaultLoanType = 'personal';
      const defaultConfig = loanTypes[defaultLoanType] || {};
      
      setFormData({
        client_id: '',
        amount: '',
        interest_rate: defaultConfig.interestRate?.toString() || '',
        upfront_percentage: defaultConfig.upfrontPercentage?.toString() || '',
        upfront_amount: '',
        default_charges_percentage: '',
        default_charges_amount: '',
        term_months: '',
        loan_type: defaultLoanType,
        payment_frequency: 'monthly',
        interest_method: defaultConfig.interestMethod || 'declining_balance',
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
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      console.error('Full error object:', JSON.stringify(error.response?.data, null, 2));
      
      let errorMessage = 'Failed to create loan. Please check all required fields.';
      
      if (error.response?.data) {
        const errorData = error.response.data;
        
        // Handle validation errors array
        if (errorData.errors && Array.isArray(errorData.errors)) {
          const validationErrors = errorData.errors
            .map(e => {
              if (typeof e === 'string') return e;
              if (e.msg) return `${e.param || 'Field'}: ${e.msg}`;
              if (e.message) return e.message;
              return JSON.stringify(e);
            })
            .filter(Boolean)
            .join(', ');
          errorMessage = validationErrors || errorData.message || errorMessage;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = typeof errorData.error === 'string' ? errorData.error : JSON.stringify(errorData.error);
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Ensure error message is not empty or too short
      if (!errorMessage || errorMessage.length < 3) {
        errorMessage = 'Failed to create loan. Please check the console for details.';
      }
      
      toast.error(errorMessage, { autoClose: 5000 });
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

  const handleEdit = async (loanId) => {
    try {
      const response = await apiClient.get(`/api/loans/${loanId}`);
      const loan = response.data.data.loan;
      setEditingLoan(loan);
      setFormData({
        client_id: loan.client_id || '',
        amount: loan.amount || '',
        currency: loan.currency || 'USD',
        interest_rate: loan.interest_rate || '',
        upfront_percentage: loan.upfront_percentage || 0,
        upfront_amount: loan.upfront_amount || 0,
        default_charges_percentage: loan.default_charges_percentage || 0,
        default_charges_amount: loan.default_charges_amount || 0,
        term_months: loan.term_months || '',
        loan_type: loan.loan_type || 'personal',
        payment_frequency: loan.payment_frequency || 'monthly',
        interest_method: loan.interest_method || 'declining_balance',
        loan_purpose: loan.loan_purpose || '',
        collateral_id: loan.collateral_id || '',
        disbursement_date: loan.disbursement_date || loan.application_date || new Date().toISOString().split('T')[0],
        branch_id: loan.branch_id || '',
        notes: loan.notes || ''
      });
      setShowModal(true);
    } catch (error) {
      console.error('Failed to fetch loan details:', error);
      toast.error('Failed to load loan details');
    }
  };

  const handleDelete = async (loanId) => {
    if (!window.confirm('Are you sure you want to delete this loan? It will be moved to the Recycle Bin.')) {
      return;
    }

    try {
      await apiClient.delete(`/api/loans/${loanId}`);
      toast.success('Loan deleted successfully');
      fetchLoans();
    } catch (error) {
      console.error('Failed to delete loan:', error);
      toast.error(error.response?.data?.message || 'Failed to delete loan');
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
      const schedule = response.data.data.schedule || [];
      const loan = response.data.data.loan || {};
      
      // Generate HTML for printing/downloading
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Repayment Schedule - ${loan.loan_number}</title>
          <style>
            @page { margin: 1cm; }
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .header h1 { color: #333; margin: 0; }
            .header h2 { color: #666; margin: 10px 0 0 0; }
            .loan-info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .info-item { padding: 10px; background-color: #f8f9fa; border-radius: 5px; }
            .info-item strong { display: block; margin-bottom: 5px; color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background-color: #667eea; color: white; font-weight: bold; }
            tr:nth-child(even) { background-color: #f8f9fa; }
            .status-completed { color: green; font-weight: bold; }
            .status-pending { color: orange; font-weight: bold; }
            .status-partial { color: blue; font-weight: bold; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 2px solid #333; text-align: center; font-size: 12px; color: #666; }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Prinstine Microfinance Loans and Savings</h1>
            <h2>Loan Repayment Schedule</h2>
          </div>
          
          <div class="loan-info">
            <div class="info-item">
              <strong>Loan Number:</strong> ${loan.loan_number || 'N/A'}
            </div>
            <div class="info-item">
              <strong>Loan Amount:</strong> ${loan.currency === 'LRD' ? 'LRD' : '$'}${parseFloat(loan.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <small>(${loan.currency || 'USD'})</small>
            </div>
            <div class="info-item">
              <strong>Interest Rate:</strong> ${loan.interest_rate || 0}%
            </div>
            <div class="info-item">
              <strong>Term:</strong> ${loan.term_months || 0} months
            </div>
            <div class="info-item">
              <strong>Monthly Payment:</strong> ${loan.currency === 'LRD' ? 'LRD' : '$'}${parseFloat(loan.monthly_payment || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div class="info-item">
              <strong>Total Interest:</strong> ${loan.currency === 'LRD' ? 'LRD' : '$'}${parseFloat(loan.total_interest || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div class="info-item">
              <strong>Principal Amount:</strong> ${loan.currency === 'LRD' ? 'LRD' : '$'}${parseFloat(loan.principal_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div class="info-item">
              <strong>Upfront Amount:</strong> ${loan.currency === 'LRD' ? 'LRD' : '$'}${parseFloat(loan.upfront_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div class="info-item">
              <strong>Outstanding Balance:</strong> ${loan.currency === 'LRD' ? 'LRD' : '$'}${parseFloat(loan.outstanding_balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
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
              ${schedule.map(item => {
                const statusClass = item.status === 'completed' ? 'status-completed' : 
                                   item.status === 'partial' ? 'status-partial' : 'status-pending';
                const currencySymbol = loan.currency === 'LRD' ? 'LRD' : '$';
                return `
                <tr>
                  <td>${item.installment_number || item.installment_number}</td>
                  <td>${new Date(item.due_date).toLocaleDateString()}</td>
                  <td>${currencySymbol}${parseFloat(item.principal_amount || item.principal_payment || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td>${currencySymbol}${parseFloat(item.interest_amount || item.interest_payment || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td><strong>${currencySymbol}${parseFloat(item.total_payment || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
                  <td>${currencySymbol}${parseFloat(item.outstanding_balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td class="${statusClass}">${(item.status || 'pending').toUpperCase()}</td>
                </tr>
              `;
              }).join('')}
            </tbody>
          </table>
          
          <div class="footer">
            <p>Generated on ${new Date().toLocaleString()}</p>
            <p>Prinstine Microfinance Loans and Savings - Empowering Financial Growth</p>
          </div>
        </body>
        </html>
      `;
      
      // Open in new window for printing
      const printWindow = window.open('', '_blank');
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Wait for content to load, then print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 250);
      };
      
      toast.success('Repayment schedule opened for printing!');
    } catch (error) {
      console.error('Failed to download schedule:', error);
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
          <h1 className="h3 mb-1">{user?.role === 'borrower' ? 'My Loans' : 'Loans'}</h1>
          <p className="text-muted">
            {user?.role === 'borrower' ? 'View your loan applications and status' : 'Manage all loan applications and disbursements'}
          </p>
        </div>
        {user?.role !== 'borrower' && (
          <button
            className="btn btn-primary hover-lift"
            onClick={() => setShowModal(true)}
          >
            <i className="fas fa-plus me-2"></i>New Loan Application
          </button>
        )}
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
                              className="btn btn-sm btn-outline-info"
                              title="View Details"
                            >
                              <i className="fas fa-eye"></i>
                            </Link>
                            {user?.role !== 'borrower' && user?.role === 'admin' && (
                              <button
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => handleEdit(loan.id)}
                                title="Edit"
                              >
                                <i className="fas fa-edit"></i>
                              </button>
                            )}
                            {user?.role !== 'borrower' && loan.status === 'pending' && (
                              <button
                                className="btn btn-sm btn-outline-success"
                                onClick={() => handleApprove(loan.id)}
                                title="Approve"
                              >
                                <i className="fas fa-check"></i>
                              </button>
                            )}
                            {user?.role !== 'borrower' && loan.status === 'approved' && (
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
                            {user?.role === 'admin' && (
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleDelete(loan.id)}
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
          <div className="modal fade show" style={{ display: 'block', zIndex: 1050, overflowY: 'auto' }} tabIndex="-1" role="dialog">
            <div className="modal-dialog modal-xl modal-dialog-scrollable" style={{ maxHeight: 'calc(100vh - 3.5rem)' }}>
              <div className="modal-content" style={{ maxHeight: 'calc(100vh - 3.5rem)' }}>
                <div className="modal-header" style={{ flexShrink: 0 }}>
                  <h5 className="modal-title">{editingLoan ? 'Edit Loan' : 'New Loan Application'}</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => {
                      setShowModal(false);
                      setSchedulePreview(null);
                      setEditingLoan(null);
                    }}
                    aria-label="Close"
                  ></button>
                </div>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div className="modal-body" style={{ overflowY: 'auto', overflowX: 'hidden', flex: '1 1 auto', minHeight: 0 }}>
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
                          onChange={(e) => handleLoanTypeChange(e.target.value)}
                        >
                          <option value="personal">Personal - 10% interest</option>
                          <option value="excess">Excess - 10% interest</option>
                          <option value="business">Business - 5% on loan, 10% upfront</option>
                          <option value="emergency">Emergency - 16% on loan, 2% upfront</option>
                          <option value="micro">Micro Loan</option>
                          <option value="agricultural">Agricultural</option>
                          <option value="education">Education</option>
                          <option value="housing">Housing</option>
                          <option value="group">Group</option>
                        </select>
                        {loanTypes[formData.loan_type] && (
                          <small className="text-muted">
                            {loanTypes[formData.loan_type].name}: {loanTypes[formData.loan_type].interestRate}% interest, {loanTypes[formData.loan_type].upfrontPercentage}% upfront
                            {loanTypes[formData.loan_type].hasDefaultCharges && ' (with default charges)'}
                          </small>
                        )}
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
                      <div className="col-md-3">
                        <label className="form-label">Loan Amount <span className="text-danger">*</span></label>
                        <input
                          type="number"
                          className="form-control"
                          required
                          min="0"
                          step="0.01"
                          value={formData.amount}
                          onChange={(e) => handleAmountChange(e.target.value)}
                        />
                      </div>
                      <div className="col-md-3">
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
                      <div className="col-md-3">
                        <label className="form-label">Upfront Percentage (%) <span className="text-danger">*</span></label>
                        <input
                          type="number"
                          className="form-control"
                          required
                          min="0"
                          max="100"
                          step="0.01"
                          value={formData.upfront_percentage}
                          onChange={(e) => handleUpfrontPercentageChange(e.target.value)}
                        />
                        {formData.upfront_amount && (
                          <small className="text-muted">
                            Upfront Amount: {formData.currency === 'LRD' ? 'LRD' : '$'}
                            {parseFloat(formData.upfront_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </small>
                        )}
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
                        <small className="text-muted">Auto-filled based on loan type (editable)</small>
                      </div>
                      {formData.amount && formData.upfront_amount && (
                        <div className="col-md-4">
                          <label className="form-label">Principal Amount (After Upfront)</label>
                          <div className="form-control-plaintext">
                            <strong>
                              {formData.currency === 'LRD' ? 'LRD' : '$'}
                              {calculatePrincipal(formData.amount, formData.upfront_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </strong>
                          </div>
                        </div>
                      )}
                      <div className="col-md-4">
                        <label className="form-label">Interest Method <span className="text-danger">*</span></label>
                        <select
                          className="form-select"
                          required
                          value={formData.interest_method}
                          onChange={(e) => setFormData({ ...formData, interest_method: e.target.value })}
                        >
                          <option value="declining_balance">Declining Balance</option>
                          <option value="flat">Flat Rate</option>
                        </select>
                        <small className="text-muted">
                          {loanTypes[formData.loan_type]?.hasDefaultCharges 
                            ? 'Declining Balance with Default Charges' 
                            : 'Declining Balance without Default Charges'}
                        </small>
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

                    {/* Default Charges (Only for Emergency and Micro loans) */}
                    {loanTypes[formData.loan_type]?.hasDefaultCharges && (
                      <>
                        <h6 className="mb-3 text-primary">
                          <i className="fas fa-exclamation-triangle me-2"></i>Default Charges (Optional)
                        </h6>
                        <div className="row g-3 mb-4">
                          <div className="col-md-6">
                            <label className="form-label">Default Charges Percentage (%)</label>
                            <input
                              type="number"
                              className="form-control"
                              min="0"
                              max="100"
                              step="0.01"
                              value={formData.default_charges_percentage}
                              onChange={(e) => handleDefaultChargesPercentageChange(e.target.value)}
                              placeholder="Enter default charges percentage"
                            />
                            {formData.default_charges_amount && (
                              <small className="text-muted">
                                Default Charges Amount: {formData.currency === 'LRD' ? 'LRD' : '$'}
                                {parseFloat(formData.default_charges_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </small>
                            )}
                          </div>
                          <div className="col-md-6">
                            <div className="alert alert-warning mb-0">
                              <small>
                                <i className="fas fa-info-circle me-1"></i>
                                Default charges will be added to the total loan amount if specified.
                              </small>
                            </div>
                          </div>
                        </div>
                      </>
                    )}

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
                      <i className="fas fa-save me-2"></i>{editingLoan ? 'Update Loan' : 'Create Loan Application'}
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
          <div className="modal fade show" style={{ display: 'block', zIndex: 1050, overflowY: 'auto' }} tabIndex="-1" role="dialog">
            <div className="modal-dialog modal-dialog-scrollable" style={{ maxHeight: 'calc(100vh - 3.5rem)' }}>
              <div className="modal-content" style={{ maxHeight: 'calc(100vh - 3.5rem)' }}>
                <div className="modal-header" style={{ flexShrink: 0 }}>
                  <h5 className="modal-title">Make Repayment - {selectedLoan.loan_number}</h5>
                  <button type="button" className="btn-close" onClick={() => setShowRepayModal(false)} aria-label="Close"></button>
                </div>
                <form onSubmit={handleRepay} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div className="modal-body" style={{ overflowY: 'auto', overflowX: 'hidden', flex: '1 1 auto', minHeight: 0 }}>
                    <div className="mb-3">
                      <label className="form-label">Outstanding Balance</label>
                      <div className="form-control-plaintext">
                        <strong className="text-danger">
                          {selectedLoan.currency === 'LRD' ? 'LRD' : '$'}
                          {parseFloat(selectedLoan.outstanding_balance || selectedLoan.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </strong>
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
                        <strong>New Outstanding Balance:</strong> {selectedLoan.currency === 'LRD' ? 'LRD' : '$'}
                        {Math.max(0, parseFloat(selectedLoan.outstanding_balance || selectedLoan.amount || 0) - parseFloat(repayData.amount || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    )}
                  </div>
                  <div className="modal-footer" style={{ flexShrink: 0, borderTop: '1px solid #e2e8f0' }}>
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
          <div className="modal-backdrop fade show" onClick={() => setShowRepayModal(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1040 }}></div>
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
