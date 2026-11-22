import Card from '../common/Card.jsx';

/** 신고 폼의 구역(물품 정보, 발견 정보 등). 번호로 진행 순서를 보여준다. */
export default function FormSection({ step, title, description, children }) {
  const headingId = `section-${step}`;
  return (
    <Card className="space-y-4">
      <section aria-labelledby={headingId} className="space-y-4">
        <div>
          <h2 id={headingId} className="flex items-center gap-2 text-lg font-bold text-text">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm text-white">
              {step}
            </span>
            {title}
          </h2>
          {description && <p className="mt-1 text-sm text-sub">{description}</p>}
        </div>
        {children}
      </section>
    </Card>
  );
}
