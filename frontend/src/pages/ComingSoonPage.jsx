import { useNavigate } from 'react-router-dom';
import Button from '../components/common/Button.jsx';

export default function ComingSoonPage({ title }) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <h1 className="text-3xl font-bold text-primary mb-4">{title || '준비 중'}</h1>
      <p className="text-lg text-sub mb-8">곧 공개될 예정입니다.</p>
      <Button onClick={() => navigate('/')}>홈으로 돌아가기</Button>
    </div>
  );
}
