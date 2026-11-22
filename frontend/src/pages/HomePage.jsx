import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ClipboardList, MapPin, PackagePlus, Search } from 'lucide-react';
import Button from '../components/common/Button.jsx';
import Input from '../components/common/Input.jsx';
import Select from '../components/common/Select.jsx';
import ItemCard from '../components/common/ItemCard.jsx';
import LoadingState from '../components/common/LoadingState.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import Card from '../components/common/Card.jsx';
import client from '../api/client.js';
import { CATEGORIES } from '../constants/categories.js';

export default function HomePage() {
  const navigate = useNavigate();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [recentItems, setRecentItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRecentItems = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await client.get('/found-items/recent', {
          params: { limit: 8 },
        });
        // 응답은 페이지 객체 { content: [...] }
        setRecentItems(response.data?.data?.content || []);
      } catch (err) {
        setError('최근 습득물을 불러올 수 없습니다.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentItems();
  }, []);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchKeyword) params.append('keyword', searchKeyword);
    if (selectedCategory) params.append('categoryId', selectedCategory);
    navigate(`/items?${params.toString()}`);
  };

  const handleCategoryClick = (categoryId) => {
    navigate(`/items?categoryId=${categoryId}`);
  };

  // SPEC §7 빠른 기능: 분실물 찾기, 습득물 신고하기, 분실 신고하기, 지도에서 찾기
  const quickActions = [
    { title: '분실물 찾기', description: '등록된 습득물 조회', to: '/items', Icon: Search },
    { title: '습득물 신고하기', description: '주운 물품 등록', to: '/report-found', Icon: PackagePlus },
    { title: '분실 신고하기', description: '잃어버린 물품 등록', to: '/report-lost', Icon: ClipboardList },
    { title: '지도에서 찾기', description: '발견 위치로 찾기', to: '/map', Icon: MapPin },
  ];

  return (
    <div className="space-y-6">
      {/* 검색 영역 */}
      <section className="bg-primary text-white rounded-lg p-6 space-y-4">
        <h1 className="text-2xl font-bold">내 물품을 찾아보세요</h1>
        <div className="space-y-3">
          <Input
            label="검색어"
            labelClassName="text-white"
            name="keyword"
            placeholder="물품명이나 특징을 입력하세요 (예: 파란 파우치)"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="bg-white text-text"
          />
          <Select
            label="카테고리"
            labelClassName="text-white"
            name="category"
            options={CATEGORIES}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            placeholder="카테고리 선택"
            className="bg-white text-text"
          />
          <div className="flex gap-2">
            <Button onClick={handleSearch} variant="secondary" className="flex-1 px-2 !bg-white !text-primary hover:!bg-blue-50">
              <Search size={18} className="mr-2" /> 검색
            </Button>
            <Button onClick={() => navigate('/map')} variant="secondary" className="flex-1 px-2 whitespace-nowrap border-2 border-white !bg-transparent !text-white hover:!bg-white/10">
              <MapPin size={18} className="mr-2" aria-hidden="true" /> 지도로 찾기
            </Button>
          </div>
        </div>
      </section>

      {/* 빠른 기능 카드 4개 (링크라서 키보드로도 이동할 수 있다) */}
      <section aria-label="빠른 기능" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map(({ title, description, to, Icon }) => (
          <Link key={to} to={to} className="block rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
            <Card className="h-full text-center py-6 hover:shadow-lg transition-shadow">
              <Icon size={32} className="mx-auto mb-2 text-primary" aria-hidden="true" />
              <h3 className="font-bold text-text mb-1">{title}</h3>
              <p className="text-sm text-sub">{description}</p>
            </Card>
          </Link>
        ))}
      </section>

      {/* 카테고리 버튼 그룹 */}
      <section id="category-section" className="space-y-3">
        <h2 className="text-lg font-bold text-text">카테고리로 찾기</h2>
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
          {CATEGORIES.map((category) => (
            <Button
              key={category.id}
              variant="outline"
              onClick={() => handleCategoryClick(category.id)}
              className="text-sm"
            >
              <span className="mr-1">{category.icon}</span>
              {category.name}
            </Button>
          ))}
        </div>
      </section>

      {/* 최근 습득물 */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-text">최근 습득물</h2>
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} />
        ) : recentItems.length === 0 ? (
          <EmptyState
            message="아직 등록된 물품이 없습니다."
            actionLabel="습득물 신고하기"
            onAction={() => navigate('/report-found')}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentItems.map((item) => (
              <ItemCard key={item.itemId} item={item} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
