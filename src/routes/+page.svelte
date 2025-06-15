<script lang="ts">
let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];
let isRecording = false;
let audioElement: HTMLAudioElement;

async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];
    mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            audioChunks.push(event.data);
        }
    };
    mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        console.log('Bytes recorded:', audioBlob.size);
        
        const formData = new FormData();
        formData.append('audio', audioBlob);
        
        const response = await fetch('/api/command', {
            method: 'POST',
            body: formData
        });
        
        // Get the response as an array buffer
        const arrayBuffer = await response.arrayBuffer();
        // Create a blob from the array buffer
        const responseBlob = new Blob([arrayBuffer], { type: 'audio/mp3' });
        // Create an object URL for the blob
        const audioUrl = URL.createObjectURL(responseBlob);
        
        // Set the audio source and play
        audioElement.src = audioUrl;
        try {
            await audioElement.play();
        } catch (error) {
            console.error('Error playing audio:', error);
        }
        
        // Clean up the object URL after playback
        audioElement.onended = () => {
            URL.revokeObjectURL(audioUrl);
        };
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

<div class="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex flex-col items-center justify-center p-4">
    <audio bind:this={audioElement} />
    <div class="max-w-md w-full bg-gray-800 rounded-lg shadow-xl p-8">
        <h1 class="text-4xl font-bold text-center mb-8 text-white">VoiceRoot 🎙️</h1>
        
        <button 
            class={`w-full py-4 px-6 rounded-lg text-lg font-semibold transition-all duration-200 ${
                isRecording 
                    ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                    : 'bg-emerald-500 hover:bg-emerald-600 text-white'
            }`}
            on:click={isRecording ? stopRecording : startRecording}
        >
            <div class="flex items-center justify-center space-x-2">
                <span>{isRecording ? 'Stop' : 'Start Command'}</span>
                <span class="text-xl">{isRecording ? '⏹️' : '🎤'}</span>
            </div>
        </button>
    </div>
</div>
