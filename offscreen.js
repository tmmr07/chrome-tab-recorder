let mediaRecorder;
let opfsWritable;
let opfsFileHandle;
let currentTabTitle = "Soccer_Recording";

chrome.runtime.onMessage.addListener(async (message) => {
  if (message.target !== 'offscreen') return;

  if (message.type === 'init-capture') {
    currentTabTitle = message.tabTitle.replace(/[/\\?%*:|"<>]/g, '_');
    await startTabCapture(message.streamId);
  } else if (message.type === 'stop-capture') {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
  }
});

async function startTabCapture(streamId) {
  try {
    const root = await navigator.storage.getDirectory();
    opfsFileHandle = await root.getFileHandle('temp_buffer.webm', { create: true });
    opfsWritable = await opfsFileHandle.createWritable();

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: { chromeMediaSource: 'tab', chromeMediaSourceId: streamId }
      },
      video: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: streamId,
          maxWidth: 1920,
          maxHeight: 1080, 
          maxFrameRate: 60
        }
      }
    });

    const audioContext = new AudioContext();
    const streamSource = audioContext.createMediaStreamSource(stream);
    streamSource.connect(audioContext.destination);

    const videoTrack = stream.getVideoTracks()[0];
    if ('contentHint' in videoTrack) {
      videoTrack.contentHint = 'detail';
    }

    const options = {
      mimeType: 'video/webm;codecs=h264',
      videoBitsPerSecond: 15000000 
    };

    mediaRecorder = new MediaRecorder(stream, options);

    mediaRecorder.ondataavailable = async (event) => {
      if (event.data.size > 0 && opfsWritable) {
        await opfsWritable.write(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      chrome.runtime.sendMessage({ target: 'popup', type: 'status-update', text: "ファイルをエクスポート中..." });

      if (opfsWritable) {
        await opfsWritable.close();
        opfsWritable = null;
      }

      stream.getTracks().forEach(track => track.stop());
      audioContext.close();

      const file = await opfsFileHandle.getFile();
      const blobUrl = URL.createObjectURL(file);

      chrome.runtime.sendMessage({
        target: 'background',
        type: 'download-file',
        url: blobUrl,
        filename: `${currentTabTitle}_60fps.webm`
      });
    };

    mediaRecorder.start(1000);
    chrome.runtime.sendMessage({ target: 'popup', type: 'status-update', text: "録画中...（別のタブで作業しても録画は続行されます）" });

  } catch (err) {
    chrome.runtime.sendMessage({ target: 'popup', type: 'status-update', text: "エラー: " + err.message });
  }
}