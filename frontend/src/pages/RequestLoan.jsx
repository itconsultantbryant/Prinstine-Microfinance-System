import React, { useState, useEffect } from 'react';
import apiClient from '../config/axios';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const RequestLoan = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [clientInfo, setClientInfo] = useState(null);
  const [loanTypes, setLoanTypes] = useState({});
  const [formData, setFormData] = useState({
    amount: '',
    term_months: '12',
    interest_rate: '',
    upfront_percentage: '',
    upfront_amount: '',
    default_charges_percentage: '',
    default_charges_amount: '',
    loan_type: 'personal',
    loan_purpose: '',
    payment_frequency: 'monthly',
    interest_method: 'declining_balance',
    collateral_id: '',
    notes: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [collaterals, setCollaterals] = useState([]);

  useEffect(() => {
    fetchClientInfo();
    fetchCollaterals();
    fetchLoanTypes();
  }, []);

  const fetchLoanTypes = async () => {
    try {
      const response = await apiClient.get('/api/loans/types');
      setLoanTypes(response.data.data.loan_types || {});
      
      // Set default values for personal loan
      const personalConfig = response.data.data.loan_types?.personal;
      if (personalConfig) {
        setFormData(prev => ({
          ...prev,
          interest_rate: personalConfig.interestRate.toString(),
          upfront_percentage: personalConfig.upfrontPercentage.toString(),
          interest_method: personalConfig.interestMethod
        }));
      }
    } catch (error) {
      console.error('Failed to fetch loan types:', error);
    }
  };

  // Calculate upfront amount
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

  // Handle loan type change
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
      
      if (formData.amount) {
        const upfrontAmount = calculateUpfront(formData.amount, config.upfrontPercentage);
        newFormData.upfront_amount = upfrontAmount.toFixed(2);
      }
      
      setFormData(newFormData);
    } else {
      setFormData({ ...formData, loan_type: loanType });
    }
  };

  // Handle amount change
  const handleAmountChange = (amount) => {
    const newFormData = { ...formData, amount };
    
    if (amount && formData.upfront_percentage) {
      const upfrontAmount = calculateUpfront(amount, formData.upfront_percentage);
      newFormData.upfront_amount = upfrontAmount.toFixed(2);
      
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

  const fetchClientInfo = async () => {
    try {
      // For borrowers, the backend automatically filters to their client
      // So we just get the first (and only) client from the response
      const response = await apiClient.get('/api/clients');
      const clients = response.data.data.clients || [];
      
      // For borrower role, there should be only one client (their own)
      if (clients.length > 0) {
        setClientInfo(clients[0]);
      } else {
        toast.error('Client profile not found. Please contact support.');
      }
    } catch (error) {
      console.error('Failed to fetch client info:', error);
      toast.error('Failed to load your client information');
    }
  };

  const fetchCollaterals = async () => {
    try {
      const response = await apiClient.get('/api/collaterals');
      // Filter collaterals for this client only
      const clientCollaterals = response.data.data.collaterals || [];
      setCollaterals(clientCollaterals);
    } catch (error) {
      console.error('Failed to fetch collaterals:', error);
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      errors.amount = 'Valid loan amount is required';
    }
    
    if (!formData.term_months || parseInt(formData.term_months) < 1) {
      errors.term_months = 'Valid loan term is required';
    }
    
    if (!formData.loan_purpose || formData.loan_purpose.trim().length < 10) {
      errors.loan_purpose = 'Loan purpose is required (minimum 10 characters)';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the form errors');
      return;
    }

    setLoading(true);
    try {
      const loanData = {
        ...formData,
        amount: parseFloat(formData.amount),
        term_months: parseInt(formData.term_months),
        interest_rate: parseFloat(formData.interest_rate) || 0,
        upfront_percentage: parseFloat(formData.upfront_percentage) || 0,
        default_charges_percentage: parseFloat(formData.default_charges_percentage) || 0,
        interest_method: formData.interest_method || 'declining_balance',
        status: 'pending' // Loan request status
      };

      const response = await apiClient.post('/api/loans', loanData);
      
      toast.success('Loan request submitted successfully! It will be reviewed by a loan officer.');
      navigate('/loans');
    } catch (error) {
      console.error('Failed to submit loan request:', error);
      const errorMessage = error.response?.data?.message || 'Failed to submit loan request';
      toast.error(errorMessage);
      
      if (error.response?.data?.errors) {
        const fieldErrors = {};
        error.response.data.errors.forEach(err => {
          fieldErrors[err.param] = err.msg;
        });
        setFormErrors(fieldErrors);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-1">Request Loan</h1>
          <p className="text-muted">Submit a loan application for review</p>
        </div>
        <button 
          className="btn btn-outline-secondary"
          onClick={() => navigate('/loans')}
        >
          <i className="fas fa-arrow-left me-2"></i>Back to Loans
        </button>
      </div>

      <div className="row">
        <div className="col-lg-8">
          <div className="card">
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="row">
                  {/* Show borrower's name (read-only) */}
                  {clientInfo && (
                    <div className="col-12 mb-3">
                      <label className="form-label">Client Name</label>
                      <input
                        type="text"
                        className="form-control"
                        value={`${clientInfo.first_name} ${clientInfo.last_name}`}
                        readOnly
                        disabled
                        style={{ backgroundColor: '#f8f9fa', cursor: 'not-allowed' }}
                      />
                      <small className="form-text text-muted">
                        <i className="fas fa-info-circle me-1"></i>
                        This loan request will be submitted for your account
                      </small>
                    </div>
                  )}

                  <div className="col-md-6 mb-3">
                    <label className="form-label">Loan Amount <span className="text-danger">*</span></label>
                    <div className="input-group">
                      <span className="input-group-text">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className={`form-control ${formErrors.amount ? 'is-invalid' : ''}`}
                        name="amount"
                        value={formData.amount}
                        onChange={(e) => handleAmountChange(e.target.value)}
                        placeholder="Enter loan amount"
                        required
                      />
                    </div>
                    {formErrors.amount && (
                      <div className="invalid-feedback d-block">{formErrors.amount}</div>
                    )}
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label">Upfront Percentage (%) <span className="text-danger">*</span></label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      className="form-control"
                      name="upfront_percentage"
                      value={formData.upfront_percentage}
                      onChange={(e) => handleUpfrontPercentageChange(e.target.value)}
                      required
                    />
                    {formData.upfront_amount && (
                      <small className="text-muted">
                        Upfront Amount: ${parseFloat(formData.upfront_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </small>
                    )}
                  </div>

                  {formData.amount && formData.upfront_amount && (
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Principal Amount (After Upfront)</label>
                      <div className="form-control-plaintext">
                        <strong>${calculatePrincipal(formData.amount, formData.upfront_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                      </div>
                    </div>
                  )}

                  <div className="col-md-6 mb-3">
                    <label className="form-label">Interest Rate (%) <span className="text-danger">*</span></label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      className="form-control"
                      name="interest_rate"
                      value={formData.interest_rate}
                      onChange={handleChange}
                      required
                    />
                    <small className="text-muted">Auto-filled based on loan type (editable)</small>
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label">Loan Term (Months) <span className="text-danger">*</span></label>
                    <select
                      className={`form-select ${formErrors.term_months ? 'is-invalid' : ''}`}
                      name="term_months"
                      value={formData.term_months}
                      onChange={handleChange}
                      required
                    >
                      <option value="6">6 Months</option>
                      <option value="12">12 Months</option>
                      <option value="18">18 Months</option>
                      <option value="24">24 Months</option>
                      <option value="36">36 Months</option>
                    </select>
                    {formErrors.term_months && (
                      <div className="invalid-feedback d-block">{formErrors.term_months}</div>
                    )}
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label">Loan Type <span className="text-danger">*</span></label>
                    <select
                      className="form-select"
                      name="loan_type"
                      value={formData.loan_type}
                      onChange={(e) => handleLoanTypeChange(e.target.value)}
                      required
                    >
                      <option value="personal">Personal - 10% interest</option>
                      <option value="excess">Excess - 10% interest</option>
                      <option value="business">Business - 5% on loan, 10% upfront</option>
                      <option value="emergency">Emergency - 16% on loan, 2% upfront</option>
                      <option value="micro">Micro Loan</option>
                    </select>
                    {loanTypes[formData.loan_type] && (
                      <small className="text-muted">
                        {loanTypes[formData.loan_type].name}: {loanTypes[formData.loan_type].interestRate}% interest, {loanTypes[formData.loan_type].upfrontPercentage}% upfront
                        {loanTypes[formData.loan_type].hasDefaultCharges && ' (with default charges)'}
                      </small>
                    )}
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label">Payment Frequency</label>
                    <select
                      className="form-select"
                      name="payment_frequency"
                      value={formData.payment_frequency}
                      onChange={handleChange}
                    >
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Bi-weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                    </select>
                  </div>

                  {/* Default Charges (Only for Emergency and Micro loans) */}
                  {loanTypes[formData.loan_type]?.hasDefaultCharges && (
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Default Charges Percentage (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        className="form-control"
                        name="default_charges_percentage"
                        value={formData.default_charges_percentage}
                        onChange={(e) => handleDefaultChargesPercentageChange(e.target.value)}
                        placeholder="Enter default charges percentage (optional)"
                      />
                      {formData.default_charges_amount && (
                        <small className="text-muted">
                          Default Charges Amount: ${parseFloat(formData.default_charges_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </small>
                      )}
                      <small className="text-muted d-block mt-1">
                        <i className="fas fa-info-circle me-1"></i>
                        Default charges will be added to the total loan amount if specified.
                      </small>
                    </div>
                  )}

                  <div className="col-12 mb-3">
                    <label className="form-label">Loan Purpose <span className="text-danger">*</span></label>
                    <textarea
                      className={`form-control ${formErrors.loan_purpose ? 'is-invalid' : ''}`}
                      name="loan_purpose"
                      value={formData.loan_purpose}
                      onChange={handleChange}
                      rows="4"
                      placeholder="Please describe the purpose of this loan (minimum 10 characters)"
                      required
                    ></textarea>
                    {formErrors.loan_purpose && (
                      <div className="invalid-feedback d-block">{formErrors.loan_purpose}</div>
                    )}
                    <small className="form-text text-muted">
                      {formData.loan_purpose.length}/10 minimum characters
                    </small>
                  </div>

                  {collaterals.length > 0 && (
                    <div className="col-12 mb-3">
                      <label className="form-label">Collateral (Optional)</label>
                      <select
                        className="form-select"
                        name="collateral_id"
                        value={formData.collateral_id}
                        onChange={handleChange}
                      >
                        <option value="">No Collateral</option>
                        {collaterals.map(collateral => (
                          <option key={collateral.id} value={collateral.id}>
                            {collateral.type} - ${parseFloat(collateral.estimated_value || 0).toLocaleString()}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="col-12 mb-3">
                    <label className="form-label">Additional Notes (Optional)</label>
                    <textarea
                      className="form-control"
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      rows="3"
                      placeholder="Any additional information you'd like to provide..."
                    ></textarea>
                  </div>
                </div>

                <div className="alert alert-info">
                  <i className="fas fa-info-circle me-2"></i>
                  <strong>Note:</strong> Your loan request will be reviewed by a loan officer, head of micro loan, or admin. 
                  You will be notified once a decision has been made.
                </div>

                <div className="d-flex justify-content-end gap-2">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => navigate('/loans')}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-paper-plane me-2"></i>Submit Loan Request
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Loan Information</h5>
            </div>
            <div className="card-body">
              <p className="text-muted">
                <i className="fas fa-info-circle me-2"></i>
                Fill out the form to request a loan. Your application will be reviewed by our loan officers.
              </p>
              <hr />
              <h6>What happens next?</h6>
              <ol className="small">
                <li>Submit your loan request</li>
                <li>Loan officer reviews your application</li>
                <li>Head of Micro Loan or Admin approves</li>
                <li>Finance disburses the loan</li>
                <li>You receive notification</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RequestLoan;

