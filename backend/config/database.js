const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config();

let sequelize;

// Check if DB_URL is provided (for Render and other cloud providers)
if (process.env.DB_URL) {
  // Use connection string directly
  sequelize = new Sequelize(process.env.DB_URL, {
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    dialectOptions: {
      ssl: process.env.NODE_ENV === 'production' ? {
        require: true,
        rejectUnauthorized: false
      } : false
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  });
} else if (process.env.DB_DIALECT === 'postgres') {
  // PostgreSQL configuration with individual parameters
  sequelize = new Sequelize(
    process.env.DB_NAME || 'microfinance',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || '',
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      dialect: 'postgres',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      dialectOptions: {
        ssl: process.env.NODE_ENV === 'production' ? {
          require: true,
          rejectUnauthorized: false
        } : false
      },
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    }
  );
} else {
  // SQLite configuration (default)
  const dbPath = process.env.DB_STORAGE || path.join(__dirname, '../database/microfinance.db');
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: dbPath,
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: true
    }
  });
}

// Import models
const User = require('../models/User')(sequelize);
const Branch = require('../models/Branch')(sequelize);
const Client = require('../models/Client')(sequelize);
const Loan = require('../models/Loan')(sequelize);
const SavingsAccount = require('../models/SavingsAccount')(sequelize);
const Transaction = require('../models/Transaction')(sequelize);
const Collateral = require('../models/Collateral')(sequelize);
const KycDocument = require('../models/KycDocument')(sequelize);
const ChartOfAccount = require('../models/ChartOfAccount')(sequelize);
const GeneralLedger = require('../models/GeneralLedger')(sequelize);
const JournalEntry = require('../models/JournalEntry')(sequelize);
const LoanRepayment = require('../models/LoanRepayment')(sequelize);
const Collection = require('../models/Collection')(sequelize);
const Staff = require('../models/Staff')(sequelize);
const Payroll = require('../models/Payroll')(sequelize);
const Bank = require('../models/Bank')(sequelize);
const Expense = require('../models/Expense')(sequelize);
const Revenue = require('../models/Revenue')(sequelize);
const Transfer = require('../models/Transfer')(sequelize);
const Notification = require('../models/Notification')(sequelize);
const AuditLog = require('../models/AuditLog')(sequelize);

// Define relationships
User.belongsTo(Branch, { foreignKey: 'branch_id', as: 'branch' });
Branch.hasMany(User, { foreignKey: 'branch_id', as: 'users' });

Client.belongsTo(Branch, { foreignKey: 'branch_id', as: 'branch' });
Client.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
Branch.hasMany(Client, { foreignKey: 'branch_id', as: 'clients' });

Loan.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });
Loan.belongsTo(Branch, { foreignKey: 'branch_id', as: 'branch' });
Loan.belongsTo(Collateral, { foreignKey: 'collateral_id', as: 'collateral' });
Loan.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
Client.hasMany(Loan, { foreignKey: 'client_id', as: 'loans' });
Branch.hasMany(Loan, { foreignKey: 'branch_id', as: 'loans' });

SavingsAccount.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });
SavingsAccount.belongsTo(Branch, { foreignKey: 'branch_id', as: 'branch' });
Client.hasMany(SavingsAccount, { foreignKey: 'client_id', as: 'savingsAccounts' });

Transaction.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });
Transaction.belongsTo(Loan, { foreignKey: 'loan_id', as: 'loan' });
Transaction.belongsTo(SavingsAccount, { foreignKey: 'savings_account_id', as: 'savingsAccount' });
Transaction.belongsTo(Branch, { foreignKey: 'branch_id', as: 'branch' });
SavingsAccount.hasMany(Transaction, { foreignKey: 'savings_account_id', as: 'transactions' });

Collateral.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });
Client.hasMany(Collateral, { foreignKey: 'client_id', as: 'collaterals' });

KycDocument.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });
Client.hasMany(KycDocument, { foreignKey: 'client_id', as: 'kycDocuments' });

LoanRepayment.belongsTo(Loan, { foreignKey: 'loan_id', as: 'loan' });
LoanRepayment.belongsTo(Transaction, { foreignKey: 'transaction_id', as: 'transaction' });
Loan.hasMany(LoanRepayment, { foreignKey: 'loan_id', as: 'repayments' });

Collection.belongsTo(Loan, { foreignKey: 'loan_id', as: 'loan' });
Loan.hasMany(Collection, { foreignKey: 'loan_id', as: 'collections' });

Staff.belongsTo(Branch, { foreignKey: 'branch_id', as: 'branch' });
Staff.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Payroll.belongsTo(Staff, { foreignKey: 'staff_id', as: 'staff' });
Payroll.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// General Ledger relationships
GeneralLedger.belongsTo(ChartOfAccount, { foreignKey: 'account_id', as: 'account' });
GeneralLedger.belongsTo(Branch, { foreignKey: 'branch_id', as: 'branch' });
GeneralLedger.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
ChartOfAccount.hasMany(GeneralLedger, { foreignKey: 'account_id', as: 'ledgerEntries' });

// Journal Entry relationships
JournalEntry.belongsTo(Branch, { foreignKey: 'branch_id', as: 'branch' });
JournalEntry.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// Expense relationships
Expense.belongsTo(ChartOfAccount, { foreignKey: 'account_id', as: 'account' });
Expense.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
Expense.belongsTo(User, { foreignKey: 'approved_by', as: 'approver' });

// Revenue relationships
Revenue.belongsTo(Loan, { foreignKey: 'loan_id', as: 'loan' });
Revenue.belongsTo(Transaction, { foreignKey: 'transaction_id', as: 'transaction' });
Revenue.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
Loan.hasMany(Revenue, { foreignKey: 'loan_id', as: 'revenues' });
Transaction.hasOne(Revenue, { foreignKey: 'transaction_id', as: 'revenue' });

// Transfer relationships
Transfer.belongsTo(Bank, { foreignKey: 'from_account_id', as: 'fromAccount' });
Transfer.belongsTo(Bank, { foreignKey: 'to_account_id', as: 'toAccount' });
Transfer.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
Transfer.belongsTo(User, { foreignKey: 'approved_by', as: 'approver' });

// Export models and sequelize instance
const db = {
  sequelize,
  Sequelize,
  User,
  Branch,
  Client,
  Loan,
  SavingsAccount,
  Transaction,
  Collateral,
  KycDocument,
  ChartOfAccount,
  GeneralLedger,
  JournalEntry,
  LoanRepayment,
  Collection,
  Staff,
  Payroll,
  Bank,
  Expense,
  Revenue,
  Transfer,
  Notification,
  AuditLog
};

module.exports = db;

