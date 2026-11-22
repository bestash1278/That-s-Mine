import client from './client.js';

// 관리자 API (/api/v1/admin/**). 권한은 서버가 판단하고, 화면은 안내만 한다.
const clean = (params) => Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null));

export async function getAdminFoundItems({ keyword, status, page = 0, size = 20 }) {
  const response = await client.get('/admin/found-items', { params: clean({ keyword, status, page, size }) });
  return response.data?.data;
}

export async function changeFoundItemStatus(itemId, status) {
  const response = await client.patch(`/admin/found-items/${itemId}/status`, { status });
  return response.data?.data;
}

/** body: { custodyType, storageId, storageLocation, storageLocationDetail, storageLatitude, storageLongitude } */
export async function updateFoundItemStorage(itemId, body) {
  const response = await client.patch(`/admin/found-items/${itemId}/storage`, body);
  return response.data?.data;
}

/** body: { foundBuildingId, foundLocation, foundLocationDetail, foundLatitude, foundLongitude } */
export async function updateFoundItemLocation(itemId, body) {
  const response = await client.patch(`/admin/found-items/${itemId}/found-location`, body);
  return response.data?.data;
}

export async function getAdminLostReports({ keyword, status, page = 0, size = 20 }) {
  const response = await client.get('/admin/lost-reports', { params: clean({ keyword, status, page, size }) });
  return response.data?.data;
}

export async function getAdminReturnRequests({ status, page = 0, size = 20 }) {
  const response = await client.get('/admin/return-requests', { params: clean({ status, page, size }) });
  return response.data?.data;
}

/** status: APPROVED | REJECTED | COMPLETED. 반려는 comment(사유) 필수 */
export async function reviewReturnRequest(requestId, status, comment) {
  const response = await client.patch(`/admin/return-requests/${requestId}/status`, { status, comment });
  return response.data?.data;
}

export async function createBuilding(body) {
  const response = await client.post('/admin/campus-buildings', body);
  return response.data?.data;
}

export async function updateBuilding(id, body) {
  const response = await client.patch(`/admin/campus-buildings/${id}`, body);
  return response.data?.data;
}

export async function getAdminStorageLocations() {
  const response = await client.get('/admin/storage-locations');
  return response.data?.data || [];
}

export async function createStorageLocation(body) {
  const response = await client.post('/admin/storage-locations', body);
  return response.data?.data;
}

export async function updateStorageLocation(id, body) {
  const response = await client.patch(`/admin/storage-locations/${id}`, body);
  return response.data?.data;
}
