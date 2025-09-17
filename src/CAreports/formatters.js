// utils/formatters.js - Utility functions for formatting numbers and currency
export const formatIndianNumber = (amount, showCurrency = true) => {
  if (!amount || amount === 0) return showCurrency ? '₹0' : '0';

  const num = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  let formattedNum;
  let suffix = '';

  if (num >= 10000000) { // 1 Crore and above
    if (num >= 1000000000000) { // 1 Lakh Crore
      formattedNum = (num / 1000000000000).toFixed(2);
      suffix = 'L Cr';
    } else if (num >= 10000000000) { // 1000 Crore (Arab)
      formattedNum = (num / 1000000000).toFixed(2);
      suffix = 'B';
    } else if (num >= 10000000) { // 1 Crore
      formattedNum = (num / 10000000).toFixed(2);
      suffix = 'Cr';
    }
  } else if (num >= 100000) { // 1 Lakh
    formattedNum = (num / 100000).toFixed(2);
    suffix = 'L';
  } else if (num >= 1000) { // 1 Thousand
    formattedNum = (num / 1000).toFixed(2);
    suffix = 'K';
  } else {
    formattedNum = num.toFixed(2);
  }

  // Remove trailing zeros
  formattedNum = parseFloat(formattedNum).toString();

  const result = `${sign}${formattedNum}${suffix}`;
  return showCurrency ? `₹${result}` : result;
};

export const formatCurrency = (amount) => {
  return formatIndianNumber(amount, true);
};
