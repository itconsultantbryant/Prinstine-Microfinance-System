// Role-based permissions utility

export const ROLES = {
  ADMIN: 'admin',
  MICRO_LOAN_OFFICER: 'micro_loan_officer',
  HEAD_MICRO_LOAN: 'head_micro_loan',
  SUPERVISOR: 'supervisor',
  FINANCE: 'finance',
  BORROWER: 'borrower',
};

// Permission definitions for each role
export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: {
    // Admin has all permissions
    canAddClients: true,
    canViewClients: true,
    canEditClients: true,
    canDeleteClients: true,
    canAddLoans: true,
    canViewLoans: true,
    canEditLoans: true,
    canDeleteLoans: true,
    canApproveClients: true,
    canApproveLoans: true,
    canApproveKYC: true,
    canDisburseLoans: true,
    canDisburseSavings: true,
    canPerformSavingsTransactions: true,
    canViewAllData: true,
    canManageUsers: true,
    canManageSettings: true,
    canViewReports: true,
    canViewAccounting: true,
  },
  [ROLES.MICRO_LOAN_OFFICER]: {
    canAddClients: true,
    canViewClients: true,
    canEditClients: true,
    canDeleteClients: false,
    canAddLoans: true,
    canViewLoans: true,
    canEditLoans: true,
    canDeleteLoans: false,
    canApproveClients: true,
    canApproveLoans: true,
    canApproveKYC: true,
    canDisburseLoans: false,
    canDisburseSavings: false,
    canPerformSavingsTransactions: false,
    canViewAllData: false,
    canManageUsers: false,
    canManageSettings: false,
    canViewReports: true,
    canViewAccounting: false,
  },
  [ROLES.HEAD_MICRO_LOAN]: {
    canAddClients: true,
    canViewClients: true,
    canEditClients: true,
    canDeleteClients: false,
    canAddLoans: true,
    canViewLoans: true,
    canEditLoans: true,
    canDeleteLoans: false,
    canApproveClients: true,
    canApproveLoans: true,
    canApproveKYC: true,
    canDisburseLoans: false,
    canDisburseSavings: false,
    canPerformSavingsTransactions: false,
    canViewAllData: true,
    canManageUsers: false,
    canManageSettings: false,
    canViewReports: true,
    canViewAccounting: false,
  },
  [ROLES.SUPERVISOR]: {
    canAddClients: false,
    canViewClients: true,
    canEditClients: false,
    canDeleteClients: false,
    canAddLoans: false,
    canViewLoans: true,
    canEditLoans: false,
    canDeleteLoans: false,
    canApproveClients: false,
    canApproveLoans: true,
    canApproveKYC: false,
    canDisburseLoans: false,
    canDisburseSavings: false,
    canPerformSavingsTransactions: false,
    canViewAllData: true,
    canManageUsers: false,
    canManageSettings: false,
    canViewReports: true,
    canViewAccounting: false,
  },
  [ROLES.FINANCE]: {
    canAddClients: false,
    canViewClients: true,
    canEditClients: false,
    canDeleteClients: false,
    canAddLoans: false,
    canViewLoans: true,
    canEditLoans: false,
    canDeleteLoans: false,
    canApproveClients: false,
    canApproveLoans: false,
    canApproveKYC: false,
    canDisburseLoans: true,
    canDisburseSavings: true,
    canPerformSavingsTransactions: true,
    canViewAllData: true,
    canManageUsers: false,
    canManageSettings: false,
    canViewReports: true,
    canViewAccounting: true,
  },
  [ROLES.BORROWER]: {
    canAddClients: false,
    canViewClients: false, // Can only view their own profile
    canEditClients: false,
    canDeleteClients: false,
    canAddLoans: true, // Can request loans
    canViewLoans: true, // Can only view their own loans
    canEditLoans: false,
    canDeleteLoans: false,
    canApproveClients: false,
    canApproveLoans: false,
    canApproveKYC: false,
    canDisburseLoans: false,
    canDisburseSavings: false,
    canPerformSavingsTransactions: false,
    canViewAllData: false, // Can only view their own data
    canManageUsers: false,
    canManageSettings: false,
    canViewReports: false,
    canViewAccounting: false,
    canRequestLoans: true,
    canViewOwnSavings: true,
    canViewOwnLoans: true,
    canViewOwnTransactions: true,
  },
};

// Check if user has a specific permission
export const hasPermission = (userRole, permission) => {
  if (!userRole || !ROLE_PERMISSIONS[userRole]) {
    return false;
  }
  
  // Admin has all permissions
  if (userRole === ROLES.ADMIN) {
    return true;
  }
  
  return ROLE_PERMISSIONS[userRole][permission] || false;
};

// Get menu items for a specific role
export const getMenuItemsForRole = (userRole) => {
  // Define menu items with proper role-based access
  const allMenuItems = [
    // Dashboard - Available to all
    { path: '/', icon: 'fas fa-home', label: 'Dashboard', roles: ['all'] },
    
    // Clients - Available to staff, not borrowers
    { 
      path: '/clients', 
      icon: 'fas fa-users', 
      label: 'Clients', 
      roles: ['admin', 'micro_loan_officer', 'head_micro_loan', 'supervisor', 'general_manager', 'branch_manager', 'loan_officer', 'customer_service', 'teller'],
      excludeRoles: ['borrower', 'finance', 'accountant', 'hr']
    },
    
    // Loans - All roles can view loans
    { 
      path: '/loans', 
      icon: 'fas fa-hand-holding-usd', 
      label: 'Loans', 
      roles: ['all'],
      getLabel: (role) => role === 'borrower' ? 'My Loans' : 'Loans'
    },
    
    // Loan Applications - Staff only
    { 
      path: '/loan-applications', 
      icon: 'fas fa-file-alt', 
      label: 'Loan Applications', 
      roles: ['admin', 'micro_loan_officer', 'head_micro_loan', 'supervisor', 'general_manager', 'branch_manager', 'loan_officer', 'customer_service'],
      excludeRoles: ['borrower', 'finance', 'accountant', 'hr', 'teller']
    },
    
    // Request Loan - Borrowers only
    { 
      path: '/request-loan', 
      icon: 'fas fa-plus-circle', 
      label: 'Request Loan', 
      roles: ['borrower'] 
    },
    
    // Savings - All roles can view savings
    { 
      path: '/savings', 
      icon: 'fas fa-piggy-bank', 
      label: 'Savings', 
      roles: ['all'],
      getLabel: (role) => role === 'borrower' ? 'My Savings' : 'Savings'
    },
    
    // Transactions - All roles
    { 
      path: '/transactions', 
      icon: 'fas fa-exchange-alt', 
      label: 'Transactions', 
      roles: ['all'],
      getLabel: (role) => role === 'borrower' ? 'Transaction History' : 'Transactions'
    },
    
    // Collections - Loan officers and managers
    { 
      path: '/collections', 
      icon: 'fas fa-money-bill-wave', 
      label: 'Collections', 
      roles: ['admin', 'micro_loan_officer', 'head_micro_loan', 'general_manager', 'branch_manager', 'loan_officer', 'teller'],
      excludeRoles: ['borrower', 'supervisor', 'finance', 'accountant', 'hr', 'customer_service']
    },
    
    // KYC Documents - Staff only
    { 
      path: '/kyc', 
      icon: 'fas fa-id-card', 
      label: 'KYC Documents', 
      roles: ['admin', 'micro_loan_officer', 'head_micro_loan', 'general_manager', 'branch_manager', 'loan_officer', 'customer_service'],
      excludeRoles: ['borrower', 'supervisor', 'finance', 'accountant', 'hr', 'teller']
    },
    
    // Collaterals - Staff only
    { 
      path: '/collaterals', 
      icon: 'fas fa-shield-alt', 
      label: 'Collaterals', 
      roles: ['admin', 'micro_loan_officer', 'head_micro_loan', 'general_manager', 'branch_manager', 'loan_officer'],
      excludeRoles: ['borrower', 'supervisor', 'finance', 'accountant', 'hr', 'teller', 'customer_service']
    },
    
    // Approval Center - Approvers only
    { 
      path: '/approval-center', 
      icon: 'fas fa-check-circle', 
      label: 'Approval Center', 
      roles: ['admin', 'micro_loan_officer', 'head_micro_loan', 'supervisor', 'general_manager', 'branch_manager'],
      excludeRoles: ['borrower', 'finance', 'accountant', 'hr', 'teller', 'loan_officer', 'customer_service']
    },
    
    // Accounting - Finance and accounting roles
    { 
      path: '/accounting', 
      icon: 'fas fa-calculator', 
      label: 'Accounting', 
      roles: ['admin', 'finance', 'general_manager', 'accountant'],
      excludeRoles: ['borrower', 'micro_loan_officer', 'head_micro_loan', 'supervisor', 'branch_manager', 'loan_officer', 'hr', 'teller', 'customer_service']
    },
    
    // Reports - Managers and officers
    { 
      path: '/reports', 
      icon: 'fas fa-chart-bar', 
      label: 'Reports', 
      roles: ['admin', 'micro_loan_officer', 'head_micro_loan', 'supervisor', 'finance', 'general_manager', 'branch_manager', 'accountant'],
      excludeRoles: ['borrower', 'loan_officer', 'hr', 'teller', 'customer_service']
    },
    
    // Borrower Reports - Borrowers only
    { 
      path: '/borrower-reports', 
      icon: 'fas fa-chart-line', 
      label: 'My Reports', 
      roles: ['borrower'] 
    },
    
    // Dues Management - Admin and Finance
    { 
      path: '/dues', 
      icon: 'fas fa-calendar-check', 
      label: 'Dues', 
      roles: ['admin', 'finance', 'general_manager'] 
    },
    
    // Staff Management - HR and Admin
    { 
      path: '/staff', 
      icon: 'fas fa-user-tie', 
      label: 'Staff', 
      roles: ['admin', 'hr']
    },
    
    // Payroll - HR and Admin
    { 
      path: '/payroll', 
      icon: 'fas fa-money-check-alt', 
      label: 'Payroll', 
      roles: ['admin', 'hr']
    },
    
    // User Management - Admin only
    { 
      path: '/users', 
      icon: 'fas fa-user-cog', 
      label: 'Users', 
      roles: ['admin']
    },
    
    // Branches - Admin and General Manager
    { 
      path: '/branches', 
      icon: 'fas fa-building', 
      label: 'Branches', 
      roles: ['admin', 'general_manager']
    },
    
    // Recycle Bin - Admin only
    { 
      path: '/recycle-bin', 
      icon: 'fas fa-trash-restore', 
      label: 'Recycle Bin', 
      roles: ['admin']
    },
    
    // Notifications - All roles
    { path: '/notifications', icon: 'fas fa-bell', label: 'Notifications', roles: ['all'] },
    
    // Profile - All roles
    { path: '/profile', icon: 'fas fa-user', label: 'Profile', roles: ['all'] },
  ];

  return allMenuItems
    .filter(item => {
      // Exclude items for specific roles
      if (item.excludeRoles && item.excludeRoles.includes(userRole)) {
        return false;
      }
      
      // Include items marked for 'all' (unless excluded above)
      if (item.roles.includes('all')) {
        return true;
      }
      
      // Include items for specific role
      return item.roles.includes(userRole);
    })
    .map(item => {
      // Apply dynamic label if getLabel function exists
      if (item.getLabel && typeof item.getLabel === 'function') {
        return {
          ...item,
          label: item.getLabel(userRole)
        };
      }
      return item;
    });
};

// Format role name for display
export const formatRoleName = (role) => {
  if (!role) return '';
  return role
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

