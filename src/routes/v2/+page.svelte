<script lang="ts">
	import { z } from 'zod';
	import { Mic } from 'lucide-svelte';

	const emotionalModeSchema = z.enum([
		'listening',
		'thinking',
		'explaining',
		'encouraging',
		'patient',
		'focused',
		'curious',
		'celebrating',
		'clarifying',
		'summarizing'
	]);
	type EmotionalMode = z.infer<typeof emotionalModeSchema>;
	type Animation =
		| 'breathe'
		| 'ripple'
		| 'stable'
		| 'shimmer'
		| 'gentle'
		| 'beam'
		| 'bubble'
		| 'burst'
		| 'fade'
		| 'sunset';

	// Ensure all emotionalModes use a valid Animation
	type EmotionalModeConfig = {
		name: string;
		background: string;
		buttonColor: string;
		pulseColor: string;
		animation: Animation;
		icon: string;
		showMic: boolean;
	};
	let emotionalMode: EmotionalMode = 'listening';
	let isPressed = false;

	// Emotional mode configurations
	const emotionalModes: Record<EmotionalMode, EmotionalModeConfig> = {
		listening: {
			name: 'Listening/Ready',
			background: 'linear-gradient(135deg, #87ceeb 0%, #f0f8ff 50%, #e6f3ff 100%)',
			buttonColor: '#87ceeb',
			pulseColor: '#b0e0e6',
			animation: 'breathe',
			icon: '🎧',
			showMic: false
		},
		thinking: {
			name: 'Thinking/Processing',
			background: 'linear-gradient(135deg, #1e3a8a 0%, #3730a3 50%, #6366f1 100%)',
			buttonColor: '#6366f1',
			pulseColor: '#8b5cf6',
			animation: 'ripple',
			icon: '🧠',
			showMic: false
		},
		explaining: {
			name: 'Explaining/Teaching',
			background: 'linear-gradient(135deg, #0f766e 0%, #14b8a6 50%, #2dd4bf 100%)',
			buttonColor: '#14b8a6',
			pulseColor: '#5eead4',
			animation: 'stable',
			icon: '📚',
			showMic: false
		},
		encouraging: {
			name: 'Encouraging/Affirming',
			background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #fb923c 100%)',
			buttonColor: '#fbbf24',
			pulseColor: '#fde047',
			animation: 'shimmer',
			icon: '☀️',
			showMic: false
		},
		patient: {
			name: 'Patient/Supportive',
			background: 'linear-gradient(135deg, #c084fc 0%, #ddd6fe 50%, #e0e7ff 100%)',
			buttonColor: '#c084fc',
			pulseColor: '#ddd6fe',
			animation: 'gentle',
			icon: '🤗',
			showMic: false
		},
		focused: {
			name: 'Focused/Deep Dive',
			background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #f8fafc 100%)',
			buttonColor: '#3b82f6',
			pulseColor: '#93c5fd',
			animation: 'beam',
			icon: '🔍',
			showMic: false
		},
		curious: {
			name: 'Curious/Ideation',
			background: 'linear-gradient(135deg, #fb7185 0%, #f97316 50%, #fbbf24 100%)',
			buttonColor: '#fb7185',
			pulseColor: '#fda4af',
			animation: 'bubble',
			icon: '💡',
			showMic: false
		},
		celebrating: {
			name: 'Celebrating/Success',
			background: 'linear-gradient(135deg, #fbbf24 0%, #10b981 50%, #059669 100%)',
			buttonColor: '#10b981',
			pulseColor: '#34d399',
			animation: 'burst',
			icon: '🎉',
			showMic: false
		},
		clarifying: {
			name: 'Clarifying/Apologetic',
			background: 'linear-gradient(135deg, #64748b 0%, #94a3b8 50%, #cbd5e1 100%)',
			buttonColor: '#64748b',
			pulseColor: '#94a3b8',
			animation: 'fade',
			icon: '🙏',
			showMic: false
		},
		summarizing: {
			name: 'Summarizing/Winding Down',
			background: 'linear-gradient(135deg, #fb7185 0%, #f97316 50%, #8b5cf6 100%)',
			buttonColor: '#f97316',
			pulseColor: '#fb923c',
			animation: 'sunset',
			icon: '📋',
			showMic: false
		}
	};

	$: currentMode = emotionalModes[emotionalMode];

	const animationDurations = {
		breathe: '4s',
		ripple: '3s',
		stable: '2s',
		shimmer: '2s',
		gentle: '5s',
		beam: '2.5s',
		bubble: '2.5s',
		burst: '1.5s',
		fade: '4s',
		sunset: '6s'
	};

	$: animationStyle = `animation: ${currentMode.animation} ${animationDurations[currentMode.animation]} ease-in-out infinite`;

	function onMouseDown() {
		isPressed = true;
		console.log('onMouseDown');
		startRecording();
	}

	function onMouseUp() {
		console.log('onMouseUp');
		setTimeout(() => (isPressed = false), 150);
		stopRecording();
	}

	let mediaRecorder: MediaRecorder | null = null;
	let audioChunks: Blob[] = [];
	let isRecording = false;
	let audioElement: HTMLAudioElement;
	let audioUrl: string | undefined;

	async function startRecording() {
		if (audioElement && !audioElement.paused) {
			audioElement.pause();
			audioElement.currentTime = 0;
			if (audioUrl) {
				URL.revokeObjectURL(audioUrl);
				audioUrl = undefined;
			}
		}

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

			const json = await response.json();

			const responseSchema = z.union([
				z.object({
					status: z.literal('error'),
					message: z.string()
				}),
				z.object({
					status: z.literal('ok'),
					audioBase64: z.string().optional(),
					mode: emotionalModeSchema,
					playSong: z.string().optional()
				})
			]);

			const parsed = responseSchema.safeParse(json);
			if (!parsed.success) {
				console.error('Invalid response from server', parsed.error);
				return;
			}
			if (parsed.data.status === 'ok') {
				emotionalMode = parsed.data.mode;
				console.log({ emotionalMode });
				const { audioBase64, playSong } = parsed.data;
				if (audioBase64) {
					const arrayBuffer = Uint8Array.from(atob(audioBase64), (c) => c.charCodeAt(0)).buffer;
					// Create a blob from the array buffer
					const responseBlob = new Blob([arrayBuffer], { type: 'audio/mp3' });
					// Create an object URL for the blob
					audioUrl = URL.createObjectURL(responseBlob);
					audioElement.src = audioUrl;
				} else if (playSong) {
					audioElement.src = playSong;
				}

				// Set the audio source and play
				try {
					await audioElement.play();
				} catch (error) {
					console.error('Error playing audio:', error);
				}

				// Clean up the object URL after playback
				audioElement.onended = () => {
					if (audioUrl) {
						URL.revokeObjectURL(audioUrl);
						audioUrl = undefined;
					}
				};
			}

			// // Get the response as an array buffer
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

<svelte:head>
	<style>
		@keyframes breathe {
			0%,
			100% {
				transform: scale(1);
				opacity: 0.8;
			}
			50% {
				transform: scale(1.05);
				opacity: 1;
			}
		}

		@keyframes ripple {
			0% {
				transform: scale(1);
			}
			50% {
				transform: scale(1.1);
			}
			100% {
				transform: scale(1);
			}
		}

		@keyframes stable {
			0%,
			100% {
				transform: scale(1);
				opacity: 0.95;
			}
			50% {
				transform: scale(1.02);
				opacity: 1;
			}
		}

		@keyframes shimmer {
			0% {
				transform: scale(1);
				opacity: 0.8;
			}
			25% {
				transform: scale(1.15);
				opacity: 1;
			}
			50% {
				transform: scale(1.1);
				opacity: 0.9;
			}
			75% {
				transform: scale(1.15);
				opacity: 1;
			}
			100% {
				transform: scale(1);
				opacity: 0.8;
			}
		}

		@keyframes gentle {
			0%,
			100% {
				transform: scale(0.95);
				opacity: 0.7;
			}
			50% {
				transform: scale(1);
				opacity: 0.9;
			}
		}

		@keyframes beam {
			0%,
			100% {
				transform: scale(1) scaleX(1);
			}
			50% {
				transform: scale(1.05) scaleX(1.1);
			}
		}

		@keyframes bubble {
			0% {
				transform: scale(1) translateY(0);
			}
			25% {
				transform: scale(1.1) translateY(-5px);
			}
			50% {
				transform: scale(1.05) translateY(2px);
			}
			75% {
				transform: scale(1.15) translateY(-3px);
			}
			100% {
				transform: scale(1) translateY(0);
			}
		}

		@keyframes burst {
			0% {
				transform: scale(1);
			}
			25% {
				transform: scale(1.3);
			}
			50% {
				transform: scale(1.1);
			}
			75% {
				transform: scale(1.4);
			}
			100% {
				transform: scale(1);
			}
		}

		@keyframes fade {
			0%,
			100% {
				transform: scale(0.9);
				opacity: 0.6;
			}
			50% {
				transform: scale(0.95);
				opacity: 0.8;
			}
		}

		@keyframes sunset {
			0% {
				transform: scale(1) rotateZ(0deg);
				opacity: 1;
			}
			50% {
				transform: scale(1.05) rotateZ(1deg);
				opacity: 0.8;
			}
			100% {
				transform: scale(1) rotateZ(0deg);
				opacity: 1;
			}
		}

		@keyframes ponder {
			0%,
			100% {
				transform: translateX(0) scale(1);
			}
			25% {
				transform: translateX(-10px) scale(0.95);
			}
			75% {
				transform: translateX(10px) scale(0.95);
			}
		}

		@keyframes backgroundFlow {
			0%,
			100% {
				background-position: 0% 50%;
			}
			50% {
				background-position: 100% 50%;
			}
		}

		@keyframes pulseRipple {
			0% {
				transform: scale(1);
				opacity: 0.8;
			}
			100% {
				transform: scale(2.5);
				opacity: 0;
			}
		}
	</style>
</svelte:head>

<div
	class="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden transition-all duration-1000 ease-in-out"
	style="background: {currentMode.background}; background-size: 200% 200%; animation: backgroundFlow 8s ease-in-out infinite"
>
	<!-- Ambient background particles -->
	<div class="pointer-events-none absolute inset-0 overflow-hidden">
		{#each Array(20) as _, i}
			<div
				class="absolute rounded-full opacity-20"
				style="left: {Math.random() * 100}%; top: {Math.random() * 100}%; 
               width: {Math.random() * 4 + 2}px; height: {Math.random() * 4 + 2}px;
               background-color: {currentMode.pulseColor};
               animation: breathe {Math.random() * 3 + 2}s ease-in-out infinite {Math.random() *
					2}s"
			/>
		{/each}
	</div>

	<!-- Main voice button -->
	<div class="relative flex items-center justify-center">
		<!-- Pulse rings -->
		{#each Array(3) as _, i}
			<div
				class="pointer-events-none absolute rounded-full border-2"
				style="width: {280 + i * 40}px; height: {280 + i * 40}px;
               border-color: {currentMode.pulseColor}; opacity: {0.3 - i * 0.1};
               animation: pulseRipple {3 + i}s ease-out infinite {i * 0.5}s"
			/>
		{/each}

		<!-- Main button -->
		<button
			class="relative h-64 w-64 transform rounded-full shadow-2xl transition-all duration-300 ease-out
             {isPressed ? 'scale-95' : 'scale-100'} focus:ring-opacity-50 hover:scale-105
             focus:ring-4 focus:ring-white focus:outline-none active:scale-95"
			style="background-color: {currentMode.buttonColor};
             box-shadow: 0 20px 40px rgba(0,0,0,0.2), 0 0 40px {currentMode.pulseColor}40;
             {animationStyle}"
			on:mousedown={onMouseDown}
			on:mouseup={onMouseUp}
		>
			<!-- Button glow effect -->
			<!-- svelte-ignore element_invalid_self_closing_tag -->
			<div
				class="absolute inset-0 rounded-full opacity-30"
				style="background: radial-gradient(circle, {currentMode.pulseColor} 0%, transparent 70%)"
			/>

			<!-- Icon display -->
			{#if currentMode.showMic}
				<Mic
					size={80}
					class="relative z-10 text-white drop-shadow-lg"
					style="filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3))"
				/>
			{:else}
				<span
					class="relative z-10 text-8xl text-white drop-shadow-lg"
					style="filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3)); line-height: 1"
				>
					{currentMode.icon}
				</span>
			{/if}
		</button>
	</div>

	<!-- App title -->
	<div class="mt-12 text-center">
		<h1 class="mb-2 text-4xl font-light text-white drop-shadow-md">OmniSense</h1>
		<p class="text-lg font-light text-white opacity-80">
			{currentMode.name}
		</p>
	</div>

	<!-- Debug controls -->
	<div class="absolute bottom-8 left-1/2 hidden -translate-x-1/2 transform">
		<div class="bg-opacity-20 rounded-2xl bg-black p-4 backdrop-blur-sm">
			<p class="mb-3 text-center text-sm text-white opacity-80">Debug Controls</p>
			<div class="flex max-w-md flex-wrap justify-center gap-2">
				{#each Object.entries(emotionalModes) as [mode, config]}
					<button
						on:click={() => (emotionalMode = mode as EmotionalMode)}
						class="rounded-lg px-2 py-1 text-xs font-medium transition-all duration-200
                   {emotionalMode === mode
							? 'scale-105 bg-white text-blue-700 shadow-lg'
							: 'bg-opacity-20 hover:bg-opacity-30 bg-white text-black'}"
					>
						{config.name.split('/')[0]}
					</button>
				{/each}
			</div>
		</div>
	</div>
</div>
<audio bind:this={audioElement} />
