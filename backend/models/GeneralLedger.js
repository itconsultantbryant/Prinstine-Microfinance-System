const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const GeneralLedger = sequelize.define('GeneralLedger', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    entry_number: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    account_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'chart_of_accounts',
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
    debit: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    credit: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    balance: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    reference_type: {
      type: DataTypes.STRING,
      allowNull: true
    },
    reference_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    transaction_date: {
      type: DataTypes.DATE,
      allowNull: false
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
    tableName: 'general_ledger',
    timestamps: true
  });

  return GeneralLedger;
};

