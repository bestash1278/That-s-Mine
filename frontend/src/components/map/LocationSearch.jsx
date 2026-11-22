import { useId, useState } from 'react';
import { Building2, Search } from 'lucide-react';

/**
 * 등록된 교내 건물 검색·선택. 서버의 건물 목록(GET /campus-buildings)에서 이름으로 찾는다.
 */
export default function LocationSearch({ buildings, selectedBuildingId, onSelect, label = '건물 검색' }) {
  const inputId = useId();
  const [query, setQuery] = useState('');
  const q = query.trim();
  const results = q ? buildings.filter((b) => b.buildingName.includes(q)) : buildings;

  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="block text-sm font-medium text-text">
        {label}
      </label>
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sub" aria-hidden="true" />
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="예: 학생회관"
          className="min-h-[44px] w-full rounded border border-gray-300 bg-white py-2 pl-9 pr-3 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      {results.length === 0 ? (
        <p className="text-sm text-sub">"{q}"와(과) 일치하는 건물이 없어요. 지도를 직접 눌러 위치를 정해 주세요.</p>
      ) : (
        <ul className="flex flex-wrap gap-2" aria-label="건물 목록">
          {results.map((b) => {
            const selected = String(b.buildingId) === String(selectedBuildingId);
            return (
              <li key={b.buildingId}>
                <button
                  type="button"
                  onClick={() => onSelect(b)}
                  aria-pressed={selected}
                  className={`inline-flex min-h-[40px] items-center gap-1 rounded-full border px-3 text-sm ${
                    selected ? 'border-primary bg-primary text-white' : 'border-gray-300 bg-white text-text hover:border-primary'
                  }`}
                >
                  <Building2 size={14} aria-hidden="true" />
                  {b.buildingName}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
