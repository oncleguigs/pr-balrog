import { buildSystemPrompt, buildUserPrompt } from '../providers/prompt'

describe('buildSystemPrompt', () => {
  it('mentions code review and WHY', () => {
    const prompt = buildSystemPrompt()
    expect(prompt).toContain('WHY')
    expect(prompt).toContain('trade-offs')
  })
})

describe('buildUserPrompt', () => {
  const diff = 'diff --git a/foo.ts b/foo.ts\n+const x = 1'

  it('includes the diff', () => {
    const prompt = buildUserPrompt(diff, 3, 'en')
    expect(prompt).toContain(diff)
  })

  it('sets the correct question count', () => {
    expect(buildUserPrompt(diff, 3, 'en')).toContain('exactly 3')
    expect(buildUserPrompt(diff, 5, 'en')).toContain('exactly 5')
    expect(buildUserPrompt(diff, 10, 'en')).toContain('exactly 10')
  })

  it('injects language when not auto', () => {
    const prompt = buildUserPrompt(diff, 3, 'fr')
    expect(prompt).toContain('fr')
    expect(prompt).not.toContain('Default to English')
  })

  it('asks to detect language when auto', () => {
    const prompt = buildUserPrompt(diff, 3, 'auto')
    expect(prompt).toContain('Default to English')
  })

  it('appends additional-prompt when provided', () => {
    const extra = 'Focus on security and input validation.'
    const prompt = buildUserPrompt(diff, 3, 'en', extra)
    expect(prompt).toContain('Additional instructions:')
    expect(prompt).toContain(extra)
  })

  it('omits additional-prompt section when not provided', () => {
    const prompt = buildUserPrompt(diff, 3, 'en')
    expect(prompt).not.toContain('Additional instructions:')
  })

  it('omits additional-prompt section when empty string', () => {
    const prompt = buildUserPrompt(diff, 3, 'en', '')
    expect(prompt).not.toContain('Additional instructions:')
  })

  it('truncates very long diffs to 28000 chars', () => {
    const longDiff = 'x'.repeat(40000)
    const prompt = buildUserPrompt(longDiff, 3, 'en')
    expect(prompt).toContain('x'.repeat(28000))
    expect(prompt).not.toContain('x'.repeat(28001))
  })
})
