/**
 * Helper Utility untuk Waktu Indonesia Barat (WIB / UTC+7) pada Backend (Asia/Jakarta)
 */

const getWIBDateTime = () => {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const wib = new Date(utc + (3600000 * 7)); // UTC+7 (Asia/Jakarta)

  const yyyy = wib.getFullYear();
  const mm = String(wib.getMonth() + 1).padStart(2, '0');
  const dd = String(wib.getDate()).padStart(2, '0');
  const hh = String(wib.getHours()).padStart(2, '0');
  const min = String(wib.getMinutes()).padStart(2, '0');

  const date = `${yyyy}-${mm}-${dd}`;
  const time = `${hh}:${min}`;

  return {
    date,
    time,
    fullStr: `${date} ${time} WIB`,
  };
};

const getCurrentDateWIB = () => getWIBDateTime().date;
const getCurrentTimeWIB = () => getWIBDateTime().time;

const addDaysStr = (dateStr, days = 1) => {
  if (!dateStr) return getCurrentDateWIB();
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d + days);
  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

module.exports = {
  getWIBDateTime,
  getCurrentDateWIB,
  getCurrentTimeWIB,
  addDaysStr,
};
