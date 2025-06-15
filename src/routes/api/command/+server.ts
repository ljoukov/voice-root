import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	FAL_AI,
	FIREWORKS_API_KEY,
	MINIMAX_API_KEY,
	MINIMAX_GROUP_ID,
	OPENAI_API_KEY
} from '$env/static/private';
import z from 'zod';
import OpenAI from 'openai';
import { systemPrompt } from './systemPrompt';

const client = new OpenAI({
	apiKey: OPENAI_API_KEY
});

const useOperant = true;

async function callOpenAI(prompt: string): Promise<string> {
	console.log('Using OpenAI with MCPs');
	const response = await client.responses.create({
		model: 'gpt-4.1',
		instructions: systemPrompt,
		input: prompt,
		tools: [
			{
				type: 'mcp',
				server_label: 'deepwiki',
				server_url: 'https://mcp.deepwiki.com/mcp',
				require_approval: 'never',
				allowed_tools: ['ask_question']
			}
		]
	});
	return response.output_text;
}

async function callOperant(prompt: string): Promise<string> {
	const response = await fetch('http://127.0.0.1:7000/call_llm', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ prompt, system_prompt: systemPrompt })
	});

	if (!response.ok) {
		throw new Error(`call_llm API error: ${response.status}`);
	}

	const data = await response.json();
	console.log(data);
	if (!data || typeof data.response !== 'string') {
		throw new Error('Invalid response from call_llm');
	}
	return data.response;
}

async function callLLM(prompt: string): Promise<string> {
	if (useOperant) {
		return await callOperant(prompt);
	} else {
		return await callOpenAI(prompt);
	}
}

async function minimaxTTS2(text: string) {
	// Call Minimax API for text-to-speech
	const miniMaxResponse = await fetch(
		`https://api.minimaxi.chat/v1/t2a_v2?GroupId=${MINIMAX_GROUP_ID}`,
		{
			method: 'POST',
			headers: {
				Authorization: `Bearer ${MINIMAX_API_KEY}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				model: 'speech-02-hd',
				text: text,
				stream: false,
				voice_setting: {
					voice_id: 'Grinch',
					speed: 1,
					vol: 1,
					pitch: 0
				},
				audio_setting: {
					sample_rate: 32000,
					bitrate: 128000,
					format: 'mp3',
					channel: 1
				}
			})
		}
	);

	if (!miniMaxResponse.ok) {
		throw new Error(`Minimax API error: ${miniMaxResponse.status}`);
	}

	const audioBuffer = await miniMaxResponse.arrayBuffer();
	return audioBuffer;
}

async function minimaxTTS(text: string) {
	const apiKey = FAL_AI;
	const response = await fetch('https://queue.fal.run/fal-ai/minimax/speech-02-hd', {
		method: 'POST',
		headers: {
			Authorization: `Key ${apiKey}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ text })
	});

	if (!response.ok) {
		throw new Error(`Fal AI TTS API error: ${response.status}`);
	}

	const result = await response.json();
	const requestId = result.request_id;
	if (!requestId) {
		throw new Error('No request_id returned from Fal AI');
	}

	// Poll for the result
	let audioUrl: string | undefined;
	for (let i = 0; i < 20; i++) {
		await new Promise((res) => setTimeout(res, 1000));
		const pollResponse = await fetch(
			`https://queue.fal.run/fal-ai/minimax/speech-02-hd/${requestId}`,
			{
				headers: { Authorization: `Key ${apiKey}` }
			}
		);
		if (!pollResponse.ok) continue;
		const pollResult = await pollResponse.json();
		if (pollResult.status === 'completed' && pollResult.output?.audio_url) {
			audioUrl = pollResult.output.audio_url;
			break;
		}
	}
	if (!audioUrl) {
		throw new Error('Timed out waiting for Fal AI TTS result');
	}

	const audioRes = await fetch(audioUrl);
	if (!audioRes.ok) {
		throw new Error('Failed to fetch audio from Fal AI');
	}
	return await audioRes.arrayBuffer();
}

async function openAiTTS(text: string) {
	const mp3 = await client.audio.speech.create({
		model: 'gpt-4o-mini-tts',
		voice: 'coral',
		input: text,
		instructions: 'Speak in a cheerful and positive tone.'
	});
	return await mp3.arrayBuffer();
}

export const POST = (async ({ request }) => {
	const formData = await request.formData();
	const audioFile = formData.get('audio') as Blob;

	// Create a new FormData for the Fireworks API request
	const fireworksFormData = new FormData();
	fireworksFormData.append('file', audioFile);
	fireworksFormData.append('model', 'whisper-v3');
	fireworksFormData.append('temperature', '0');
	fireworksFormData.append('vad_model', 'silero');

	try {
		const response = await fetch(
			'https://audio-prod.us-virginia-1.direct.fireworks.ai/v1/audio/transcriptions',
			{
				method: 'POST',
				headers: {
					Authorization: `Bearer ${FIREWORKS_API_KEY}`
				},
				body: fireworksFormData
			}
		);

		if (!response.ok) {
			throw new Error(`Fireworks API error: ${response.status}`);
		}

		const transcriptionResult = await response.json();

		// Zod schema for the expected response
		const transcriptionSchema = z.object({
			text: z.string()
		});

		const parsed = transcriptionSchema.parse(transcriptionResult);
		const { text } = parsed;
		console.log('Received: ', text);
		return json({ status: 'ok' });
	} catch (error) {
		console.error('Error during transcription:', error);
		return json(
			{
				status: 'error',
				message: error instanceof Error ? error.message : 'Unknown error occurred'
			},
			{ status: 500 }
		);
	}
}) satisfies RequestHandler;
