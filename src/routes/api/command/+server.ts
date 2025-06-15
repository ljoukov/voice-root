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

type Message = {
	role: 'user' | 'assistant';
	content: string;
};
const history: Message[] = [];

const openaiClient = new OpenAI({
	apiKey: OPENAI_API_KEY
});

const useOperant = true;

async function callLLM(prompt: string): Promise<string> {
	history.push({ role: 'user', content: prompt });
	const completion = await openaiClient.chat.completions.create({
		messages: history,
		model: 'gpt-4.1',
		store: true
	});
	const responseText = completion.choices[0].message.content;
	if (!responseText) {
		return 'Sorry, there is  server error';
	}
	history.push({ role: 'assistant', content: responseText });
	return responseText;
}

async function callTTS(text: string) {
	const mp3 = await openaiClient.audio.speech.create({
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

		const prompt = text.trim();
		if (prompt.length === 0) {
			return json({ status: 'error', message: 'empty prompt' });
		}
		const responseText = await callLLM(prompt);
		const audioBuffer = await callTTS(responseText);
		const audioBase64 = Buffer.from(audioBuffer).toString('base64');
		return json({ status: 'ok', audioBase64 });
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
