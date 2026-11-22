import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import AdminLostReports from './AdminLostReports.jsx';

const listMock = vi.fn();
const changeMock = vi.fn();
vi.mock('../../api/admin.js', () => ({
  getAdminLostReports: (...args) => listMock(...args),
  changeLostReportStatus: (...args) => changeMock(...args),
}));

const report = {
  reportId: 4,
  receiptNo: 'LR-000004',
  title: '남색 카드지갑',
  categoryName: '지갑·카드',
  lostDate: '2026-11-20',
  lostLocation: '도서관',
  status: 'SEARCHING',
  statusLabel: '찾는 중',
  createdAt: '2026-11-21T10:00:00',
};

function renderTab(onNotice = vi.fn()) {
  render(
    <MemoryRouter>
      <AdminLostReports onNotice={onNotice} />
    </MemoryRouter>,
  );
  return onNotice;
}

describe('AdminLostReports', () => {
  beforeEach(() => {
    listMock.mockReset().mockResolvedValue({ content: [report], totalElements: 1, totalPages: 1, page: 0, size: 20 });
    changeMock.mockReset().mockResolvedValue({});
  });

  it('현재 상태가 아닌 두 상태로만 바꿀 수 있고 신고자 정보는 보이지 않는다', async () => {
    renderTab();
    expect(await screen.findByText('남색 카드지갑')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '찾기 완료(으)로 변경' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '신고 종료(으)로 변경' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '찾는 중(으)로 변경' })).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/@demo\.local/);
  });

  it('확인 대화상자를 거쳐 상태를 바꾸고 안내 후 목록을 다시 불러온다', async () => {
    const onNotice = renderTab();
    fireEvent.click(await screen.findByRole('button', { name: '신고 종료(으)로 변경' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('신고 내용은 바뀌지 않고');
    expect(changeMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '상태 변경' }));
    await waitFor(() => expect(changeMock).toHaveBeenCalledWith(4, 'CLOSED'));
    await waitFor(() => expect(onNotice).toHaveBeenCalled());
    expect(listMock.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('서버가 409를 주면 이유를 보여준다', async () => {
    changeMock.mockImplementation(() => Promise.reject({ response: { status: 409, data: { message: "이미 '신고 종료' 상태입니다." } } }));
    renderTab();
    fireEvent.click(await screen.findByRole('button', { name: '찾기 완료(으)로 변경' }));
    fireEvent.click(screen.getByRole('button', { name: '상태 변경' }));
    expect(await screen.findByRole('alert')).toHaveTextContent("이미 '신고 종료' 상태입니다.");
  });
});
