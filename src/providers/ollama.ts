import type { AIAdapter, GenerateQuizOptions, Question } from '../types'
import { parseQuizResponse } from './anthropic'
import { buildSystemPrompt, buildUserPrompt } from './prompt'

// Ollama exposes an OpenAI-compatible /v1/chat/completions endpoint
export class OllamaAdapter implements AIAdapter {
  private baseURL: string
  private model: string

  constructor(baseURL = 'http://localhost:11434', model = 'llama3') {
    this.baseURL = baseURL.replace(/\/$/, '')
    this.model = model
  }

  async generateQuiz(opts: GenerateQuizOptions): Promise<Question[]> {
    const response = await fetch(`${this.baseURL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: buildSystemPrompt() },
          { role: 'user', content: buildUserPrompt(opts.diff, opts.numQuestions, opts.language, opts.additionalPrompt) },
        ],
        format: 'json',
        stream: false,
      }),
    })

    if (!response.ok) {
      throw new Error(`Ollama request failed: ${response.status} ${response.statusText}`)
    }

    const data = (await response.json()) as { choices: { message: { content: string } }[] }
    const text = data.choices[0]?.message?.content ?? ''
    return parseQuizResponse(text, opts.numQuestions)
  }
}
