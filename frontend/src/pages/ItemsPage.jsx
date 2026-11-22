import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { List, Map as MapIcon, Search } from 'lucide-react';
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
import { SORT_OPTIONS, getSortLabel } from '../constants/sortOptions.js';
import { statusLabels } from '../constants/status.js';
import { buildQueryString } from '../utils/queryParser.js';

const STATUS_OPTIONS = ['REPORTED', 'STORED', 'RETURN_PENDING', 'RETURNED'].map((value) => ({
  value,
  label: statusLabels[value],
}));

export default function ItemsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { filters, updateFilter, removeFilter, clearAllFilters, setPage } = useItemSearch();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  // 검색어는 입력 중에 바로 검색하지 않고 '검색'을 누를 때 적용한다
  const [keywordInput, setKeywordInput] = useState(filters.keyword);
  const [prevKeyword, setPrevKeyword] = useState(filters.keyword);
  if (prevKeyword !== filters.keyword) {
    setPrevKeyword(filters.keyword);
    setKeywordInput(filters.keyword);
  }

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
            status: filters.status || undefined,
            startDate: filters.startDate || undefined,
            endDate: filters.endDate || undefined,
            sort: filters.sort || 'NEWEST',
            page: filters.page - 1,
            size: 20,
          },
        });

        const { content = [], totalElements: total = 0, totalPages: pages = 0 } = response.data?.data || {};

        // 정렬은 서버가 한다(페이지 단위로 섞이지 않게)
        setItems(content);
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

  const handleSearch = (e) => {
    e?.preventDefault();
    updateFilter('keyword', keywordInput.trim());
  };

  // 상세에서 "목록으로"를 누르면 지금 조건으로 돌아오게 한다
  const linkState = { from: location.pathname + location.search };
  const mapQuery = buildQueryString(filters, { includeListOnly: false });

  const handleReportLost = () => {
    const params = new URLSearchParams();
    if (filters.keyword) params.append('keyword', filters.keyword);
    if (filters.categoryId) params.append('categoryId', filters.categoryId);
    // 분실 신고 폼이 기간(시작~끝)으로 채울 수 있게 둘 다 넘긴다
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
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
  if (filters.status) {
    activeFilters.push({ key: 'status', label: `상태: ${statusLabels[filters.status] || filters.status}` });
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
      <Card>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-bold text-text">분실물 조회</h1>
            {/* 조회 방식 전환: 조건은 그대로 유지 */}
            <nav aria-label="조회 방식" className="inline-flex overflow-hidden rounded border border-primary">
              <span
                aria-current="page"
                className="inline-flex min-h-[44px] items-center gap-1 bg-primary px-3 text-sm font-medium text-white"
              >
                <List size={16} aria-hidden="true" /> 목록 보기
              </span>
              <Link
                to={mapQuery ? `/map?${mapQuery}` : '/map'}
                className="inline-flex min-h-[44px] items-center gap-1 px-3 text-sm font-medium text-primary hover:bg-blue-50"
              >
                <MapIcon size={16} aria-hidden="true" /> 지도 보기
              </Link>
            </nav>
          </div>

          <form onSubmit={handleSearch} role="search" className="space-y-3">
            <Input
              label="검색어"
              name="keyword"
              placeholder="물품명이나 특징 (예: 파란 파우치)"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
             
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Select
                label="카테고리"
                name="category"
                options={CATEGORIES}
                value={filters.categoryId}
                onChange={(e) => updateFilter('categoryId', e.target.value)}
                placeholder="전체"
               
              />

              <Select
                label="처리 상태"
                name="status"
                options={STATUS_OPTIONS}
                value={filters.status}
                onChange={(e) => updateFilter('status', e.target.value)}
                placeholder="전체"
               
              />

              <Select
                label="정렬"
                name="sort"
                options={SORT_OPTIONS}
                value={filters.sort}
                onChange={(e) => updateFilter('sort', e.target.value)}
               
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                label="발견 시작 날짜"
                name="startDate"
                type="date"
                value={filters.startDate}
                onChange={(e) => updateFilter('startDate', e.target.value)}
               
              />

              <Input
                label="발견 종료 날짜"
                name="endDate"
                type="date"
                value={filters.endDate}
                onChange={(e) => updateFilter('endDate', e.target.value)}
               
              />
            </div>

            <Button type="submit" className="w-full">
              <Search size={18} className="mr-2" aria-hidden="true" /> 검색
            </Button>
          </form>
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
              <ItemCard key={item.itemId} item={item} linkState={linkState} />
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
