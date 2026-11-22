import client from './client.js';

/** 마이페이지 목록 (PageResponse: { content, totalElements, totalPages, page, size }) */
export async function getMyFoundItems(page = 0, size = 20) {
  const response = await client.get('/users/me/found-items', { params: { page, size } });
  return response.data?.data;
}

/** 수정 화면용 내 습득물 상세(비공개 특징 포함) */
export async function getMyFoundItem(id) {
  const response = await client.get(`/users/me/found-items/${id}`);
  return response.data?.data;
}

export async function getMyLostReports(page = 0, size = 20) {
  const response = await client.get('/users/me/lost-reports', { params: { page, size } });
  return response.data?.data;
}

export async function getMyReturnRequests(page = 0, size = 20) {
  const response = await client.get('/users/me/return-requests', { params: { page, size } });
  return response.data?.data;
}
