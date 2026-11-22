import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { MapPin, Archive, AlertCircle, Phone, Clock, FileText, ArrowLeft } from 'lucide-react';
import Button from '../components/common/Button.jsx';
import Card from '../components/common/Card.jsx';
import LocationCard from '../components/common/LocationCard.jsx';
import ItemLocationMap from '../components/map/ItemLocationMap.jsx';
import StatusBadge from '../components/common/StatusBadge.jsx';
import LoadingState from '../components/common/LoadingState.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import client from '../api/client.js';
import { FoundItemStatus } from '../constants/status.js';

export default function ItemDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchItem = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await client.get(`/found-items/${id}`);
        setItem(response.data?.data);
      } catch (err) {
        setError('물품 정보를 불러올 수 없습니다.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchItem();
  }, [id]);

  const handleBack = () => {
    const { state } = location;
    navigate(state?.from || '/items');
  };

  const handleReturn = () => {
    navigate(`/return-request/${id}`);
  };

  if (loading) {
    return <LoadingState />;
  }

  if (error || !item) {
    return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  }

  const {
    title,
    description,
    categoryName,
    foundDate,
    foundTime,
    foundLocation,
    foundLocationDetail,
    foundBuildingName,
    status,
    statusLabel,
    imageUrls = [],
    storageInfo,
    custodyType,
  } = item;

  const isSameBuilding = foundBuildingName && storageInfo?.buildingName === foundBuildingName;
  const isReturned = status === FoundItemStatus.RETURNED;
  const isTemporary = custodyType === 'TEMPORARY';

  return (
    <div className="space-y-6 pb-24 lg:pb-6">
      {/* 상단 정보 */}
      <div className="space-y-4">
        {/* 사진 갤러리 */}
        {imageUrls && imageUrls.length > 0 && (
          <div className="w-full h-64 bg-gray-200 rounded-lg overflow-hidden">
            <img
              src={imageUrls[0]}
              alt={title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* 물품명, 상태, 카테고리 */}
        <Card className="space-y-3">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-text">{title}</h1>
            <p className="text-sm text-sub">{categoryName}</p>
          </div>

          <div className="flex items-center gap-3">
            <StatusBadge status={status} label={statusLabel} />
          </div>
        </Card>

        {/* 공개 특징 */}
        {description && (
          <Card>
            <p className="text-text whitespace-pre-line">{description}</p>
          </Card>
        )}
      </div>

      {/* 발견한 곳 */}
      <LocationCard icon={MapPin} color="text-error" title="발견한 곳">
        <div className="space-y-2">
          <div>
            <p className="text-xs text-sub">발견 날짜</p>
            <p className="font-medium">{foundDate}</p>
          </div>

          {foundTime && (
            <div>
              <p className="text-xs text-sub">발견 시간</p>
              <p className="font-medium">{foundTime}</p>
            </div>
          )}

          {foundBuildingName && (
            <div>
              <p className="text-xs text-sub">건물</p>
              <p className="font-medium">{foundBuildingName}</p>
            </div>
          )}

          {foundLocationDetail && (
            <div>
              <p className="text-xs text-sub">상세 위치</p>
              <p className="font-medium">{foundLocationDetail}</p>
            </div>
          )}

          <p className="text-xs text-sub">{foundLocation}</p>
        </div>
      </LocationCard>

      {/* 지금 보관 중인 곳 */}
      <LocationCard icon={Archive} color="text-primary" title="지금 보관 중인 곳">
        <div className="space-y-3">
          {isTemporary ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">습득자가 임시 보관 중</p>
              <p className="text-xs text-sub">
                습득자의 연락처는 공개되지 않아요. 반환 신청을 하면 관리 부서가 연결해 드려요.
              </p>
            </div>
          ) : !storageInfo ? (
            item.storageLocation && custodyType === 'HANDED_OVER' ? (
              <div className="space-y-1">
                <p className="text-xs text-sub">보관 장소</p>
                <p className="font-medium">{item.storageLocation}</p>
                {item.storageLocationDetail && <p className="text-sm">{item.storageLocationDetail}</p>}
              </div>
            ) : (
              <p className="text-sub font-medium">보관 장소 확인 중</p>
            )
          ) : (
            <div className="space-y-2">
              {storageInfo.buildingName && (
                <div>
                  <p className="text-xs text-sub">건물</p>
                  <p className="font-medium">{storageInfo.buildingName}</p>
                </div>
              )}

              {storageInfo.storageName && (
                <div>
                  <p className="text-xs text-sub">보관 장소</p>
                  <p className="font-medium">{storageInfo.storageName}</p>
                </div>
              )}

              {storageInfo.detailLocation && (
                <div>
                  <p className="text-xs text-sub">상세 위치</p>
                  <p className="font-medium">{storageInfo.detailLocation}</p>
                </div>
              )}

              {isSameBuilding && (
                <div className="bg-blue-50 p-2 rounded text-xs text-primary font-medium">
                  발견한 곳과 같은 건물에 보관 중
                </div>
              )}
            </div>
          )}
        </div>
      </LocationCard>

      {/* 발견·보관 위치 지도 (지도를 쓸 수 없으면 표시하지 않음, 위 글로 같은 정보를 볼 수 있음) */}
      <ItemLocationMap item={item} />

      {/* 찾아가는 방법 */}
      {!isTemporary && storageInfo && (
        <LocationCard icon={FileText} color="text-primary" title="찾아가는 방법">
          <div className="space-y-3">
            {storageInfo.operatingHours && (
              <div className="flex gap-3">
                <Clock size={16} className="text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-sub">운영 시간</p>
                  <p className="text-sm font-medium">{storageInfo.operatingHours}</p>
                </div>
              </div>
            )}

            {storageInfo.contactPhone && (
              <div className="flex gap-3">
                <Phone size={16} className="text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-sub">문의처</p>
                  <p className="text-sm font-medium">{storageInfo.contactPhone}</p>
                </div>
              </div>
            )}

            {storageInfo.pickupGuide && (
              <div>
                <p className="text-xs text-sub">수령 절차</p>
                <p className="text-sm font-medium whitespace-pre-line">
                  {storageInfo.pickupGuide}
                </p>
              </div>
            )}

            <div className="bg-yellow-50 p-3 rounded flex gap-2">
              <AlertCircle size={16} className="text-yellow-700 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-900">
                실제 수령 시 담당자가 소유 여부를 확인합니다.
              </p>
            </div>
          </div>
        </LocationCard>
      )}

      {/* 하단 액션 버튼 */}
      <div className="fixed lg:relative bottom-0 left-0 right-0 lg:bottom-auto bg-white border-t lg:border-t-0 p-4 space-y-3 shadow-lg lg:shadow-none">
        {isReturned ? (
          <div className="bg-gray-50 p-3 rounded text-center text-sm text-sub">
            이미 반환된 물품입니다.
          </div>
        ) : (
          <Button onClick={handleReturn} variant="primary" className="w-full">
            반환 신청
          </Button>
        )}

        <Button onClick={handleBack} variant="outline" className="w-full">
          <ArrowLeft size={18} className="mr-2" /> 목록으로
        </Button>
      </div>
    </div>
  );
}
