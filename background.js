// ===== 초기 설정: 우클릭 컨텍스트 메뉴 등록 =====
// chrome.runtime.onInstalled는 설치/업데이트 시 1회만 실행됨 (중복 등록 방지)
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "send-selection-to-webhook",
    title: "선택 텍스트를 웹훅으로 전송",
    contexts: ["selection"]
  });

  chrome.contextMenus.create({
    id: "send-page-to-webhook",
    title: "현재 페이지 URL/제목을 웹훅으로 전송",
    contexts: ["page"]
  });
});

// ===== 컨텍스트 메뉴 클릭 핸들러 =====
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const { webhookUrl } = await chrome.storage.sync.get("webhookUrl");

  if (!webhookUrl) {
    // 팝업에서 설정 안 했을 때 배지로 알림 (알림창보다 가벼움)
    chrome.action.setBadgeText({ text: "!" });
    chrome.action.setBadgeBackgroundColor({ color: "#e74c3c" });
    return;
  }

  let payload;

  if (info.menuItemId === "send-selection-to-webhook") {
    payload = {
      type: "selection",
      text: info.selectionText,
      pageUrl: info.pageUrl,
      timestamp: new Date().toISOString()
    };
  }

  if (info.menuItemId === "send-page-to-webhook") {
    payload = {
      type: "page",
      title: tab.title,
      pageUrl: info.pageUrl,
      timestamp: new Date().toISOString()
    };
  }

  await sendToWebhook(webhookUrl, payload, tab.id);
});

// ===== 실제 webhook 전송 함수 =====
async function sendToWebhook(url, payload, tabId) {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const success = res.ok;
    chrome.action.setBadgeText({ text: success ? "✓" : "✗" });
    chrome.action.setBadgeBackgroundColor({ color: success ? "#2ecc71" : "#e74c3c" });

    // 3초 후 배지 초기화
    setTimeout(() => chrome.action.setBadgeText({ text: "" }), 3000);

    // 팝업이 열려있으면 로그 남기기 (없으면 조용히 무시됨)
    chrome.runtime.sendMessage({ type: "log", success, payload }).catch(() => {});
  } catch (err) {
    chrome.action.setBadgeText({ text: "✗" });
    chrome.action.setBadgeBackgroundColor({ color: "#e74c3c" });
    console.error("웹훅 전송 실패:", err);
  }
}

// ===== content.js로부터 메시지 수신 (예: 특정 이벤트 감지 시 자동 전송) =====
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "auto-trigger") {
    chrome.storage.sync.get("webhookUrl").then(({ webhookUrl }) => {
      if (webhookUrl) {
        sendToWebhook(webhookUrl, {
          type: "auto",
          ...message.data,
          timestamp: new Date().toISOString()
        });
      }
    });
  }
  return true; // 비동기 응답 허용
});

// ===== 알람 기반 주기 트리거 예시 (가격 추적 확장 등에 재사용 가능) =====
// chrome.alarms는 최소 간격이 1분이라는 제약이 있음 (그보다 짧은 주기는 불가)
chrome.alarms.create("periodic-check", { periodInMinutes: 30 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "periodic-check") {
    const { webhookUrl, periodicEnabled } = await chrome.storage.sync.get([
      "webhookUrl",
      "periodicEnabled"
    ]);
    if (webhookUrl && periodicEnabled) {
      sendToWebhook(webhookUrl, {
        type: "periodic-ping",
        note: "30분 주기 자동 체크"
      });
    }
  }
});
