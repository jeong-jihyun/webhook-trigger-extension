// 예시: 특정 키워드가 포함된 페이지 로드 시 자동으로 background에 알림
// (예: "품절임박", "가격인하" 등 감지 → 웹훅 수신 서버에서 후속 처리)

const KEYWORDS = ["할인", "품절임박", "가격인하"];

function scanPageForKeywords() {
  const bodyText = document.body.innerText;
  const matched = KEYWORDS.filter((kw) => bodyText.includes(kw));

  if (matched.length > 0) {
    chrome.runtime.sendMessage({
      type: "auto-trigger",
      data: {
        url: location.href,
        title: document.title,
        matchedKeywords: matched
      }
    });
  }
}

// 페이지가 완전히 로드된 후 1회 실행
// SPA(React/Vue 등) 대응이 필요하면 MutationObserver로 교체
window.addEventListener("load", () => {
  setTimeout(scanPageForKeywords, 1500);
});
