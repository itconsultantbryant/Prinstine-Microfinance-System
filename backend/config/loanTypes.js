// Loan type configurations with interest rates and upfront percentages
const LOAN_TYPES = {
  personal: {
    name: 'Personal Loan',
    interestRate: 10, // 10% interest (not upfront)
    upfrontPercentage: 0, // No upfront
    interestMethod: 'declining_balance',
    hasDefaultCharges: false,
    interestDistribution: {
      admin: 0.30, // 30% to admin revenue
      client: 0.40, // 40% to client with loan
      general: 0.30 // 30% divided among all clients with savings
    }
  },
  excess: {
    name: 'Excess Loan',
    interestRate: 10, // 10% interest
    upfrontPercentage: 0, // No upfront
    interestMethod: 'declining_balance',
    hasDefaultCharges: false,
    interestDistribution: {
      admin: 0.20, // 20% to admin revenue
      client: 0.30, // 30% to client with loan
      general: 0.50 // 50% divided among all clients with savings
    }
  },
  business: {
    name: 'Business Loan',
    interestRate: 5, // 5% on loan
    upfrontPercentage: 10, // 10% upfront
    interestMethod: 'declining_balance',
    hasDefaultCharges: false
  },
  emergency: {
    name: 'Emergency Loan',
    interestRate: 16, // 16% on loan
    upfrontPercentage: 2, // 2% upfront
    interestMethod: 'declining_balance',
    hasDefaultCharges: true
  },
  micro: {
    name: 'Micro Loan',
    interestRate: 12, // Default 12% on loan (can be customized)
    upfrontPercentage: 5, // Default 5% upfront (can be customized)
    interestMethod: 'declining_balance',
    hasDefaultCharges: true
  }
};

/**
 * Get loan type configuration
 * @param {string} loanType - The loan type
 * @returns {Object} Loan type configuration
 */
function getLoanTypeConfig(loanType) {
  return LOAN_TYPES[loanType] || LOAN_TYPES.personal;
}

/**
 * Calculate upfront amount from loan amount and upfront percentage
 * @param {number} loanAmount - The loan amount
 * @param {number} upfrontPercentage - The upfront percentage
 * @returns {number} Upfront amount
 */
function calculateUpfrontAmount(loanAmount, upfrontPercentage) {
  return (loanAmount * upfrontPercentage) / 100;
}

/**
 * Calculate principal amount after upfront deduction
 * @param {number} loanAmount - The loan amount
 * @param {number} upfrontAmount - The upfront amount
 * @returns {number} Principal amount
 */
function calculatePrincipalAmount(loanAmount, upfrontAmount) {
  return loanAmount - upfrontAmount;
}

module.exports = {
  LOAN_TYPES,
  getLoanTypeConfig,
  calculateUpfrontAmount,
  calculatePrincipalAmount
};

