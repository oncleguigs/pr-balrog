import OpenAI from 'openai'
import type { AIAdapter, GenerateQuizOptions, Question } from '../types'
import { parseQuizResponse } from './anthropic'
import { buildSystemPrompt, buildUserPrompt } from './prompt'

export class OpenAIAdapter implements AIAdapter {
  private client: OpenAI
  private model: string

  constructor(apiKey: string, model = 'gpt-4o', baseURL?: string) {
    this.client = new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) })
    this.model = model
  }

  async generateQuiz(opts: GenerateQuizOptions): Promise<Question[]> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content: buildUserPrompt(opts.diff, opts.numQuestions, opts.language, opts.additionalPrompt) },
      ],
    })

    const text = response.choices[0]?.message?.content ?? ''
    return parseQuizResponse(text, opts.numQuestions)
  }
}

// GitHub Models uses the OpenAI-compatible endpoint with the GITHUB_TOKEN
export class GitHubModelsAdapter extends OpenAIAdapter {
  constructor(token: string, model = 'gpt-4o') {
    super(token, model, 'https://models.inference.ai.azure.com')
  }
}

// Azure OpenAI uses the same SDK with a different base URL + API version
export class AzureOpenAIAdapter implements AIAdapter {
  private client: OpenAI
  private model: string

  constructor(apiKey: string, endpoint: string, deployment: string, apiVersion = '2024-02-01') {
    this.client = new OpenAI({
      apiKey,
      baseURL: `${endpoint}/openai/deployments/${deployment}`,
      defaultQuery: { 'api-version': apiVersion },
      defaultHeaders: { 'api-key': apiKey },
    })
    this.model = deployment
  }

  async generateQuiz(opts: GenerateQuizOptions): Promise<Question[]> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content: buildUserPrompt(opts.diff, opts.numQuestions, opts.language, opts.additionalPrompt) },
      ],
    })

    const text = response.choices[0]?.message?.content ?? ''
    return parseQuizResponse(text, opts.numQuestions)
  }
}
