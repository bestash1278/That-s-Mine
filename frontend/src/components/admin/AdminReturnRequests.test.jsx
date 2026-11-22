import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminReturnRequests from './AdminReturnRequests.jsx';

const listMock = vi.fn();
const reviewMock = vi.fn();
vi.mock('../../api/admin.js', () => ({
  getAdminReturnRequests: (...args) => listMock(...args),
  reviewReturnRequest: (...args) => reviewMock(...args),
}));

const pending = {
  requestId: 5,
  itemId: 9,
  itemTitle: '파란색 파우치',
  itemStatus: 'STORED',
  itemStatusLabel: '보관 중',
  itemPrivateFeatures: '안쪽 주머니에 노란 스티커',
  requesterNickname: '시연사용자2',
  requesterEmail: 'user2@demo.local',
  ownershipDescription: '노란 스티커가 안쪽에 붙어 있어요',
  status: 'PENDING',
  statusLabel: '신청 대기',
  createdAt: '2026-11-22T10:00:00',
  allowedNext: ['APPROVED', 'REJECTED'],
};

function renderTab(onNotice = vi.fn()) {
  render(
    <MemoryRouter>
      <AdminReturnRequests onNotice={onNotice} />
    </MemoryRouter>,
  );
  return onNotice;
}

describe('AdminReturnRequests', () => {
  beforeEach(() => {
    listMock.mockReset().mockResolvedValue({ content: [pending], totalElements: 1, totalPages: 1, page: 0, size: 20 });
    reviewMock.mockReset().mockResolvedValue({});
  });

  it('신청자 설명과 습득자 비공개 특징을 나란히 보여주고, 서버가 허용한 처리만 버튼으로 보여준다', async () => {
    renderTab();
    expect(await screen.findByText('노란 스티커가 안쪽에 붙어 있어요')).toBeInTheDocument();
    expect(screen.getByText('안쪽 주머니에 노란 스티커')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '승인' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '반려' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '반환 완료 처리' })).not.toBeInTheDocument();
    expect(screen.getByText(/소유 여부를 자동으로 판정하지 않아요/)).toBeInTheDocument();
  });

  it('반려는 사유가 없으면 보내지 않는다', async () => {
    renderTab();
    fireEvent.click(await screen.findByRole('button', { name: '반려' }));
    fireEvent.click(screen.getByRole('dialog').querySelector('button[type="submit"]'));
    expect(reviewMock).not.toHaveBeenCalled();
    expect(await screen.findByText(/반려 사유를 입력해 주세요/)).toBeInTheDocument();
  });

  it('승인하면 서버에 보내고 안내 후 목록을 다시 불러온다', async () => {
    const onNotice = renderTab();
    fireEvent.click(await screen.findByRole('button', { name: '승인' }));
    fireEvent.change(screen.getByLabelText(/처리 메모/), { target: { value: '소유 확인됨' } });
    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog.querySelector('button[type="submit"]'));
    await waitFor(() => expect(reviewMock).toHaveBeenCalledWith(5, 'APPROVED', '소유 확인됨'));
    await waitFor(() => expect(onNotice).toHaveBeenCalled());
    expect(listMock.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('다른 관리자가 먼저 처리해 서버가 409를 주면 이유를 보여준다', async () => {
    reviewMock.mockRejectedValue({ response: { status: 409, data: { message: '이미 다른 신청이 승인되어 반환이 진행 중입니다.' } } });
    renderTab();
    fireEvent.click(await screen.findByRole('button', { name: '승인' }));
    fireEvent.click(screen.getByRole('dialog').querySelector('button[type="submit"]'));
    expect(await screen.findByRole('alert')).toHaveTextContent('이미 다른 신청이 승인되어 반환이 진행 중입니다.');
  });
});
