import { useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import Input from '../common/Input.jsx';
import Select from '../common/Select.jsx';
import Button from '../common/Button.jsx';
import { CATEGORIES } from '../../constants/categories.js';
import { statusLabels } from '../../constants/status.js';

const STATUS_OPTIONS = ['REPORTED', 'STORED', 'RETURN_PENDING', 'RETURNED'].map((value) => ({
  value,
  label: statusLabels[value],
}));

/**
 * 지도 조회 필터: 검색어, 물품 종류, 처리 상태, 발견 날짜.
 * 입력 중에는 검색하지 않고 '검색'을 눌렀을 때 onApply로 한 번에 적용한다.
 */
export default function MapSearchFilter({ filters, onApply, onReset, collapsible = false }) {
  const [draft, setDraft] = useState(filters);
  const [open, setOpen] = useState(!collapsible);
  const [prevFilters, setPrevFilters] = useState(filters);

  // 바깥(URL)에서 조건이 바뀌면 입력값도 맞춘다
  if (prevFilters !== filters) {
    setPrevFilters(filters);
    setDraft(filters);
  }

  const set = (key) => (e) => setDraft((prev) => ({ ...prev, [key]: e.target.value }));
  const activeCount = ['categoryId', 'status', 'startDate', 'endDate'].filter((k) => filters[k]).length;

  const submit = (e) => {
    e.preventDefault();
    onApply(draft);
    if (collapsible) setOpen(false);
  };

  return (
    <form onSubmit={submit} role="search" aria-label="지도에서 습득물 검색" className="space-y-3">
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            label="검색어"
            name="map-keyword"
            placeholder="물품명이나 특징 (예: 파란 파우치)"
            value={draft.keyword}
            onChange={set('keyword')}
          />
        </div>
        <div className="flex items-end">
          <Button type="submit" aria-label="검색" className="min-w-[44px] px-3">
            <Search size={18} aria-hidden="true" />
          </Button>
        </div>
      </div>

      {collapsible && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="map-filter-detail"
          className="flex min-h-[44px] items-center gap-2 text-sm font-medium text-primary"
        >
          <SlidersHorizontal size={16} aria-hidden="true" />
          상세 조건 {activeCount > 0 ? `(${activeCount}개 적용 중)` : ''}
        </button>
      )}

      {open && (
        <div id="map-filter-detail" className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="물품 종류"
              name="map-category"
              options={CATEGORIES}
              placeholder="전체"
              value={draft.categoryId}
              onChange={set('categoryId')}
            />
            <Select
              label="처리 상태"
              name="map-status"
              options={STATUS_OPTIONS}
              placeholder="전체"
              value={draft.status}
              onChange={set('status')}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="발견일 부터" name="map-start" type="date" value={draft.startDate} onChange={set('startDate')} />
            <Input label="발견일 까지" name="map-end" type="date" value={draft.endDate} onChange={set('endDate')} />
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="flex-1">
              조건 적용
            </Button>
            <Button type="button" variant="outline" onClick={onReset}>
              초기화
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
