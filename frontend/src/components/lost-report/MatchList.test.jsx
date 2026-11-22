import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MatchList from './MatchList.jsx';

// vi.fn은 거부된 Promise를 따로 추적해 테스트 오류로 보고하므로, 일반 함수로 바꿔 끼운다
let impl = () => Promise.resolve([]);
vi.mock('../../api/lostReports.js', () => ({
  getLostReportMatches: (...args) => impl(...args),
}));

const match = (itemId, title, level, levelLabel, reasons) => ({
  item: {
    itemId,
    title,
    categoryName: '의류·잡화',
    foundDate: '2026-11-20',
    foundLocation: '도서관',
    foundBuildingName: '도서관',
    status: 'STORED',
    statusLabel: '보관 중',
    storageStatusLabel: '학생지원팀',
  },
  score: 80,
  level,
  levelLabel,
  reasons,
});

function renderList(props = {}) {
  return render(
    <MemoryRouter>
      <MatchList reportId={3} searchQuery="categoryId=4" {...props} />
    </MemoryRouter>,
  );
}

describe('MatchList', () => {
  beforeEach(() => {
    impl = () => Promise.resolve([]);
  });

  it('후보 카드와 등급·이유를 보여주고 소유 확정이 아니라고 안내한다', async () => {
    impl = () => Promise.resolve([
      match(1, '파란색 파우치', 'HIGH', '가능성 높음', ['같은 종류예요 (의류·잡화)', '분실 기간 안에 발견됐어요']),
      match(2, '남색 파우치', 'LOW', '참고', ['물품명·특징이 일부 겹쳐요']),
    ]);
    renderList();
    expect(await screen.findByText('파란색 파우치')).toBeInTheDocument();
    expect(screen.getByText('가능성 높음')).toBeInTheDocument();
    expect(screen.getByText('참고')).toBeInTheDocument();
    expect(screen.getByText('분실 기간 안에 발견됐어요')).toBeInTheDocument();
    expect(screen.getByText(/내 물건이라는 뜻은 아니니/)).toBeInTheDocument();
    expect(screen.getByText(/실제 수령 시 담당자가 소유 여부를 확인합니다/)).toBeInTheDocument();
    // 점수 숫자는 정밀한 값처럼 보이지 않게 숨긴다
    expect(screen.queryByText(/80/)).not.toBeInTheDocument();
  });

  it('후보가 없으면 막다른 길이 아니라 직접 찾아보기로 이어 준다', async () => {
    impl = () => Promise.resolve([]);
    renderList();
    expect(await screen.findByText(/아직 비슷한 습득물이 없어요/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /직접 찾아보기/ })).toHaveAttribute('href', '/items?categoryId=4');
  });

  it('불러오지 못하면 오류와 다시 시도를 보여준다', async () => {
    impl = () => Promise.reject({ response: { status: 500, data: { message: '서버 오류' } } });
    renderList();
    expect(await screen.findByText('서버 오류')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /다시/ })).toBeInTheDocument();
  });
});
