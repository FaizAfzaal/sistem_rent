/**
 * Helper Utility untuk Waktu Indonesia Barat (WIB / UTC+7) pada Frontend
 */
export const getWIBDateTime = () => {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const wib = new Date(utc + (3600000 * 7)); // UTC+7

  const yyyy = wib.getFullYear();
  const mm = String(wib.getMonth() + 1).padStart(2, '0');
  const dd = String(wib.getDate()).padStart(2, '0');
  const hh = String(wib.getHours()).padStart(2, '0');
  const min = String(wib.getMinutes()).padStart(2, '0');

  return {
    date: `${yyyy}-${mm}-${dd}`,
    time: `${hh}:${min}`,
    fullStr: `${yyyy}-${mm}-${dd} ${hh}:${min} WIB`,
  };
};

export const getTodayWIB = () => getWIBDateTime().date;
export const getCurrentTimeWIB = () => getWIBDateTime().time;

export const addOneDayStr = (dateStr) => {
  if (!dateStr) return getTodayWIB();
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d + 1);
  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};
