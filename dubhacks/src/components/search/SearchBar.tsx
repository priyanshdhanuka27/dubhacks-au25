import React, { useState, useRef, useEffect } from 'react';
import { SearchFilters } from '../../types';
import { searchService } from '../../services/searchService';
import './SearchComponents.css';

interface SearchBarProps {
  onSearch: (query: string, filters?: SearchFilters) => void;
  loading?: boolean;
  placeholder?: string;
  initialQuery?: string;
  showSuggestions?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  loading = false,
  placeholder = 'Search for events...',
  initialQuery = '',
  showSuggestions = true,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestionsList, setShowSuggestionsList] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showSuggestions && query.length >= 2) {
      const newSuggestions = searchService.getSearchSuggestions(query);
      setSuggestions(newSuggestions);
      setShowSuggestionsList(true);
    } else {
      setShowSuggestionsList(false);
    }
    setSelectedSuggestionIndex(-1);
  }, [query, showSuggestions]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestionsList(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
      setShowSuggestionsList(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestionsList || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        if (selectedSuggestionIndex >= 0) {
          e.preventDefault();
          const selectedSuggestion = suggestions[selectedSuggestionIndex];
          setQuery(selectedSuggestion);
          onSearch(selectedSuggestion);
          setShowSuggestionsList(false);
        }
        break;
      case 'Escape':
        setShowSuggestionsList(false);
        setSelectedSuggestionIndex(-1);
        break;
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    onSearch(suggestion);
    setShowSuggestionsList(false);
    inputRef.current?.focus();
  };

  const handleInputFocus = () => {
    if (showSuggestions && query.length >= 2) {
      setShowSuggestionsList(true);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setShowSuggestionsList(false);
    inputRef.current?.focus();
  };

  return (
    <div className="search-bar-container">
      <form onSubmit={handleSubmit} className="search-form">
        <div className="search-input-container">
          <div className="search-icon">🔍</div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={handleInputFocus}
            placeholder={placeholder}
            disabled={loading}
            className="search-input"
          />
          {query && (
            <button
              type="button"
              onClick={clearSearch}
              className="clear-search-btn"
              title="Clear search"
            >
              ✕
            </button>
          )}
          <button
            type="submit"
            disabled={!query.trim() || loading}
            className="search-submit-btn"
          >
            {loading ? (
              <div className="loading-spinner small"></div>
            ) : (
              'Search'
            )}
          </button>
        </div>
      </form>

      {showSuggestionsList && suggestions.length > 0 && (
        <div ref={suggestionsRef} className="suggestions-list">
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className={`suggestion-item ${
                index === selectedSuggestionIndex ? 'selected' : ''
              }`}
              onClick={() => handleSuggestionClick(suggestion)}
              onMouseEnter={() => setSelectedSuggestionIndex(index)}
            >
              <span className="suggestion-icon">🔍</span>
              <span className="suggestion-text">{suggestion}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};