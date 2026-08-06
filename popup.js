const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusText = document.getElementById('statusText');

// 拡張機能の現在の状態をチェックしてUIを同期
chrome.storage.local.get(['isRecording'], (result) => {
  if (result.isRecording) {
    startBtn.style.display = 'none';
    stopBtn.style.display = 'block';
    updateStatus("録画中... (裏で別作業をしても大丈夫です)");
  }
});

startBtn.addEventListener('click', async () => {
  try {
    updateStatus("タブの録画準備中...");
    
    // 現在アクティブなタブを取得
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return updateStatus("エラー: タブが見つかりません");

    // 【重要】市販の拡張機能と同じ、タブの映像・音声を直接引っこ抜くための特権IDを発行
    chrome.tabCapture.getMediaStreamId({ targetTabId: tab.id }, (streamId) => {
      if (!streamId) return updateStatus("録画IDの取得に失敗しました");

      // バックグラウンド（司令塔）へ録画開始を指示
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

// バックグラウンドやオフスクリーンからの状態通知を受信
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