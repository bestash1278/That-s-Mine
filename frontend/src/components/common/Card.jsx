export default function Card({ children, className = '' }) {
  return (
    <div className={`bg-card rounded-lg shadow p-4 ${className}`}>
      {children}
    </div>
  );
}
