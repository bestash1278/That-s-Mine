import '@testing-library/jest-dom'

// jsdom은 scrollIntoView를 구현하지 않는다(오류 필드로 이동하는 화면 코드에서 사용)
if (!window.HTMLElement.prototype.scrollIntoView) {
  window.HTMLElement.prototype.scrollIntoView = () => {}
}
