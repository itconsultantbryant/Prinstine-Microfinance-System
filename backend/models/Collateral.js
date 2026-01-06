const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Collateral = sequelize.define('Collateral', {
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
    type: {
      type: DataTypes.ENUM('property', 'vehicle', 'equipment', 'jewelry', 'other'),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    estimated_value: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'USD'
    },
    status: {
      type: DataTypes.ENUM('pending', 'verified', 'rejected'),
      defaultValue: 'pending'
    },
    documents: {
      type: DataTypes.JSON,
      allowNull: true
    }
  }, {
    tableName: 'collaterals',
    timestamps: true
  });

  return Collateral;
};

