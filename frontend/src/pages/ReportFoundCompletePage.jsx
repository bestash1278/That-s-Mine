import { useEffect, useRef } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import Card from '../components/common/Card.jsx';
import { formatFoundItemNumber } from '../utils/reportFoundForm.js';

export default function ReportFoundCompletePage() {
  const { id } = useParams();
  const location = useLocation();
  const item = location.state?.item;
  const headingRef = useRef(null);

  // 화면이 바뀌었음을 스크린리더 사용자에게도 알린다
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-6">
      <div className="space-y-3 text-center" role="status">
        <CheckCircle size={56} className="mx-auto text-success" aria-hidden="true" />
        <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold text-text focus:outline-none">
          습득물 신고가 등록되었습니다
        </h1>
        <p className="text-sub">물건을 주인에게 돌려주는 데 도움을 주셔서 감사합니다.</p>
      </div>

      <Card className="space-y-1 border-l-4 border-primary bg-blue-50 text-center">
        <p className="text-sm text-primary">등록 번호</p>
        <p className="text-3xl font-bold tracking-wide text-primary">{formatFoundItemNumber(id)}</p>
        {item?.title && <p className="text-text">{item.title}</p>}
      </Card>

      <Card className="space-y-3">
        <h2 className="font-bold text-text">다음 안내</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-text">
          <li>등록한 물품은 지금부터 분실물 조회에 나타나요.</li>
          <li>마이페이지의 &lsquo;내가 등록한 습득물&rsquo;에서 내용을 고치거나 삭제할 수 있어요.</li>
          <li>관리 부서에 물건을 맡기면 보관 장소를 바꿔 주세요. 주인이 찾으러 갈 곳이 정확해져요.</li>
        </ul>
      </Card>

      <div className="flex flex-col gap-3">
        <Link
          to={`/items/${id}`}
          className="inline-flex min-h-[44px] items-center justify-center rounded bg-primary px-4 font-medium text-white hover:bg-blue-900"
        >
          등록한 물품 보기
        </Link>
        <Link
          to="/report-found"
          className="inline-flex min-h-[44px] items-center justify-center rounded border-2 border-primary px-4 font-medium text-primary hover:bg-blue-50"
        >
          다른 물건 신고하기
        </Link>
        <Link
          to="/"
          className="inline-flex min-h-[44px] items-center justify-center rounded px-4 font-medium text-primary hover:underline"
        >
          홈으로
        </Link>
      </div>
    </div>
  );
}
