import client from './client.js';

/**
 * 습득물 신고 (POST /found-items, multipart/form-data)
 * @param {object} request CreateFoundItemRequest 형태의 객체
 * @param {File[]} images 대표 사진이 첫 번째가 아니어도 된다(request.representativeImageIndex로 지정)
 * @returns {Promise<object>} 등록된 습득물(PublicFoundItemDTO)
 */
export async function createFoundItem(request, images = []) {
  const formData = new FormData();
  formData.append('request', new Blob([JSON.stringify(request)], { type: 'application/json' }));
  images.forEach((file) => formData.append('images', file));
  const response = await client.post('/found-items', formData);
  return response.data?.data;
}

export async function getFoundItem(id) {
  const response = await client.get(`/found-items/${id}`);
  return response.data?.data;
}

/** 신고자 본인의 습득물 수정 (PATCH, multipart). request.keepImageUrls로 남길 기존 사진 지정 */
export async function updateFoundItem(id, request, images = []) {
  const formData = new FormData();
  formData.append('request', new Blob([JSON.stringify(request)], { type: 'application/json' }));
  images.forEach((file) => formData.append('images', file));
  const response = await client.patch(`/found-items/${id}`, formData);
  return response.data?.data;
}

/** 신고자 본인의 습득물 삭제 (Soft Delete) */
export async function deleteFoundItem(id) {
  await client.delete(`/found-items/${id}`);
}

/** 습득물 목록 검색 (PageResponse) */
export async function searchFoundItems(params) {
  const response = await client.get('/found-items', { params });
  return response.data?.data;
}
