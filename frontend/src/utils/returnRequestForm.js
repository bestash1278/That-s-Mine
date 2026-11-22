// 반환 신청 입력 검증 (서버 ReturnRequestService와 같은 기준. 서버가 최종 판단한다)
export const MIN_LENGTH = 5;
export const MAX_DESCRIPTION = 500;
export const MAX_NOTE = 300;

/** 입력값을 서버와 같은 기준으로 먼저 확인한다(서버가 최종 판단) */
export function validateReturnForm({ ownershipDescription, additionalNote }) {
  const errors = {};
  const description = (ownershipDescription || '').trim();
  if (!description) {
    errors.ownershipDescription = '내 물건이라고 판단한 근거(물건의 특징)를 입력해 주세요.';
  } else if (description.length < MIN_LENGTH) {
    errors.ownershipDescription = `소유 확인에 쓸 특징을 ${MIN_LENGTH}자 이상 구체적으로 입력해 주세요.`;
  } else if (description.length > MAX_DESCRIPTION) {
    errors.ownershipDescription = `소유 확인 특징은 ${MAX_DESCRIPTION}자 이하로 입력해 주세요.`;
  }
  if ((additionalNote || '').trim().length > MAX_NOTE) {
    errors.additionalNote = `추가 설명은 ${MAX_NOTE}자 이하로 입력해 주세요.`;
  }
  return errors;
}
