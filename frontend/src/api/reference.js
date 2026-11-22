import client from './client.js';

export async function getCategories() {
  const response = await client.get('/categories');
  return response.data?.data || [];
}

export async function getCampusBuildings() {
  const response = await client.get('/campus-buildings');
  return response.data?.data || [];
}

/** 활성화된 공식 보관 장소. buildingId를 주면 그 건물만. */
export async function getStorageLocations(buildingId) {
  const response = await client.get('/storage-locations', {
    params: buildingId ? { buildingId } : undefined,
  });
  return response.data?.data || [];
}
