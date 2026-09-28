const getPagination = (page, size) => {
  const limit = size ? +size : 10;
  const offset = page ? (page - 1) * limit : 0;
  return { limit, offset };
};

const getPagingData = (totalItems, currentPage, limit) => {
  const totalPages = Math.ceil(totalItems / limit);
  return {
    total: totalItems,
    per_page: limit,
    current_page: currentPage ? +currentPage : 1,
    total_pages: totalPages,
  };
};

module.exports = { getPagination, getPagingData };
