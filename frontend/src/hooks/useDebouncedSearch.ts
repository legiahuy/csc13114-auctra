import { useState, useEffect } from "react";

/**
 * Custom hook for debounced search input
 * @param initialValue - Initial search value
 * @param delay - Debounce delay in milliseconds (default: 400ms)
 * @returns Object with searchInput, debouncedSearch, setSearchInput, and handleClear
 */
export function useDebouncedSearch(initialValue: string = "", delay: number = 400) {
  const [searchInput, setSearchInput] = useState(initialValue);
  const [debouncedSearch, setDebouncedSearch] = useState(initialValue);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, delay);

    return () => clearTimeout(timer);
  }, [searchInput, delay]);

  const handleClear = () => {
    setSearchInput("");
    setDebouncedSearch("");
  };

  return {
    searchInput,
    debouncedSearch,
    setSearchInput,
    handleClear,
    isSearching: searchInput !== debouncedSearch,
  };
}
