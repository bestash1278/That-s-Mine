/**
 * 버튼처럼 보이는 단일 선택 그룹 (라디오 버튼 기반이라 키보드 방향키·스크린리더로도 조작 가능)
 *
 * @param options [{ value, label, description? }]
 * @param columns 'grid-cols-2 sm:grid-cols-3' 처럼 Tailwind 열 클래스
 */
export default function ChoiceGroup({
  name,
  legend,
  options,
  value,
  onChange,
  required = false,
  error,
  columns = 'grid-cols-2 sm:grid-cols-3',
  idPrefix,
}) {
  const prefix = idPrefix || name;
  return (
    <fieldset aria-invalid={error ? 'true' : undefined} aria-describedby={error ? `${prefix}-error` : undefined}>
      <legend className="mb-2 block text-base font-medium text-text">
        {legend}
        {required && (
          <>
            <span className="ml-1 text-error" aria-hidden="true">*</span>
            <span className="ml-1 text-sm text-sub">(필수)</span>
          </>
        )}
      </legend>
      <div className={`grid gap-2 ${columns}`}>
        {options.map((option, index) => {
          const inputId = `${prefix}-${option.value}`;
          const checked = String(value) === String(option.value);
          return (
            <label
              key={option.value}
              htmlFor={inputId}
              className={`flex min-h-[44px] cursor-pointer flex-col justify-center rounded border-2 px-3 py-2 transition-colors focus-within:ring-2 focus-within:ring-primary ${
                checked
                  ? 'border-primary bg-blue-50 text-primary'
                  : error
                    ? 'border-error bg-white text-text'
                    : 'border-gray-300 bg-white text-text hover:border-primary'
              }`}
            >
              <span className="flex items-center gap-2">
                <input
                  id={inputId}
                  // 첫 오류로 포커스를 옮길 때 그룹의 첫 항목이 받도록 id를 하나 더 둔다
                  data-field={index === 0 ? name : undefined}
                  type="radio"
                  name={name}
                  value={option.value}
                  checked={checked}
                  onChange={() => onChange(String(option.value))}
                  className="h-4 w-4 accent-primary"
                />
                <span className="font-medium">{option.label}</span>
                {checked && <span className="sr-only">(선택됨)</span>}
              </span>
              {option.description && <span className="mt-1 pl-6 text-sm text-sub">{option.description}</span>}
            </label>
          );
        })}
      </div>
      {error && (
        <p id={`${prefix}-error`} className="mt-1 text-sm text-error">
          {error}
        </p>
      )}
    </fieldset>
  );
}
