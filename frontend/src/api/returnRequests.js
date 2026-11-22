import client from './client.js';

/** 이 물품에 지금 신청할 수 있는지, 못 하면 이유, 내 최근 신청 (로그인 필요) */
export async function getReturnEligibility(itemId) {
  const response = await client.get(`/found-items/${itemId}/return-requests/me`);
  return response.data?.data;
}

/** 반환 신청. body: { ownershipDescription, additionalNote } */
export async function createReturnRequest(itemId, body) {
  const response = await client.post(`/found-items/${itemId}/return-requests`, body);
  return response.data?.data;
}

/** 신청 취소(신청 대기 상태일 때만) */
export async function cancelReturnRequest(requestId) {
  const response = await client.patch(`/return-requests/${requestId}/cancel`);
  return response.data?.data;
}
