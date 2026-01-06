const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Collection = sequelize.define('Collection', {
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
    collection_number: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    amount_due: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    },
    amount_collected: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    overdue_days: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    status: {
      type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'written_off'),
      defaultValue: 'pending'
    },
    collection_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    assigned_to: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    tableName: 'collections',
    timestamps: true
  });

  return Collection;
};

