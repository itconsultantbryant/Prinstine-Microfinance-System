import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getMenuItemsForRole, formatRoleName } from '../utils/permissions';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= 768;
      setIsDesktop(desktop);
      if (desktop) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  // Get role-specific menu items
  const filteredMenuItems = getMenuItemsForRole(user?.role);

  return (
    <div className="d-flex layout-container" style={{ minHeight: '100vh', height: '100vh', overflow: 'hidden', position: 'relative', width: '100%' }}>
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="d-md-none position-fixed"
          style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.5)', 
            zIndex: 1025,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh'
          }}
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div
        className={`sidebar ${sidebarOpen ? 'd-block show' : 'd-none d-md-block'}`}
        style={{ 
          width: sidebarOpen ? '280px' : '0', 
          transition: 'width 0.3s ease, transform 0.3s ease',
          height: '100vh',
          overflowY: 'auto',
          overflowX: 'hidden',
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 1030,
          flexShrink: 0
        }}
      >
        <div className="p-4" style={{ paddingBottom: '100px' }}>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div className="d-flex align-items-center">
              <img 
                src="/assets/prinstine_microfinance_logo.png" 
                alt="Prinstine Microfinance Logo" 
                style={{ 
                  height: '40px', 
                  width: 'auto',
                  marginRight: '10px',
                  objectFit: 'contain'
                }}
                onError={(e) => {
                  // Hide image if it fails to load - company name text will still be visible
                  e.target.style.display = 'none';
                }}
              />
              <h5 className="text-white mb-0" style={{ fontSize: '14px', lineHeight: '1.2', fontWeight: '600' }}>
                Prinstine<br />Microfinance
              </h5>
            </div>
            <button
              className="btn btn-link text-white d-md-none"
              onClick={() => setSidebarOpen(false)}
            >
              <i className="fas fa-times"></i>
            </button>
          </div>

          <nav className="nav flex-column">
            {filteredMenuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`sidebar-link ${isActive(item.path) ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <i className={item.icon}></i>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        {/* User Info */}
        <div className="position-fixed bottom-0 sidebar-user-info" style={{ 
          width: sidebarOpen ? '280px' : '0',
          transition: 'width 0.3s ease',
          backgroundColor: '#1e293b',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '1rem',
          zIndex: 10
        }}>
          <div className="d-flex align-items-center text-white">
            <div className="rounded-circle bg-primary d-flex align-items-center justify-content-center me-2" style={{ width: '40px', height: '40px' }}>
              <i className="fas fa-user"></i>
            </div>
            <div className="flex-grow-1">
              <div className="fw-bold">{user?.name}</div>
              <small className="text-muted">{formatRoleName(user?.role)}</small>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`flex-grow-1 d-flex flex-column main-content-wrapper ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`} style={{ 
        minWidth: 0, 
        height: '100vh', 
        overflow: 'hidden',
        transition: 'margin-left 0.3s ease, width 0.3s ease',
        width: '100%',
        marginLeft: isDesktop && sidebarOpen ? '280px' : '0'
      }}>
        {/* Header */}
        <nav className="navbar navbar-light bg-white border-bottom shadow-sm" style={{ flexShrink: 0, zIndex: 100, width: '100%' }}>
          <div className="container-fluid d-flex justify-content-between align-items-center">
            <button
              className="btn btn-link p-2"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{ minWidth: '40px' }}
            >
              <i className="fas fa-bars"></i>
            </button>
            <div className="d-flex align-items-center gap-3">
              <div className="d-flex align-items-center">
                <i className="fas fa-bell text-muted me-3"></i>
                <div className="dropdown">
                  <button
                    className="btn btn-link text-decoration-none dropdown-toggle d-flex align-items-center"
                    type="button"
                    data-bs-toggle="dropdown"
                    style={{ border: 'none', padding: '0.5rem' }}
                  >
                    <div className="rounded-circle bg-primary d-flex align-items-center justify-content-center me-2 text-white" style={{ width: '32px', height: '32px', fontSize: '14px' }}>
                      {user?.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <span className="text-dark">{user?.name}</span>
                  </button>
                  <ul className="dropdown-menu dropdown-menu-end">
                    <li>
                      <Link to="/profile" className="dropdown-item">
                        <i className="fas fa-user me-2"></i>Profile
                      </Link>
                    </li>
                    <li>
                      <Link to="/settings" className="dropdown-item">
                        <i className="fas fa-cog me-2"></i>Settings
                      </Link>
                    </li>
                    <li><hr className="dropdown-divider" /></li>
                    <li>
                      <button className="dropdown-item text-danger" onClick={handleLogout}>
                        <i className="fas fa-sign-out-alt me-2"></i>Logout
                      </button>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Page Content - Scrollable */}
        <main className="flex-grow-1 page-content-scrollable" style={{ 
          backgroundColor: '#f8fafc',
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '1.5rem',
          width: '100%',
          maxWidth: '100%',
          height: 'calc(100vh - 56px)',
          boxSizing: 'border-box'
        }}>
          <div className="fade-in" style={{ maxWidth: '100%', width: '100%', boxSizing: 'border-box' }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
