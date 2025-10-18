import React, { useState } from 'react';
import { SearchFilters } from '../../types';
import { searchService } from '../../services/searchService';
import './SearchComponents.css';

interface FilterPanelProps {
    filters: SearchFilters;
    onFiltersChange: (filters: SearchFilters) => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
    filters,
    onFiltersChange,
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [localFilters, setLocalFilters] = useState<SearchFilters>(filters);

    const categories = searchService.getPopularCategories();

    const handleDateRangeChange = (field: 'startDate' | 'endDate', value: string) => {
        const newDate = value ? new Date(value) : undefined;
        const currentDateRange = localFilters.dateRange;

        // Create new date range object with the updated field
        const updatedDateRange = {
            startDate: field === 'startDate' ? newDate : currentDateRange?.startDate,
            endDate: field === 'endDate' ? newDate : currentDateRange?.endDate,
        };

        // Only include dateRange if at least one date is set
        if (updatedDateRange.startDate || updatedDateRange.endDate) {
            // Only set dateRange if we have at least one valid date
            const validDateRange: any = {};
            if (updatedDateRange.startDate) validDateRange.startDate = updatedDateRange.startDate;
            if (updatedDateRange.endDate) validDateRange.endDate = updatedDateRange.endDate;

            setLocalFilters({
                ...localFilters,
                dateRange: validDateRange,
            });
        } else {
            // Remove dateRange if both dates are empty
            const { dateRange, ...filtersWithoutDateRange } = localFilters;
            setLocalFilters(filtersWithoutDateRange);
        }
    };

    const handleLocationChange = (field: keyof NonNullable<SearchFilters['location']>, value: string | number) => {
        const newFilters = {
            ...localFilters,
            location: {
                ...localFilters.location,
                [field]: value || undefined,
            },
        };

        // Remove location if all fields are empty
        const locationFields = Object.values(newFilters.location || {});
        if (locationFields.every(val => !val)) {
            const { location, ...filtersWithoutLocation } = newFilters;
            setLocalFilters(filtersWithoutLocation);
            return;
        }

        setLocalFilters(newFilters);
    };

    const handleCategoryToggle = (category: string) => {
        const currentCategories = localFilters.categories || [];
        const newCategories = currentCategories.includes(category)
            ? currentCategories.filter(c => c !== category)
            : [...currentCategories, category];

        const newFilters = {
            ...localFilters,
            categories: newCategories.length > 0 ? newCategories : undefined,
        };

        setLocalFilters(newFilters);
    };

    const handlePriceRangeChange = (field: 'min' | 'max', value: string) => {
        const numValue = value ? parseFloat(value) : undefined;
        const currentPriceRange = localFilters.priceRange;

        // Create updated price range
        const updatedPriceRange = {
            min: field === 'min' ? numValue : currentPriceRange?.min,
            max: field === 'max' ? numValue : currentPriceRange?.max,
        };

        // Only include priceRange if at least one value is set
        if (updatedPriceRange.min !== undefined || updatedPriceRange.max !== undefined) {
            // Only set priceRange if we have at least one valid value
            const validPriceRange: any = {};
            if (updatedPriceRange.min !== undefined) validPriceRange.min = updatedPriceRange.min;
            if (updatedPriceRange.max !== undefined) validPriceRange.max = updatedPriceRange.max;

            setLocalFilters({
                ...localFilters,
                priceRange: validPriceRange,
            });
        } else {
            // Remove priceRange if both values are empty
            const { priceRange, ...filtersWithoutPriceRange } = localFilters;
            setLocalFilters(filtersWithoutPriceRange);
        }
    };

    const handleKeywordsChange = (value: string) => {
        const keywords = value.split(',').map(k => k.trim()).filter(k => k.length > 0);
        const newFilters = {
            ...localFilters,
            keywords: keywords.length > 0 ? keywords : undefined,
        };

        setLocalFilters(newFilters);
    };

    const applyFilters = () => {
        onFiltersChange(localFilters);
    };

    const clearFilters = () => {
        const emptyFilters: SearchFilters = {};
        setLocalFilters(emptyFilters);
        onFiltersChange(emptyFilters);
    };

    const hasActiveFilters = () => {
        return Object.keys(localFilters).length > 0;
    };

    const formatDateForInput = (date?: Date) => {
        if (!date) return '';
        return date.toISOString().split('T')[0];
    };

    return (
        <div className="filter-panel">
            <div className="filter-header">
                <button
                    className="filter-toggle"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <span>Filters</span>
                    <span className={`toggle-icon ${isExpanded ? 'expanded' : ''}`}>▼</span>
                    {hasActiveFilters() && <span className="active-indicator">●</span>}
                </button>

                {hasActiveFilters() && (
                    <button className="clear-filters-btn" onClick={clearFilters}>
                        Clear All
                    </button>
                )}
            </div>

            {isExpanded && (
                <div className="filter-content">
                    {/* Date Range Filter */}
                    <div className="filter-section">
                        <h4>Date Range</h4>
                        <div className="date-inputs">
                            <div className="input-group">
                                <label htmlFor="start-date">From:</label>
                                <input
                                    id="start-date"
                                    type="date"
                                    value={formatDateForInput(localFilters.dateRange?.startDate)}
                                    onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                />
                            </div>
                            <div className="input-group">
                                <label htmlFor="end-date">To:</label>
                                <input
                                    id="end-date"
                                    type="date"
                                    value={formatDateForInput(localFilters.dateRange?.endDate)}
                                    onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
                                    min={formatDateForInput(localFilters.dateRange?.startDate) || new Date().toISOString().split('T')[0]}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Location Filter */}
                    <div className="filter-section">
                        <h4>Location</h4>
                        <div className="location-inputs">
                            <div className="input-group">
                                <label htmlFor="city">City:</label>
                                <input
                                    id="city"
                                    type="text"
                                    placeholder="e.g., Seattle"
                                    value={localFilters.location?.city || ''}
                                    onChange={(e) => handleLocationChange('city', e.target.value)}
                                />
                            </div>
                            <div className="input-group">
                                <label htmlFor="state">State:</label>
                                <input
                                    id="state"
                                    type="text"
                                    placeholder="e.g., WA"
                                    value={localFilters.location?.state || ''}
                                    onChange={(e) => handleLocationChange('state', e.target.value)}
                                />
                            </div>
                            <div className="input-group">
                                <label htmlFor="radius">Radius (miles):</label>
                                <input
                                    id="radius"
                                    type="number"
                                    placeholder="25"
                                    min="1"
                                    max="500"
                                    value={localFilters.location?.radius || ''}
                                    onChange={(e) => handleLocationChange('radius', parseInt(e.target.value))}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Categories Filter */}
                    <div className="filter-section">
                        <h4>Categories</h4>
                        <div className="categories-grid">
                            {categories.map((category) => (
                                <label key={category} className="category-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={localFilters.categories?.includes(category) || false}
                                        onChange={() => handleCategoryToggle(category)}
                                    />
                                    <span>{category}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Price Range Filter */}
                    <div className="filter-section">
                        <h4>Price Range</h4>
                        <div className="price-inputs">
                            <div className="input-group">
                                <label htmlFor="min-price">Min ($):</label>
                                <input
                                    id="min-price"
                                    type="number"
                                    placeholder="0"
                                    min="0"
                                    value={localFilters.priceRange?.min || ''}
                                    onChange={(e) => handlePriceRangeChange('min', e.target.value)}
                                />
                            </div>
                            <div className="input-group">
                                <label htmlFor="max-price">Max ($):</label>
                                <input
                                    id="max-price"
                                    type="number"
                                    placeholder="1000"
                                    min="0"
                                    value={localFilters.priceRange?.max || ''}
                                    onChange={(e) => handlePriceRangeChange('max', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Keywords Filter */}
                    <div className="filter-section">
                        <h4>Keywords</h4>
                        <div className="input-group">
                            <label htmlFor="keywords">Keywords (comma-separated):</label>
                            <input
                                id="keywords"
                                type="text"
                                placeholder="e.g., networking, startup, tech"
                                value={localFilters.keywords?.join(', ') || ''}
                                onChange={(e) => handleKeywordsChange(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Apply Filters Button */}
                    <div className="filter-actions">
                        <button className="apply-filters-btn" onClick={applyFilters}>
                            Apply Filters
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};