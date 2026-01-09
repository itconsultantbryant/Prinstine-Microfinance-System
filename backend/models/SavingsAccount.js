const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SavingsAccount = sequelize.define('SavingsAccount', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    account_number: {
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
    account_type: {
      type: DataTypes.ENUM('regular', 'fixed', 'joint'),
      defaultValue: 'regular'
    },
    balance: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    interest_rate: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'closed', 'pending'),
      defaultValue: 'pending'
    },
    opening_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    closing_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'USD',
      allowNull: false,
      comment: 'Currency for the savings account (LRD or USD)'
    }
  }, {
    tableName: 'savings_accounts',
    timestamps: true,
    paranoid: true, // Enable soft deletes
    deletedAt: 'deleted_at'
  });

  return SavingsAccount;
};

