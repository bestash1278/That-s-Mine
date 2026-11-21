import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search } from 'lucide-react';
import Button from '../components/common/Button.jsx';
import Input from '../components/common/Input.jsx';
import Select from '../components/common/Select.jsx';
import ItemCard from '../components/common/ItemCard.jsx';
import FilterChip from '../components/common/FilterChip.jsx';
import LoadingState from '../components/common/LoadingState.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import Pagination from '../components/common/Pagination.jsx';
import Card from '../components/common/Card.jsx';
import client from '../api/client.js';
import { useItemSearch } from '../hooks/useItemSearch.js';
import { CATEGORIES } from '../constants/categories.js';
import { SORT_OPTIONS, getSortLabel, sortItems } from '../constants/sortOptions.js';

export default function ItemsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { filters, updateFilter, removeFilter, clearAllFilters, setPage } = useItemSearch();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // API 호출
  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await client.get('/found-items', {
          params: {
            keyword: filters.keyword || undefined,
            categoryId: filters.categoryId || undefined,
            startDate: filters.startDate || undefined,
            endDate: filters.endDate || undefined,
            page: filters.page - 1,
            size: 20,
          },
        });

        const { content = [], totalElements: total = 0, totalPages: pages = 0 } = response.data?.data || {};

        // 클라이언트 정렬 적용
        const sorted = sortItems(content, filters.sort);
        setItems(sorted);
        setTotalPages(pages);
        setTotalElements(total);
      } catch (err) {
        setError('물품을 불러올 수 없습니다.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, [filters]);

  const handleSearch = () => {
    setPage(1);
  };

  const handleCardClick = (itemId) => {
    navigate(`/items/${itemId}`, { state: { from: location.pathname + location.search } });
  };

  const handleReportLost = () => {
    const params = new URLSearchParams();
    if (filters.keyword) params.append('keyword', filters.keyword);
    if (filters.categoryId) params.append('categoryId', filters.categoryId);
    if (filters.startDate) params.append('date', filters.startDate);
    navigate(`/report-lost?${params.toString()}`);
  };

  // 활성 필터 목록
  const activeFilters = [];
  if (filters.keyword) {
    activeFilters.push({ key: 'keyword', label: `검색: ${filters.keyword}` });
  }
  if (filters.categoryId) {
    const category = CATEGORIES.find((c) => c.id === parseInt(filters.categoryId));
    activeFilters.push({ key: 'categoryId', label: `카테고리: ${category?.name || filters.categoryId}` });
  }
  if (filters.startDate) {
    activeFilters.push({ key: 'startDate', label: `발견일: ${filters.startDate} 이후` });
  }
  if (filters.endDate) {
    activeFilters.push({ key: 'endDate', label: `발견일: ${filters.endDate} 이전` });
  }
  if (filters.sort !== 'NEWEST') {
    activeFilters.push({ key: 'sort', label: `정렬: ${getSortLabel(filters.sort)}` });
  }

  return (
    <div className="space-y-6">
      {/* 검색·필터 영역 */}
      <Card className="bg-primary text-white">
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">분실물 조회</h1>

          <div className="space-y-3">
            <Input
              label="검색어"
              name="keyword"
              placeholder="물품명이나 특징 (예: 파란 파우치)"
              value={filters.keyword}
              onChange={(e) => updateFilter('keyword', e.target.value)}
              className="bg-white text-text"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Select
                label="카테고리"
                name="category"
                options={CATEGORIES}
                value={filters.categoryId}
                onChange={(e) => updateFilter('categoryId', e.target.value)}
                placeholder="전체"
                className="bg-white text-text"
              />

              <Select
                label="정렬"
                name="sort"
                options={SORT_OPTIONS}
                value={filters.sort}
                onChange={(e) => updateFilter('sort', e.target.value)}
                className="bg-white text-text"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                label="발견 시작 날짜"
                name="startDate"
                type="date"
                value={filters.startDate}
                onChange={(e) => updateFilter('startDate', e.target.value)}
                className="bg-white text-text"
              />

              <Input
                label="발견 종료 날짜"
                name="endDate"
                type="date"
                value={filters.endDate}
                onChange={(e) => updateFilter('endDate', e.target.value)}
                className="bg-white text-text"
              />
            </div>

            <Button onClick={handleSearch} variant="secondary" className="w-full">
              <Search size={18} className="mr-2" /> 검색
            </Button>
          </div>
        </div>
      </Card>

      {/* 필터 칩 */}
      {activeFilters.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {activeFilters.map((filter) => (
              <FilterChip
                key={filter.key}
                label={filter.label}
                onRemove={() => removeFilter(filter.key)}
              />
            ))}
          </div>
          <Button onClick={clearAllFilters} variant="outline" size="sm">
            전체 초기화
          </Button>
        </div>
      )}

      {/* 결과 개수 */}
      {!loading && !error && (
        <p className="text-sm text-sub">
          조건에 맞는 습득물 <span className="font-bold text-primary">{totalElements}</span>건
        </p>
      )}

      {/* 목록 */}
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} />
      ) : items.length === 0 ? (
        <EmptyState
          message="조건에 맞는 물품이 없습니다."
          actionLabel="분실 신고하기"
          onAction={handleReportLost}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <div
                key={item.itemId}
                onClick={() => handleCardClick(item.itemId)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleCardClick(item.itemId);
                  }
                }}
              >
                <ItemCard item={item} />
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <Pagination currentPage={filters.page} totalPages={totalPages} onPageChange={setPage} />
          )}
        </>
      )}
    </div>
  );
}
