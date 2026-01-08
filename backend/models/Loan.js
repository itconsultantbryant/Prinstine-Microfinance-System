const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Loan = sequelize.define('Loan', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    loan_number: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    client_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'clients',
        key: 'id'
      }
    },
    branch_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'branches',
        key: 'id'
      }
    },
    collateral_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'collaterals',
        key: 'id'
      }
    },
    loan_type: {
      type: DataTypes.ENUM('personal', 'excess', 'business', 'agricultural', 'education', 'housing', 'micro', 'group', 'emergency'),
      defaultValue: 'personal'
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    },
    principal_amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true
    },
    interest_rate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false
    },
    term_months: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    payment_frequency: {
      type: DataTypes.ENUM('weekly', 'biweekly', 'monthly', 'quarterly', 'lump_sum'),
      defaultValue: 'monthly'
    },
    disbursement_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    due_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'disbursed', 'active', 'overdue', 'completed', 'cancelled', 'defaulted'),
      defaultValue: 'pending'
    },
    outstanding_balance: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    total_paid: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    penalty_rate: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    interest_method: {
      type: DataTypes.ENUM('flat', 'declining_balance', 'compound'),
      defaultValue: 'declining_balance'
    },
    repayment_type: {
      type: DataTypes.ENUM('principal_interest', 'interest_only', 'balloon', 'custom'),
      defaultValue: 'principal_interest'
    },
    loan_purpose: {
      type: DataTypes.STRING,
      allowNull: true
    },
    application_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    monthly_payment: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true
    },
    total_interest: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    total_amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true
    },
    repayment_schedule: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const value = this.getDataValue('repayment_schedule');
        return value ? JSON.parse(value) : null;
      },
      set(value) {
        this.setDataValue('repayment_schedule', value ? JSON.stringify(value) : null);
      }
    },
    next_due_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    next_payment_amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true
    },
    upfront_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 0
    },
    upfront_amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      defaultValue: 0
    },
    default_charges_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 0
    },
    default_charges_amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      defaultValue: 0
    }
  }, {
    tableName: 'loans',
    timestamps: true,
    paranoid: true, // Enable soft deletes
    deletedAt: 'deleted_at'
  });

  return Loan;
};

