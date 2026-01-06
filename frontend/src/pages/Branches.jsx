import React, { useState, useEffect } from 'react';
import apiClient from '../config/axios';
import { toast } from 'react-toastify';

const Branches = () => {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const response = await apiClient.get('/api/branches');
      setBranches(response.data.data.branches || []);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch branches:', error);
      toast.error('Failed to load branches');
      setLoading(false);
    }
  };

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-1">Branches</h1>
          <p className="text-muted">Manage branch locations</p>
        </div>
        <button className="btn btn-primary hover-lift">
          <i className="fas fa-plus me-2"></i>Add Branch
        </button>
      </div>

      <div className="row">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : branches.length > 0 ? (
          branches.map((branch) => (
            <div key={branch.id} className="col-md-4 mb-4">
              <div className="card hover-lift">
                <div className="card-body">
                  <h5 className="card-title">
                    <i className="fas fa-building me-2"></i>
                    {branch.name}
                  </h5>
                  <p className="text-muted mb-2">
                    <strong>Code:</strong> {branch.code}
                  </p>
                  {branch.address && (
                    <p className="mb-2">
                      <i className="fas fa-map-marker-alt me-2"></i>
                      {branch.address}
                    </p>
                  )}
                  {branch.phone && (
                    <p className="mb-2">
                      <i className="fas fa-phone me-2"></i>
                      {branch.phone}
                    </p>
                  )}
                  {branch.email && (
                    <p className="mb-3">
                      <i className="fas fa-envelope me-2"></i>
                      {branch.email}
                    </p>
                  )}
                  <span className={`badge bg-${branch.is_active ? 'success' : 'secondary'}`}>
                    {branch.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-12">
            <div className="card">
              <div className="card-body text-center text-muted py-5">
                No branches found
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Branches;

