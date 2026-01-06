const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Payroll = sequelize.define('Payroll', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    payroll_number: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    staff_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'staff',
        key: 'id'
      }
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    pay_period_start: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    pay_period_end: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    gross_salary: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    deductions: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    net_salary: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'processed', 'paid'),
      defaultValue: 'pending'
    },
    payment_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    }
  }, {
    tableName: 'payrolls',
    timestamps: true
  });

  return Payroll;
};

