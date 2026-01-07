/**
 * Loan Calculation Service
 * Handles flat rate and declining balance loan calculations
 */

/**
 * Calculate declining balance loan schedule
 * Uses EMI formula: EMI = P * r * (1+r)^n / ((1+r)^n - 1)
 */
function calculateDecliningBalanceSchedule(principal, interestRate, termMonths, startDate = null, paymentFrequency = 'monthly') {
  if (principal <= 0 || termMonths <= 0) {
    throw new Error('Principal and term must be greater than zero');
  }

  const start = startDate ? new Date(startDate) : new Date();
  const schedule = [];
  let outstandingBalance = parseFloat(principal);
  let totalInterest = 0;

  // Calculate periods per year based on payment frequency
  const periodsPerYear = {
    daily: 365,
    weekly: 52,
    biweekly: 26,
    monthly: 12,
    quarterly: 4,
    yearly: 1
  }[paymentFrequency] || 12;

  // Calculate number of installments
  const totalInstallments = Math.ceil(termMonths / (12 / periodsPerYear));

  // Calculate periodic interest rate
  const r = (parseFloat(interestRate) / 100) / periodsPerYear;

  // Calculate EMI
  let emi = 0;
  if (r <= 0.00000001) {
    emi = outstandingBalance / totalInstallments;
  } else {
    const pow = Math.pow(1 + r, totalInstallments);
    emi = outstandingBalance * r * pow / (pow - 1);
  }
  emi = Math.round(emi * 100) / 100;

  // Generate schedule
  for (let installment = 1; installment <= totalInstallments; installment++) {
    // Calculate interest for this period
    const interestAmount = Math.round(outstandingBalance * r * 100) / 100;
    
    // Calculate principal payment
    let principalAmount = emi - interestAmount;
    
    // For last installment, ensure we pay exactly the remaining balance
    if (installment === totalInstallments) {
      principalAmount = outstandingBalance;
    }
    
    // Ensure principal doesn't exceed outstanding balance
    principalAmount = Math.min(principalAmount, outstandingBalance);
    const totalPayment = principalAmount + interestAmount;
    
    // Update outstanding balance
    outstandingBalance = Math.max(0, outstandingBalance - principalAmount);
    totalInterest += interestAmount;

    // Calculate due date
    const dueDate = new Date(start);
    if (paymentFrequency === 'monthly') {
      dueDate.setMonth(dueDate.getMonth() + installment);
    } else if (paymentFrequency === 'weekly') {
      dueDate.setDate(dueDate.getDate() + (installment * 7));
    } else if (paymentFrequency === 'biweekly') {
      dueDate.setDate(dueDate.getDate() + (installment * 14));
    } else if (paymentFrequency === 'quarterly') {
      dueDate.setMonth(dueDate.getMonth() + (installment * 3));
    }

    schedule.push({
      installment_number: installment,
      due_date: dueDate.toISOString().split('T')[0],
      principal_amount: Math.round(principalAmount * 100) / 100,
      interest_amount: Math.round(interestAmount * 100) / 100,
      total_payment: Math.round(totalPayment * 100) / 100,
      outstanding_balance: Math.round(outstandingBalance * 100) / 100,
      status: 'pending'
    });
  }
  
  // Round final values to ensure accuracy
  totalInterest = Math.round(totalInterest * 100) / 100;
  const finalTotalAmount = Math.round((parseFloat(principal) + totalInterest) * 100) / 100;

  return {
    schedule,
    total_interest: totalInterest,
    total_amount: finalTotalAmount,
    monthly_payment: Math.round(emi * 100) / 100
  };
}

/**
 * Calculate flat rate loan schedule
 * Total interest = principal × rate
 * Payment per installment = (principal + total interest) / installments
 */
function calculateFlatRateSchedule(principal, interestRate, termMonths, startDate = null, paymentFrequency = 'monthly') {
  if (principal <= 0 || termMonths <= 0) {
    throw new Error('Principal and term must be greater than zero');
  }

  const start = startDate ? new Date(startDate) : new Date();
  const principalAmount = parseFloat(principal);
  
  // Total interest = principal × rate
  const totalInterest = principalAmount * (parseFloat(interestRate) / 100);
  
  // Total amount = principal + total interest
  const totalAmount = principalAmount + totalInterest;
  
  // Calculate periods per year
  const periodsPerYear = {
    daily: 365,
    weekly: 52,
    biweekly: 26,
    monthly: 12,
    quarterly: 4,
    yearly: 1
  }[paymentFrequency] || 12;
  
  // Calculate number of installments
  const totalInstallments = Math.ceil(termMonths / (12 / periodsPerYear));
  
  // Payment per installment = total amount / installments
  const paymentPerInstallment = totalAmount / totalInstallments;
  
  // Principal per installment
  const principalPerInstallment = principalAmount / totalInstallments;
  
  // Interest per installment
  const interestPerInstallment = totalInterest / totalInstallments;
  
  const schedule = [];
  let remainingBalance = totalAmount;
  
  for (let installment = 1; installment <= totalInstallments; installment++) {
    // For last installment, pay remaining balance
    let principalAmount, interestAmount, totalPayment;
    
    if (installment === totalInstallments) {
      // Last installment: pay remaining balance
      interestAmount = interestPerInstallment;
      principalAmount = remainingBalance - interestAmount;
      totalPayment = remainingBalance;
      remainingBalance = 0;
    } else {
      principalAmount = principalPerInstallment;
      interestAmount = interestPerInstallment;
      totalPayment = principalAmount + interestAmount;
      remainingBalance = Math.max(0, remainingBalance - totalPayment);
    }
    
    // Calculate due date
    const dueDate = new Date(start);
    if (paymentFrequency === 'monthly') {
      dueDate.setMonth(dueDate.getMonth() + installment);
    } else if (paymentFrequency === 'weekly') {
      dueDate.setDate(dueDate.getDate() + (installment * 7));
    } else if (paymentFrequency === 'biweekly') {
      dueDate.setDate(dueDate.getDate() + (installment * 14));
    } else if (paymentFrequency === 'quarterly') {
      dueDate.setMonth(dueDate.getMonth() + (installment * 3));
    }
    
    schedule.push({
      installment_number: installment,
      due_date: dueDate.toISOString().split('T')[0],
      principal_amount: Math.round(principalAmount * 100) / 100,
      interest_amount: Math.round(interestAmount * 100) / 100,
      total_payment: Math.round(totalPayment * 100) / 100,
      outstanding_balance: Math.round(remainingBalance * 100) / 100,
      status: 'pending'
    });
  }
  
  return {
    schedule,
    total_interest: Math.round(totalInterest * 100) / 100,
    total_amount: Math.round(totalAmount * 100) / 100,
    monthly_payment: Math.round(paymentPerInstallment * 100) / 100
  };
}

/**
 * Generate repayment schedule based on interest method
 */
function generateRepaymentSchedule(principal, interestRate, termMonths, interestMethod, paymentFrequency, startDate = null) {
  if (interestMethod === 'flat') {
    return calculateFlatRateSchedule(principal, interestRate, termMonths, startDate, paymentFrequency);
  } else {
    // Default to declining_balance
    return calculateDecliningBalanceSchedule(principal, interestRate, termMonths, startDate, paymentFrequency);
  }
}

module.exports = {
  calculateDecliningBalanceSchedule,
  calculateFlatRateSchedule,
  generateRepaymentSchedule
};

