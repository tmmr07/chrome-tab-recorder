const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusText = document.getElementById('statusText');

chrome.storage.local.get(['isRecording'], (result) => {
  if (result.isRecording) {
    startBtn.style.display = 'none';
    stopBtn.style.display = 'block';
    updateStatus("録画中... (別のタブで作業しても録画は続行されます)");
  }
});

startBtn.addEventListener('click', async () => {
  try {
    updateStatus("タブの録画準備中...");
    
    // 現在アクティブなタブを取得
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return updateStatus("エラー: タブが見つかりません");

    chrome.tabCapture.getMediaStreamId({ targetTabId: tab.id }, (streamId) => {
      if (!streamId) return updateStatus("録画IDの取得に失敗しました");

      chrome.runtime.sendMessage({
        target: 'background',
        type: 'start-recording',
        streamId: streamId,
        tabTitle: tab.title
      });

      startBtn.style.display = 'none';
      stopBtn.style.display = 'block';
      updateStatus("録画を開始しました！");
    });
  } catch (err) {
    updateStatus("エラー: " + err.message);
  }
});

stopBtn.addEventListener('click', () => {
  updateStatus("録画を停止しています。保存ダイアログを待っています...");
  chrome.runtime.sendMessage({ target: 'background', type: 'stop-recording' });
  
  startBtn.style.display = 'block';
  stopBtn.style.display = 'none';
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.target !== 'popup') return;
  if (message.type === 'status-update') {
    updateStatus(message.text);
  }
});

function updateStatus(text) {
  const statusDiv = document.getElementById('status');
  if (statusDiv) statusDiv.textContent = text;
}