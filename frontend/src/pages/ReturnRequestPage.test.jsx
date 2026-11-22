import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ReturnRequestPage from './ReturnRequestPage.jsx';

const getMock = vi.fn();
const eligibilityMock = vi.fn();
const createMock = vi.fn();
vi.mock('../api/client.js', async () => {
  const actual = await vi.importActual('../api/client.js');
  return { ...actual, default: { get: (...args) => getMock(...args) } };
});
vi.mock('../api/returnRequests.js', () => ({
  getReturnEligibility: (...args) => eligibilityMock(...args),
  createReturnRequest: (...args) => createMock(...args),
}));

const item = {
  itemId: 7,
  title: '파란색 파우치',
  status: 'STORED',
  statusLabel: '보관 중',
  foundLocation: '도서관',
  foundDate: '2026-11-20',
  storageName: '학생지원팀',
  storageInfo: {
    buildingName: '행정관',
    storageName: '학생지원팀',
    operatingHours: '평일 09:00~17:00',
    contactPhone: '02-000-0000',
    pickupGuide: '학생증 지참',
  },
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/return-request/7']}>
      <Routes>
        <Route path="/return-request/:id" element={<ReturnRequestPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ReturnRequestPage', () => {
  beforeEach(() => {
    getMock.mockReset().mockResolvedValue({ data: { data: item } });
    eligibilityMock.mockReset().mockResolvedValue({ canRequest: true });
    createMock.mockReset();
  });

  it('발견한 곳과 지금 보관 중인 곳을 따로 보여주고, 소유 확인은 담당자가 한다고 안내한다', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: '반환 신청' })).toBeInTheDocument();
    expect(screen.getByText(/발견한 곳/)).toBeInTheDocument();
    expect(screen.getByText(/지금 보관 중인 곳/)).toBeInTheDocument();
    expect(screen.getByText(/실제 수령 시 담당자가 소유 여부를 확인합니다/)).toBeInTheDocument();
  });

  it('소유 확인 특징 없이 제출하면 보내지 않고 오류를 보여준다', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: '반환 신청하기' }));
    expect(createMock).not.toHaveBeenCalled();
    expect(await screen.findByText(/근거\(물건의 특징\)를 입력해 주세요/)).toBeInTheDocument();
  });

  it('신청하면 접수 화면과 찾아가는 방법을 보여준다', async () => {
    createMock.mockResolvedValue({ requestId: 3, status: 'PENDING', statusLabel: '신청 대기', createdAt: '2026-11-22T10:00:00' });
    renderPage();
    fireEvent.change(await screen.findByLabelText(/내 물건이라고 판단한 근거/), { target: { value: '안쪽 주머니에 노란 스티커' } });
    fireEvent.click(screen.getByRole('button', { name: '반환 신청하기' }));
    expect(await screen.findByRole('heading', { name: '반환 신청이 접수되었어요' })).toBeInTheDocument();
    expect(createMock).toHaveBeenCalledWith('7', { ownershipDescription: '안쪽 주머니에 노란 스티커', additionalNote: undefined });
    expect(screen.getByText(/학생증 지참/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /마이페이지에서 진행 상황 보기/ })).toHaveAttribute('href', '/mypage?tab=returns');
  });

  it('제출 중에는 버튼이 비활성화되어 중복 제출을 막는다', async () => {
    let resolve;
    createMock.mockReturnValue(new Promise((r) => { resolve = r; }));
    renderPage();
    fireEvent.change(await screen.findByLabelText(/내 물건이라고 판단한 근거/), { target: { value: '안쪽 주머니에 노란 스티커' } });
    fireEvent.click(screen.getByRole('button', { name: '반환 신청하기' }));
    const busy = await screen.findByRole('button', { name: '접수하는 중…' });
    expect(busy).toBeDisabled();
    fireEvent.click(busy);
    expect(createMock).toHaveBeenCalledTimes(1);
    resolve({ requestId: 1, status: 'PENDING', statusLabel: '신청 대기', createdAt: '2026-11-22T10:00:00' });
    await waitFor(() => expect(screen.getByRole('heading', { name: '반환 신청이 접수되었어요' })).toBeInTheDocument());
  });

  it('서버가 신청을 막으면 이유를 보여주고 폼을 숨긴다', async () => {
    eligibilityMock.mockResolvedValue({ canRequest: false, blockReason: '다른 신청자에게 반환 절차가 진행 중인 물품입니다.' });
    renderPage();
    expect(await screen.findByText(/반환 절차가 진행 중인 물품/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '반환 신청하기' })).not.toBeInTheDocument();
  });

  it('서버 필드 오류(fieldErrors)를 해당 입력 아래에 보여준다', async () => {
    createMock.mockRejectedValue({
      response: { status: 400, data: { message: '1개 항목을 확인해 주세요.', fieldErrors: { ownershipDescription: '서버가 거절한 이유' } } },
    });
    renderPage();
    fireEvent.change(await screen.findByLabelText(/내 물건이라고 판단한 근거/), { target: { value: '안쪽 주머니에 노란 스티커' } });
    fireEvent.click(screen.getByRole('button', { name: '반환 신청하기' }));
    expect(await screen.findByText('서버가 거절한 이유')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('입력한 내용을 확인해 주세요.');
  });
});
