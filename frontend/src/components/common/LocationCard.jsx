import Card from './Card.jsx';

export default function LocationCard({ icon: Icon, color = 'text-primary', title, children }) {
  const bgColorClass = color.includes('error') ? 'bg-red-50' : color.includes('green') ? 'bg-green-50' : 'bg-blue-50';

  return (
    <Card className={`${bgColorClass} border-l-4 ${color.includes('error') ? 'border-error' : color.includes('green') ? 'border-green-500' : 'border-primary'}`}>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          {Icon && <Icon size={20} className={color} />}
          <h3 className="font-bold text-text">{title}</h3>
        </div>
        <div className="text-sm text-text space-y-2 [&_.text-sub]:text-gray-600">
          {children}
        </div>
      </div>
    </Card>
  );
}
