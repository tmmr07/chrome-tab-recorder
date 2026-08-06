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

    // 2. 画面共有プロンプト（60fps固定・解像度はネイティブ）
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

    // 4. 【超重要：発熱対策】Macのハードウェアエンコーダを使える「h264」を指定
    // VP9と比べてPCへの負荷（発熱）が劇的に下がります。
    const options = {
      mimeType: 'video/webm;codecs=h264',
      videoBitsPerSecond: 15000000 // 15 Mbps（H.264ならこれで十分な高画質）
    };

    // h264が弾かれた場合は、VP9より圧倒的に軽い「VP8」へ逃がす
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
      statusText.textContent = "録画を安全に終了し、保存を完了しました。";
    };

    stream.getVideoTracks()[0].onended = () => {
      stopRecording();
    };

    mediaRecorder.start(1000);
    
    startBtn.style.display = 'none';
    stopBtn.style.display = 'block';
    statusText.textContent = "高画質(60fps/低負荷)で録画中... (直接書き込み中)";

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