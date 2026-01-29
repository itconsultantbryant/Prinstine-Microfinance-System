import React, { useState, useEffect } from 'react';
import apiClient from '../config/axios';
import { toast } from 'react-toastify';

const Collections = () => {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCollections();
  }, []);

  const fetchCollections = async () => {
    try {
      const response = await apiClient.get('/api/collections');
      setCollections(response.data?.data?.collections ?? []);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch collections:', error);
      toast.error('Failed to load collections');
      setLoading(false);
    }
  };

  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-1">Collections</h1>
          <p className="text-muted">Manage overdue loans and recovery actions</p>
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
                    <th>Collection Number</th>
                    <th>Loan</th>
                    <th>Amount Due</th>
                    <th>Amount Collected</th>
                    <th>Overdue Days</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {collections.length > 0 ? (
                    collections.map((collection) => (
                      <tr key={collection.id} className="hover-lift">
                        <td>{collection.collection_number}</td>
                        <td>{collection.loan?.loan_number}</td>
                        <td>${parseFloat(collection.amount_due || 0).toLocaleString()}</td>
                        <td>${parseFloat(collection.amount_collected || 0).toLocaleString()}</td>
                        <td>
                          <span className={`badge bg-${collection.overdue_days > 30 ? 'danger' : 'warning'}`}>
                            {collection.overdue_days} days
                          </span>
                        </td>
                        <td>
                          <span className={`badge bg-${
                            collection.status === 'completed' ? 'success' :
                            collection.status === 'in_progress' ? 'info' : 'warning'
                          }`}>
                            {collection.status}
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
                        No collections found
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

export default Collections;

