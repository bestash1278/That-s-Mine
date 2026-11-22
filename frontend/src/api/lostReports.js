import client from './client.js';

/** request(JSON)와 사진을 multipart로 묶는다 (등록·수정 공통) */
function toFormData(request, images = []) {
  const formData = new FormData();
  formData.append('request', new Blob([JSON.stringify(request)], { type: 'application/json' }));
  images.forEach((file) => formData.append('images', file));
  return formData;
}

/** 분실 신고 등록 (POST /lost-reports) → LostReportDTO */
export async function createLostReport(request, images = []) {
  const response = await client.post('/lost-reports', toFormData(request, images));
  return response.data?.data;
}

/** 분실 신고 상세 (비회원 가능. 본인이면 mine·contentEditable·lockReason 포함) */
export async function getLostReport(id) {
  const response = await client.get(`/lost-reports/${id}`);
  return response.data?.data;
}

/** 내용 수정 (본인, '찾는 중'일 때만). request.keepImageUrls로 남길 기존 사진 지정 */
export async function updateLostReport(id, request, images = []) {
  const response = await client.patch(`/lost-reports/${id}`, toFormData(request, images));
  return response.data?.data;
}

/** 상태 변경: SEARCHING | FOUND | CLOSED */
export async function changeLostReportStatus(id, status) {
  const response = await client.patch(`/lost-reports/${id}/status`, { status });
  return response.data?.data;
}

export async function deleteLostReport(id) {
  await client.delete(`/lost-reports/${id}`);
}

/** 지도 영역의 '찾는 중' 분실 신고 */
export async function getLostReportsInBounds(params) {
  const response = await client.get('/lost-reports/map', { params });
  return response.data?.data || [];
}

/** 유사 습득물 추천 (로그인한 신고자 본인만). [{ item, score, level, levelLabel, reasons }] */
export async function getLostReportMatches(id) {
  const response = await client.get(`/lost-reports/${id}/matches`);
  return response.data?.data || [];
}
