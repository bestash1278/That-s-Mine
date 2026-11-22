import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import MapLocationPicker from './MapLocationPicker.jsx';

// 지도 키가 없는 상황
vi.mock('../../hooks/useKakaoLoader.js', () => ({
  useKakaoLoader: () => ({ status: 'no-key', kakao: null, retry: () => {} }),
}));

const buildings = [
  { buildingId: 1, buildingName: '도서관', latitude: 37.4979, longitude: 126.9566 },
  { buildingId: 2, buildingName: '학생회관', latitude: 37.4984, longitude: 126.9578 },
];

describe('MapLocationPicker (지도 키 없음)', () => {
  it('"시연용 위치 선택"임을 밝히고, 건물만 돌려주며 좌표는 만들지 않는다', () => {
    const onConfirm = vi.fn();
    render(<MapLocationPicker open buildings={buildings} onConfirm={onConfirm} onCancel={() => {}} />);

    expect(screen.getByRole('heading', { name: '시연용 위치 선택' })).toBeInTheDocument();
    expect(screen.getByText('실제 지도가 아닌 시연용 선택 화면이에요.')).toBeInTheDocument();

    const confirm = screen.getByRole('button', { name: '이 건물로 선택' });
    expect(confirm).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: '학생회관' }));
    fireEvent.click(confirm);

    expect(onConfirm).toHaveBeenCalledWith({ lat: null, lng: null, buildingId: 2, buildingName: '학생회관' });
  });

  it('건물 이름으로 검색한다', () => {
    render(<MapLocationPicker open buildings={buildings} onConfirm={() => {}} onCancel={() => {}} />);
    fireEvent.change(screen.getByLabelText('교내 건물로 찾기'), { target: { value: '도서' } });
    expect(screen.getByRole('button', { name: '도서관' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '학생회관' })).not.toBeInTheDocument();
  });

  it('Esc로 닫는다', () => {
    const onCancel = vi.fn();
    render(<MapLocationPicker open buildings={buildings} onConfirm={() => {}} onCancel={onCancel} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalled();
  });
});
