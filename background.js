let currentDownloadId = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.target !== 'background') return;
	if (message.type === 'start-recording') {
		chrome.storage.local.set({ isRecording: true });
		startRecordingWorkflow(message.streamId, message.tabTitle)
	} else if (message.type === 'stop-recording') {
		chrome.storage.local.set({ isRecording: false });
		stopRecordingWorkflow();
	} else if (message.type === 'download-file') {
		executeDownload(message.url, message.filename);
	}
});

async function startRecordingWorkflow(streamId, tabTitle) {
  await chrome.offscreen.closeDocument().catch(() => {});

  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['USER_MEDIA'],
    justification: 'Tab capture for lag-free high-quality 60fps video recording'
  });

  chrome.runtime.sendMessage({
    target: 'offscreen',
    type: 'init-capture',
    streamId: streamId,
    tabTitle: tabTitle
  });
}

function stopRecordingWorkflow() {
  chrome.runtime.sendMessage({
    target: 'offscreen',
    type: 'stop-capture'
  });
}

async function executeDownload(url, filename) {
  try {
    currentDownloadId = await chrome.downloads.download({
      url: url,
      filename: filename,
      saveAs: true
    });
  } catch (err) {
    console.error("Download failed to start:", err);
    cleanUpResources(url);
  }
}

chrome.downloads.onChanged.addListener(async (delta) => {
  if (!currentDownloadId || delta.id !== currentDownloadId) return;

  if (delta.state && delta.state.current === 'complete') {
    chrome.downloads.search({ id: currentDownloadId }, async (results) => {
      if (results && results[0]) {
        await cleanUpResources(results[0].url);
      }
      currentDownloadId = null;
    });
  }
});

async function cleanUpResources(url) {
  if (url) {
    URL.revokeObjectURL(url);
  }
  
  const root = await navigator.storage.getDirectory();
  await root.removeEntry('temp_buffer.webm').catch(() => {});

  await chrome.offscreen.closeDocument().catch(() => {});
  
  chrome.runtime.sendMessage({ target: 'popup', type: 'status-update', text: "保存が完了しました！" });
}