const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const LoanRepayment = sequelize.define('LoanRepayment', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    loan_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'loans',
        key: 'id'
      }
    },
    repayment_number: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    installment_number: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    },
    principal_amount: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    interest_amount: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    penalty_amount: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    payment_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    due_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('pending', 'completed', 'overdue', 'partial'),
      defaultValue: 'pending'
    },
    payment_method: {
      type: DataTypes.ENUM('cash', 'bank_transfer', 'mobile_money', 'check'),
      allowNull: true
    },
    transaction_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'transactions',
        key: 'id'
      }
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    tableName: 'loan_repayments',
    timestamps: true,
    paranoid: true,
    deletedAt: 'deleted_at'
  });

  return LoanRepayment;
};

