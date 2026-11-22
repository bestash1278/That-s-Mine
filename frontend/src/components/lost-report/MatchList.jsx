import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Info } from 'lucide-react';
import ItemCard from '../common/ItemCard.jsx';
import LoadingState from '../common/LoadingState.jsx';
import ErrorState from '../common/ErrorState.jsx';
import { getLostReportMatches } from '../../api/lostReports.js';
import { toUserError } from '../../api/client.js';

const LEVEL_STYLES = {
  HIGH: 'bg-green-100 text-green-900',
  MEDIUM: 'bg-blue-100 text-blue-900',
  LOW: 'bg-gray-200 text-gray-800',
};

/**
 * 유사 습득물 추천 (SPEC §17). 규칙 점수로 고른 "비슷한 물품 후보"이지 소유 여부의 판정이 아니다.
 * 등급은 색과 글자를 함께 쓰고, 왜 추천했는지 이유를 보여준다. 점수 숫자는 정밀한 값처럼 보이지 않게 숨긴다.
 *
 * @param searchQuery 결과가 부족할 때 분실물 조회로 이어 줄 검색 조건(쿼리 문자열)
 */
export default function MatchList({ reportId, searchQuery }) {
  const [state, setState] = useState({ loading: true, error: null, matches: [] });

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      setState({ loading: false, error: null, matches: await getLostReportMatches(reportId) });
    } catch (err) {
      setState({ loading: false, error: toUserError(err, '유사한 습득물을 불러오지 못했습니다.').message, matches: [] });
    }
  }, [reportId]);

  useEffect(() => {
    load();
  }, [load]);

  const browse = searchQuery ? (
    <Link to={`/items?${searchQuery}`} className="inline-flex min-h-[44px] items-center font-medium text-primary underline">
      분실물 조회에서 직접 찾아보기
    </Link>
  ) : null;

  return (
    <div className="space-y-3">
      <p className="flex gap-2 rounded bg-amber-50 p-3 text-sm text-amber-900">
        <Info size={16} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
        <span>
          종류·이름·위치·날짜가 비슷한 습득물 후보예요. 내 물건이라는 뜻은 아니니 사진과 특징을 꼭 확인해 주세요. 실제 수령 시 담당자가 소유 여부를 확인합니다.
        </span>
      </p>

      {state.loading ? (
        <LoadingState />
      ) : state.error ? (
        <ErrorState message={state.error} onRetry={load} />
      ) : state.matches.length === 0 ? (
        <div className="space-y-2 rounded-lg border border-dashed border-gray-300 bg-white p-4 text-center">
          <p className="text-sub">아직 비슷한 습득물이 없어요. 새 습득물이 등록되면 이 화면에서 다시 확인할 수 있어요.</p>
          {browse}
        </div>
      ) : (
        <>
          <ul className="grid gap-4 sm:grid-cols-2" aria-label="유사 습득물 추천">
            {state.matches.map((match) => (
              <li key={match.item.itemId} className="space-y-2">
                <ItemCard item={match.item} />
                <div className="space-y-1 rounded-lg bg-white p-3 shadow">
                  <span className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${LEVEL_STYLES[match.level] || LEVEL_STYLES.LOW}`}>
                    {match.levelLabel}
                  </span>
                  <ul className="list-disc space-y-0.5 pl-5 text-sm text-text">
                    {match.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ul>
          {browse}
        </>
      )}
    </div>
  );
}
