export function getPaginatedScanHistory(items = [], page = 1, pageSize = 10) {
  const list = Array.isArray(items) ? items : [];
  const totalItems = list.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(Math.max(1, Number(page) || 1), totalPages);
  
  const startIndex = (currentPage - 1) * pageSize;
  const slicedItems = list.slice(startIndex, startIndex + pageSize);

  return {
    slicedItems,
    totalPages,
    currentPage,
    hasPrev: currentPage > 1,
    hasNext: currentPage < totalPages,
    totalItems
  };
}
