import React, { useState, useEffect } from 'react';
import apiClient from '../config/axios';
import { toast } from 'react-toastify';

const Staff = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const response = await apiClient.get('/api/staff');
      setStaff(response.data.data.staff || []);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch staff:', error);
      toast.error('Failed to load staff');
      setLoading(false);
    }
  };

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-1">Staff Management</h1>
          <p className="text-muted">Manage staff members and employees</p>
        </div>
        <button className="btn btn-primary hover-lift">
          <i className="fas fa-plus me-2"></i>Add Staff
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
                    <th>Staff Number</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Position</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.length > 0 ? (
                    staff.map((member) => (
                      <tr key={member.id} className="hover-lift">
                        <td>{member.staff_number}</td>
                        <td>{member.first_name} {member.last_name}</td>
                        <td>{member.email}</td>
                        <td>{member.position || '-'}</td>
                        <td>{member.department || '-'}</td>
                        <td>
                          <span className={`badge bg-${
                            member.status === 'active' ? 'success' : 'secondary'
                          }`}>
                            {member.status}
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
                      <td colSpan="7" className="text-center text-muted py-5">
                        No staff members found
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

export default Staff;

