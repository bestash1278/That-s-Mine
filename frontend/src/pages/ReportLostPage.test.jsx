import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ReportLostPage from './ReportLostPage.jsx';

const createMock = vi.fn();
vi.mock('../api/lostReports.js', () => ({
  createLostReport: (...args) => createMock(...args),
}));
vi.mock('../hooks/useReferenceData.js', () => ({
  useReferenceData: () => ({
    loading: false,
    error: null,
    categories: [{ categoryId: 4, categoryName: '의류·잡화' }],
    buildings: [{ buildingId: 1, buildingName: '도서관', latitude: 37.4979, longitude: 126.9566 }],
    storageLocations: [],
  }),
}));

function renderPage(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/report-lost" element={<ReportLostPage />} />
        <Route path="/report-lost/complete/:id" element={<p>완료 화면</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ReportLostPage', () => {
  beforeEach(() => createMock.mockReset());

  it('조회 결과 없음에서 넘어온 검색 조건을 미리 채운다', () => {
    renderPage('/report-lost?keyword=파우치&categoryId=4&startDate=2026-01-02&endDate=2026-01-05');
    expect(screen.getByText(/검색 조건을 미리 채웠어요/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^물품명/)).toHaveValue('파우치');
    expect(screen.getByLabelText(/의류·잡화/)).toBeChecked();
    expect(screen.getByLabelText(/기간 시작/)).toHaveValue('2026-01-02');
    expect(screen.getByLabelText(/기간 끝/)).toHaveValue('2026-01-05');
  });

  it('대표 위치가 없으면 보내지 않고 오류를 보여준다', () => {
    renderPage('/report-lost?keyword=파우치&categoryId=4&startDate=2026-01-02');
    fireEvent.click(screen.getByRole('button', { name: '분실 신고 접수' }));
    expect(createMock).not.toHaveBeenCalled();
    expect(screen.getAllByText(/대표 장소를 하나 골라 주세요/).length).toBeGreaterThan(0);
  });

  it('입력이 맞으면 접수하고 완료 화면으로 간다', async () => {
    createMock.mockResolvedValue({ reportId: 12, receiptNo: 'LR-000012' });
    renderPage('/report-lost?keyword=파우치&categoryId=4&startDate=2026-01-02');
    fireEvent.change(screen.getByLabelText(/^대표 추정 위치/), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: '분실 신고 접수' }));
    await waitFor(() => expect(screen.getByText('완료 화면')).toBeInTheDocument());
    const [request] = createMock.mock.calls[0];
    expect(request).toMatchObject({ title: '파우치', categoryId: 4, lostBuildingId: 1, lostDate: '2026-01-02', lostEndDate: null });
  });
});
