import * as core from '@actions/core'
import * as github from '@actions/github'
import type { AIProvider, QuizSize } from './types'
import { pickQuizSize, buildQuiz, renderQuizComment } from './quiz'
import {
  fetchFilteredDiff,
  createPendingCheck,
  postComment,
  saveQuizArtifact,
} from './github'
import { createProvider } from './providers'

async function run(): Promise<void> {
  const token = core.getInput('github-token', { required: true })
  const provider = core.getInput('ai-provider') as AIProvider
  const apiKey = core.getInput('api-key') || token // github-models falls back to GITHUB_TOKEN
  const model = core.getInput('model') || undefined
  const passThreshold = parseInt(core.getInput('pass-threshold') || '80', 10)
  const maxAttempts = parseInt(core.getInput('max-attempts') || '3', 10)
  const quizSizeOverride = core.getInput('quiz-size') || 'auto'
  const minLines = parseInt(core.getInput('min-lines-threshold') || '10', 10)
  const excludeRaw = core.getInput('exclude-patterns') || '*.lock,*.min.js,*-lock.json,*.snap'
  const language = core.getInput('language') || 'auto'
  const additionalPrompt = core.getInput('additional-prompt') || undefined

  const excludePatterns = excludeRaw
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)

  const prNumberOverride = core.getInput('pr-number-override') || ''

  const octokit = github.getOctokit(token)
  const { payload, repo } = github.context
  const eventName = github.context.eventName

  // Support workflow_dispatch (!balrog retry) — look up the PR via the API
  let ctx: { owner: string; repo: string; prNumber: number; headSha: string; authorLogin: string }

  if (eventName === 'workflow_dispatch' || prNumberOverride) {
    const prNumber = parseInt(prNumberOverride || String(payload.inputs?.pr_number), 10)
    if (!prNumber) {
      core.setFailed('pr-number-override is required for workflow_dispatch events')
      return
    }
    core.info(`Triggered via workflow_dispatch for PR #${prNumber}`)
    const { data: prData } = await octokit.rest.pulls.get({
      owner: repo.owner,
      repo: repo.repo,
      pull_number: prNumber,
    })
    ctx = {
      owner: repo.owner,
      repo: repo.repo,
      prNumber,
      headSha: prData.head.sha,
      authorLogin: prData.user?.login ?? '',
    }
  } else {
    const pr = payload.pull_request
    if (!pr) {
      core.setFailed('This action must be triggered by a pull_request or workflow_dispatch event')
      return
    }
    ctx = {
      owner: repo.owner,
      repo: repo.repo,
      prNumber: pr.number as number,
      headSha: (pr.head as { sha: string }).sha,
      authorLogin: (pr.user as { login: string }).login,
    }
  }

  core.info(`PR #${ctx.prNumber} by @${ctx.authorLogin} — head: ${ctx.headSha}`)

  // Skip PRs from external forks (they don't have write access to create checks)
  const prPayload = payload.pull_request
  const headRepoFullName = prPayload
    ? (prPayload.head as { repo: { full_name: string } }).repo?.full_name
    : null
  if (headRepoFullName && headRepoFullName !== `${repo.owner}/${repo.repo}`) {
    core.info('Skipping: external fork PR — quiz not required for external contributors')
    return
  }

  // Fetch and filter diff
  const { diff, changedLines } = await fetchFilteredDiff(octokit, ctx, excludePatterns)
  core.info(`Changed lines after filtering: ${changedLines}`)

  if (changedLines < minLines) {
    core.info(`Skipping: only ${changedLines} lines changed (min: ${minLines})`)
    return
  }

  // Determine quiz size
  const numQuestions = pickQuizSize(changedLines, quizSizeOverride) as QuizSize

  core.info(`Generating ${numQuestions}-question quiz via ${provider}`)

  // Generate quiz
  const adapter = createProvider(provider, apiKey, model)
  const questions = await adapter.generateQuiz({ diff, numQuestions, language, additionalPrompt })

  // Persist quiz + correct answers as artifact (author can't see this)
  const quiz = buildQuiz(questions, ctx.prNumber, ctx.headSha, passThreshold, maxAttempts)
  await saveQuizArtifact(quiz)

  // Post quiz comment (without correct answers)
  const commentBody = renderQuizComment(quiz, language === 'auto' ? 'en' : language)
  const commentId = await postComment(octokit, ctx, commentBody)
  core.info(`Posted quiz comment #${commentId}`)

  // Create pending check — this is what blocks the merge
  const checkId = await createPendingCheck(octokit, ctx)
  core.info(`Created pending check #${checkId}`)

  core.setOutput('quiz-id', quiz.id)
  core.setOutput('check-id', String(checkId))
  core.setOutput('comment-id', String(commentId))
  core.setOutput('num-questions', String(numQuestions))
}

run().catch((err: unknown) => {
  core.setFailed(err instanceof Error ? err.message : String(err))
})
