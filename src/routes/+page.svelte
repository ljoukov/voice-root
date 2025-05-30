<script lang="ts">
let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];
let isRecording = false;

async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];
    mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            audioChunks.push(event.data);
        }
    };
    mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        console.log('Bytes recorded:', audioBlob.size);
    };
    mediaRecorder.start();
    isRecording = true;
}

function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
    }
}
</script>

<h1>Audio Recorder</h1>
<button on:click={isRecording ? stopRecording : startRecording}>
    {isRecording ? 'Stop Recording' : 'Start Recording'} 🎤
</button>
