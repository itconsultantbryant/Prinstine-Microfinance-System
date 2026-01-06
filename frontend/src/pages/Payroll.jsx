import React, { useState, useEffect } from 'react';
import apiClient from '../config/axios';
import { toast } from 'react-toastify';

const Payroll = () => {
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayrolls();
  }, []);

  const fetchPayrolls = async () => {
    try {
      const response = await apiClient.get('/api/payroll');
      setPayrolls(response.data.data.payrolls || []);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch payrolls:', error);
      toast.error('Failed to load payrolls');
      setLoading(false);
    }
  };

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-1">Payroll Management</h1>
          <p className="text-muted">Process and manage staff payroll</p>
        </div>
        <button className="btn btn-primary hover-lift">
          <i className="fas fa-plus me-2"></i>Process Payroll
        </button>
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
                    <th>Payroll Number</th>
                    <th>Staff</th>
                    <th>Pay Period</th>
                    <th>Gross Salary</th>
                    <th>Deductions</th>
                    <th>Net Salary</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payrolls.length > 0 ? (
                    payrolls.map((payroll) => (
                      <tr key={payroll.id} className="hover-lift">
                        <td>{payroll.payroll_number}</td>
                        <td>{payroll.staff?.first_name} {payroll.staff?.last_name}</td>
                        <td>
                          {new Date(payroll.pay_period_start).toLocaleDateString()} - 
                          {new Date(payroll.pay_period_end).toLocaleDateString()}
                        </td>
                        <td>${parseFloat(payroll.gross_salary || 0).toLocaleString()}</td>
                        <td>${parseFloat(payroll.deductions || 0).toLocaleString()}</td>
                        <td><strong>${parseFloat(payroll.net_salary || 0).toLocaleString()}</strong></td>
                        <td>
                          <span className={`badge bg-${
                            payroll.status === 'paid' ? 'success' :
                            payroll.status === 'processed' ? 'info' : 'warning'
                          }`}>
                            {payroll.status}
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
                      <td colSpan="8" className="text-center text-muted py-5">
                        No payroll records found
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

export default Payroll;

