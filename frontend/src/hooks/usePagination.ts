import { useState } from "react";

export interface PaginationState {
  page: number;
  totalPages: number;
  total: number;
}

/**
 * Custom hook for pagination logic
 * @param initialPage - Initial page number (default: 1)
 * @returns Object with pagination state and handlers
 */
export function usePagination(initialPage: number = 1) {
  const [pagination, setPagination] = useState<PaginationState>({
    page: initialPage,
    totalPages: 1,
    total: 0,
  });

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  const goToNextPage = () => {
    if (pagination.page < pagination.totalPages) {
      handlePageChange(pagination.page + 1);
    }
  };

  const goToPreviousPage = () => {
    if (pagination.page > 1) {
      handlePageChange(pagination.page - 1);
    }
  };

  const resetToFirstPage = () => {
    handlePageChange(1);
  };

  return {
    pagination,
    setPagination,
    handlePageChange,
    goToNextPage,
    goToPreviousPage,
    resetToFirstPage,
  };
}
