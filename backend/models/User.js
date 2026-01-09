const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('admin', 'general_manager', 'branch_manager', 'loan_officer', 'hr', 'borrower', 'teller', 'customer_service', 'supervisor', 'accountant', 'micro_loan_officer', 'head_micro_loan', 'finance'),
      allowNull: false,
      defaultValue: 'borrower'
    },
    branch_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'branches',
        key: 'id'
      }
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    avatar: {
      type: DataTypes.STRING,
      allowNull: true
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    two_factor_secret: {
      type: DataTypes.STRING,
      allowNull: true
    },
    two_factor_recovery_codes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    two_factor_confirmed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    email_verified_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'users',
    timestamps: true,
    underscored: false,
    paranoid: true, // Enable soft deletes
    deletedAt: 'deleted_at'
  });

  return User;
};

