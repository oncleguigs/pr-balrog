import * as core from '@actions/core'
import type { AIAdapter, AIProvider } from '../types'
import { AnthropicAdapter } from './anthropic'
import { OpenAIAdapter, GitHubModelsAdapter, AzureOpenAIAdapter } from './openai'
import { OllamaAdapter } from './ollama'

export function createProvider(
  provider: AIProvider,
  apiKey: string,
  model?: string,
): AIAdapter {
  core.info(`Initializing AI provider: ${provider}${model ? ` (model: ${model})` : ''}`)

  switch (provider) {
    case 'anthropic':
      return new AnthropicAdapter(apiKey, model)

    case 'openai':
      return new OpenAIAdapter(apiKey, model)

    case 'github-models':
      // apiKey is the GITHUB_TOKEN here — no extra secrets needed for orgs with Copilot
      return new GitHubModelsAdapter(apiKey, model)

    case 'azure-openai': {
      const endpoint = process.env.AZURE_OPENAI_ENDPOINT
      const deployment = process.env.AZURE_OPENAI_DEPLOYMENT ?? model ?? 'gpt-4o'
      const apiVersion = process.env.AZURE_OPENAI_API_VERSION
      if (!endpoint) throw new Error('AZURE_OPENAI_ENDPOINT env var required for azure-openai provider')
      return new AzureOpenAIAdapter(apiKey, endpoint, deployment, apiVersion)
    }

    case 'ollama': {
      const baseURL = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434'
      return new OllamaAdapter(baseURL, model)
    }

    default:
      throw new Error(`Unknown AI provider: ${provider as string}`)
  }
}

export { AnthropicAdapter, OpenAIAdapter, GitHubModelsAdapter, AzureOpenAIAdapter, OllamaAdapter }
