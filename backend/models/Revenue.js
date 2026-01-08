const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Revenue = sequelize.define('Revenue', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    revenue_number: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    source: {
      type: DataTypes.ENUM('loan_interest', 'savings_interest', 'fees', 'other'),
      allowNull: false
    },
    loan_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'loans',
        key: 'id'
      }
    },
    transaction_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'transactions',
        key: 'id'
      }
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'USD'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    revenue_date: {
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
    tableName: 'revenues',
    timestamps: true
  });

  return Revenue;
};
