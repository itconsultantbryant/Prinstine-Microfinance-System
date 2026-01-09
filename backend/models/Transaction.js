const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Transaction = sequelize.define('Transaction', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    transaction_number: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    client_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'clients',
        key: 'id'
      }
    },
    loan_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'loans',
        key: 'id'
      }
    },
    savings_account_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'savings_accounts',
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
    type: {
      type: DataTypes.ENUM('deposit', 'withdrawal', 'loan_payment', 'loan_disbursement', 'fee', 'interest', 'penalty', 'transfer', 'push_back', 'personal_interest_payment', 'general_interest', 'due_payment'),
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    },
    currency: {
      type: DataTypes.ENUM('LRD', 'USD'),
      defaultValue: 'USD',
      allowNull: false,
      comment: 'Currency for the transaction (LRD or USD)'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('pending', 'completed', 'failed', 'cancelled'),
      defaultValue: 'pending'
    },
    transaction_date: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
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
    tableName: 'transactions',
    timestamps: true
  });

  return Transaction;
};

