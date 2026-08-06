let mediaRecorder;
let writableStream;

const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusText = document.getElementById('statusText');

startBtn.addEventListener('click', async () => {
  try {
    statusText.textContent = "保存先を選択してください...";

    const fileHandle = await window.showSaveFilePicker({
      suggestedName: `Recording_60fps_H264_${new Date().getTime()}.webm`,
      types: [{
        description: 'WebM Video File',
        accept: { 'video/webm': ['.webm'] },
      }],
    });

    writableStream = await fileHandle.createWritable();

    statusText.textContent = "録画するタブを選択してください...";

    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        frameRate: { ideal: 60, max: 60 }
      },
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        sampleRate: 48000
      }
    });

    const videoTrack = stream.getVideoTracks()[0];
    if ('contentHint' in videoTrack) {
      videoTrack.contentHint = 'detail';
    }

    const options = {
      mimeType: 'video/webm;codecs=h264',
      videoBitsPerSecond: 15000000 
    };

    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      console.warn('H.264がサポートされていないため、軽量なVP8を使用します。');
      options.mimeType = 'video/webm;codecs=vp8,opus';
    }

    mediaRecorder = new MediaRecorder(stream, options);

    mediaRecorder.ondataavailable = async (event) => {
      if (event.data.size > 0 && writableStream) {
        await writableStream.write(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      if (writableStream) {
        await writableStream.close();
        writableStream = null;
      }
      
      startBtn.style.display = 'block';
      stopBtn.style.display = 'none';
      statusText.textContent = "録画を終了し、保存を完了しました。";
    };

    stream.getVideoTracks()[0].onended = () => {
      stopRecording();
    };

    mediaRecorder.start(1000);
    
    startBtn.style.display = 'none';
    stopBtn.style.display = 'block';
    statusText.textContent = "録画中...";

  } catch (err) {
    console.error("Error: ", err);
    if (err.name === 'AbortError') {
      statusText.textContent = "キャンセルされました。";
    } else {
      statusText.textContent = "エラーが発生しました: " + err.message;
    }
    
    if (writableStream) {
      await writableStream.close().catch(console.error);
      writableStream = null;
    }
  }
});

stopBtn.addEventListener('click', stopRecording);

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    statusText.textContent = "録画を終了し、ファイルへの書き込みを完了しています...";
    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach(track => track.stop());
  }
}