const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Client = sequelize.define('Client', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    client_number: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    first_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    last_name: {
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
    phone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    primary_phone_country: {
      type: DataTypes.STRING,
      allowNull: true
    },
    secondary_phone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    secondary_phone_country: {
      type: DataTypes.STRING,
      allowNull: true
    },
    date_of_birth: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    gender: {
      type: DataTypes.ENUM('male', 'female', 'other'),
      allowNull: true
    },
    marital_status: {
      type: DataTypes.ENUM('single', 'married', 'divorced', 'widowed', 'separated'),
      allowNull: true
    },
    identification_type: {
      type: DataTypes.ENUM('national_id', 'passport', 'drivers_license', 'voters_card', 'birth_certificate'),
      allowNull: true
    },
    identification_number: {
      type: DataTypes.STRING,
      allowNull: true
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    city: {
      type: DataTypes.STRING,
      allowNull: true
    },
    state: {
      type: DataTypes.STRING,
      allowNull: true
    },
    zip_code: {
      type: DataTypes.STRING,
      allowNull: true
    },
    country: {
      type: DataTypes.STRING,
      allowNull: true
    },
    occupation: {
      type: DataTypes.STRING,
      allowNull: true
    },
    employer: {
      type: DataTypes.STRING,
      allowNull: true
    },
    employee_number: {
      type: DataTypes.STRING,
      allowNull: true
    },
    tax_number: {
      type: DataTypes.STRING,
      allowNull: true
    },
    monthly_income: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    income_currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'USD'
    },
    kyc_status: {
      type: DataTypes.ENUM('pending', 'verified', 'rejected'),
      defaultValue: 'pending'
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'suspended'),
      defaultValue: 'active'
    },
    branch_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'branches',
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
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    credit_score: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    profile_image: {
      type: DataTypes.STRING,
      allowNull: true
    },
    total_dues: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0,
      allowNull: false,
      comment: 'Total yearly dues for the client (starts as negative when set)'
    },
    dues_currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'USD',
      allowNull: false,
      comment: 'Currency for the total_dues field'
    }
  }, {
    tableName: 'clients',
    timestamps: true,
    paranoid: true, // Enable soft deletes
    deletedAt: 'deleted_at'
  });

  return Client;
};

