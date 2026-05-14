import { createProvider } from '../providers'
import { AnthropicAdapter } from '../providers/anthropic'
import { OpenAIAdapter, GitHubModelsAdapter, AzureOpenAIAdapter } from '../providers/openai'
import { OllamaAdapter } from '../providers/ollama'
import type { AIProvider } from '../types'

// createProvider calls core.info — silence it
jest.mock('@actions/core', () => ({ info: jest.fn(), warning: jest.fn(), setFailed: jest.fn() }))

describe('createProvider', () => {
  it('returns AnthropicAdapter for anthropic', () => {
    const adapter = createProvider('anthropic', 'key-123')
    expect(adapter).toBeInstanceOf(AnthropicAdapter)
  })

  it('returns OpenAIAdapter for openai', () => {
    const adapter = createProvider('openai', 'key-123')
    expect(adapter).toBeInstanceOf(OpenAIAdapter)
  })

  it('returns GitHubModelsAdapter for github-models', () => {
    const adapter = createProvider('github-models', 'ghtoken')
    expect(adapter).toBeInstanceOf(GitHubModelsAdapter)
  })

  it('returns AzureOpenAIAdapter for azure-openai', () => {
    process.env.AZURE_OPENAI_ENDPOINT = 'https://my.openai.azure.com'
    const adapter = createProvider('azure-openai', 'key-123')
    expect(adapter).toBeInstanceOf(AzureOpenAIAdapter)
    delete process.env.AZURE_OPENAI_ENDPOINT
  })

  it('throws when azure-openai endpoint is missing', () => {
    delete process.env.AZURE_OPENAI_ENDPOINT
    expect(() => createProvider('azure-openai', 'key')).toThrow('AZURE_OPENAI_ENDPOINT')
  })

  it('returns OllamaAdapter for ollama', () => {
    const adapter = createProvider('ollama', '')
    expect(adapter).toBeInstanceOf(OllamaAdapter)
  })

  it('throws for unknown provider', () => {
    expect(() => createProvider('unknown' as AIProvider, 'key')).toThrow('Unknown AI provider')
  })

  it('passes model override to adapter', () => {
    // AnthropicAdapter stores the model — access via cast to verify it lands
    const adapter = createProvider('anthropic', 'key', 'claude-opus-4-7') as AnthropicAdapter
    // @ts-expect-error accessing private field for test
    expect(adapter.model).toBe('claude-opus-4-7')
  })
})
