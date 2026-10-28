const urlInput = document.getElementById("webhookUrl");
const periodicCheckbox = document.getElementById("periodicEnabled");
const logDiv = document.getElementById("log");

// 팝업 열릴 때 저장된 설정 불러오기
chrome.storage.sync.get(["webhookUrl", "periodicEnabled"]).then((data) => {
  urlInput.value = data.webhookUrl || "";
  periodicCheckbox.checked = !!data.periodicEnabled;
});

document.getElementById("saveBtn").addEventListener("click", async () => {
  await chrome.storage.sync.set({
    webhookUrl: urlInput.value.trim(),
    periodicEnabled: periodicCheckbox.checked
  });
  appendLog("설정 저장 완료");
});

document.getElementById("testBtn").addEventListener("click", async () => {
  const { webhookUrl } = await chrome.storage.sync.get("webhookUrl");
  if (!webhookUrl) {
    appendLog("웹훅 URL을 먼저 저장하세요");
    return;
  }

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "test", timestamp: new Date().toISOString() })
    });
    appendLog(res.ok ? "테스트 전송 성공" : `실패 (status ${res.status})`);
  } catch (err) {
    appendLog(`전송 오류: ${err.message}`);
  }
});

// background.js에서 보내는 실시간 로그 수신
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "log") {
    appendLog(
      `[${message.success ? "성공" : "실패"}] ${message.payload.type} - ${new Date().toLocaleTimeString()}`
    );
  }
});

function appendLog(text) {
  const line = document.createElement("div");
  line.textContent = text;
  logDiv.prepend(line);
}
