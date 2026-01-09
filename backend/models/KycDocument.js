const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const KycDocument = sequelize.define('KycDocument', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    client_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'clients',
        key: 'id'
      }
    },
    document_type: {
      type: DataTypes.ENUM('id_card', 'passport', 'drivers_license', 'utility_bill', 'bank_statement', 'other'),
      allowNull: false
    },
    document_number: {
      type: DataTypes.STRING,
      allowNull: true
    },
    file_path: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('pending', 'verified', 'rejected'),
      defaultValue: 'pending'
    },
    verified_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    verified_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'kyc_documents',
    timestamps: true,
    paranoid: true, // Enable soft deletes
    deletedAt: 'deleted_at'
  });

  return KycDocument;
};

