const generateKodeBooking = () => {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `BK${year}${month}${day}${random}`;
};

const generateKodeAlat = (prefix = 'ALT') => {
  const random = Math.floor(Math.random() * 90000) + 10000;
  return `${prefix}${random}`;
};

const generateCustomerCode = async (CustomerModel) => {
  try {
    const lastCustomer = await CustomerModel.findOne({
      order: [['id', 'DESC']],
      paranoid: false,
    });
    let nextNum = 1;
    if (lastCustomer && lastCustomer.customer_code) {
      const match = lastCustomer.customer_code.match(/\d+/);
      if (match) {
        nextNum = parseInt(match[0], 10) + 1;
      } else {
        nextNum = (lastCustomer.id || 0) + 1;
      }
    }
    return `CUST${String(nextNum).padStart(4, '0')}`;
  } catch {
    const random = Math.floor(Math.random() * 9000) + 1000;
    return `CUST${random}`;
  }
};

module.exports = { generateKodeBooking, generateKodeAlat, generateCustomerCode };
