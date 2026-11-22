import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ReportFoundPage from './ReportFoundPage.jsx';
import { ReportFoundDraftProvider } from '../contexts/ReportFoundDraftContext.jsx';

vi.mock('../api/reference.js', () => ({
  getCategories: vi.fn(async () => [
    { categoryId: 1, categoryName: '전자기기' },
    { categoryId: 4, categoryName: '의류·잡화' },
  ]),
  getCampusBuildings: vi.fn(async () => [{ buildingId: 2, buildingName: '학생회관' }]),
  getStorageLocations: vi.fn(async () => [
    { storageId: 3, storageName: '학생회관 관리실', buildingName: '학생회관', detailLocation: '1층' },
  ]),
}));

function renderPage() {
  return render(
    <ReportFoundDraftProvider>
      <MemoryRouter initialEntries={['/report-found']}>
        <Routes>
          <Route path="/report-found" element={<ReportFoundPage />} />
          <Route path="/report-found/preview" element={<p>미리보기 화면</p>} />
        </Routes>
      </MemoryRouter>
    </ReportFoundDraftProvider>,
  );
}

describe('ReportFoundPage', () => {
  it('빈 상태로 확인을 누르면 오류 요약을 보여주고 이동하지 않는다', async () => {
    renderPage();
    await screen.findByRole('option', { name: '학생회관' });

    fireEvent.click(screen.getByRole('button', { name: '신고 내용 확인' }));

    expect(screen.getByRole('alert')).toHaveTextContent('4개 항목을 확인해 주세요.');
    expect(screen.queryByText('미리보기 화면')).not.toBeInTheDocument();
  });

  it('과업 B 내용을 입력하면 미리보기로 이동한다', async () => {
    renderPage();
    await screen.findByRole('option', { name: '학생회관' });

    fireEvent.click(screen.getByLabelText('의류·잡화'));
    fireEvent.change(screen.getByLabelText(/물품명/), { target: { value: '검은색 우산' } });
    fireEvent.change(screen.getByLabelText(/발견한 건물/), { target: { value: '2' } });
    fireEvent.click(screen.getByLabelText(/^관리 부서에 전달 예정/));
    fireEvent.click(screen.getByRole('button', { name: '신고 내용 확인' }));

    expect(await screen.findByText('미리보기 화면')).toBeInTheDocument();
  });

  it('관리 부서에 전달 완료를 고르면 보관 장소 선택이 나타난다', async () => {
    renderPage();
    await screen.findByRole('option', { name: '학생회관' });

    expect(screen.queryByLabelText(/맡긴 보관 장소/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/^관리 부서에 전달 완료/));
    expect(screen.getByLabelText(/맡긴 보관 장소/)).toBeInTheDocument();
  });
});
