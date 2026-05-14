"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pickQuizSize = pickQuizSize;
exports.generateQuizId = generateQuizId;
exports.buildQuiz = buildQuiz;
exports.evaluateQuiz = evaluateQuiz;
exports.renderQuizComment = renderQuizComment;
exports.renderResultComment = renderResultComment;
exports.parseAnswerComment = parseAnswerComment;
const crypto_1 = __importDefault(require("crypto"));
function pickQuizSize(changedLines, override) {
    if (override === '3')
        return 3;
    if (override === '5')
        return 5;
    if (override === '10')
        return 10;
    if (changedLines < 100)
        return 3;
    if (changedLines <= 500)
        return 5;
    return 10;
}
function generateQuizId() {
    return crypto_1.default.randomBytes(8).toString('hex');
}
function buildQuiz(questions, prNumber, headSha, passThreshold, maxAttempts) {
    return {
        id: generateQuizId(),
        prNumber,
        prHeadSha: headSha,
        generatedAt: new Date().toISOString(),
        questions,
        passThreshold,
        maxAttempts,
        attemptsUsed: 0,
        passed: false,
    };
}
function evaluateQuiz(quiz, answers) {
    const perQuestion = quiz.questions.map((q) => {
        const submitted = (answers[String(q.id)] ?? []).map((a) => a.toUpperCase()).sort();
        const correct = [...q.correct].sort();
        const isCorrect = submitted.length === correct.length && submitted.every((a, i) => a === correct[i]);
        return {
            questionId: q.id,
            submitted,
            correct,
            isCorrect,
            explanation: q.explanation,
        };
    });
    const correctCount = perQuestion.filter((r) => r.isCorrect).length;
    const score = Math.round((correctCount / quiz.questions.length) * 100);
    const passed = score >= quiz.passThreshold;
    return { quiz, answers, score, passed, perQuestion };
}
// ---------------------------------------------------------------------------
// Comment rendering helpers
// ---------------------------------------------------------------------------
function scoreBar(score, width = 10) {
    const filled = Math.round((score / 100) * width);
    return '█'.repeat(filled) + '░'.repeat(width - filled);
}
function attemptsLabel(used, max, isFr) {
    if (max === 0)
        return isFr ? 'tentatives illimitées' : 'unlimited attempts';
    const left = max - used;
    return isFr ? `${left} tentative${left > 1 ? 's' : ''} restante${left > 1 ? 's' : ''}` : `${left} attempt${left !== 1 ? 's' : ''} left`;
}
// ---------------------------------------------------------------------------
// Quiz comment
// ---------------------------------------------------------------------------
function renderQuizComment(quiz, language = 'en') {
    const isFr = language.startsWith('fr');
    const n = quiz.questions.length;
    const maxLabel = quiz.maxAttempts === 0 ? '∞' : String(quiz.maxAttempts);
    const t = {
        title: isFr ? `🔥 PR Balrog — ${n} question${n > 1 ? 's' : ''} avant le merge` : `🔥 PR Balrog — ${n} question${n > 1 ? 's' : ''} before merge`,
        subtitle: isFr ? '> **You shall not pass** — prouve que tu comprends tes propres changements.' : '> **You shall not pass** — prove you understand your own changes.',
        threshold: isFr ? 'Seuil' : 'Threshold',
        attempts: isFr ? 'Tentatives' : 'Attempts',
        howto: isFr ? '**Comment répondre :**' : '**How to answer:**',
        multi: isFr ? '*(plusieurs réponses)*' : '*(multiple answers)*',
        retry: isFr ? 'Plus de tentatives ? Tapez `!balrog retry`.' : 'Out of attempts? Type `!balrog retry`.',
    };
    const exampleAnswers = quiz.questions.map((_, i) => `${i + 1}:A`).join(' ');
    const lines = [
        `## ${t.title}`,
        '',
        t.subtitle,
        '',
        `| ${t.threshold} | ${t.attempts} | Questions |`,
        `|:---:|:---:|:---:|`,
        `| **${quiz.passThreshold}%** | **${maxLabel}** | **${n}** |`,
        '',
        `${t.howto} Reply with \`!balrog ${exampleAnswers}\` — separate multiple answers with a comma.`,
        `<sub>${t.retry}</sub>`,
        '',
        '---',
        '',
    ];
    for (const q of quiz.questions) {
        const multiTag = q.multi ? ` — ${t.multi}` : '';
        lines.push(`### ${q.id}. ${q.text}${multiTag}`);
        lines.push('');
        lines.push('| | |');
        lines.push('|:---:|:---|');
        lines.push(`| **A** | ${q.options[0]} |`);
        lines.push(`| **B** | ${q.options[1]} |`);
        lines.push(`| **C** | ${q.options[2]} |`);
        lines.push('');
    }
    lines.push(`<!-- balrog-quiz-id: ${quiz.id} -->`);
    return lines.join('\n');
}
// ---------------------------------------------------------------------------
// Result comment
// ---------------------------------------------------------------------------
function renderResultComment(result, language = 'en') {
    const isFr = language.startsWith('fr');
    const { score, passed, perQuestion, quiz } = result;
    const correctCount = perQuestion.filter((r) => r.isCorrect).length;
    const total = quiz.questions.length;
    const bar = scoreBar(score);
    const attLeft = attemptsLabel(quiz.attemptsUsed, quiz.maxAttempts, isFr);
    const lines = [];
    if (passed) {
        lines.push(isFr
            ? `## ✅ Quiz réussi — vous pouvez merger !`
            : `## ✅ Quiz passed — you may merge!`);
        lines.push('');
        lines.push(`\`${bar}\` **${score}%** — ${correctCount}/${total} ${isFr ? 'correcte(s)' : 'correct'}`);
        lines.push('');
    }
    else {
        lines.push(isFr
            ? `## ❌ Quiz échoué`
            : `## ❌ Quiz failed`);
        lines.push('');
        lines.push(`\`${bar}\` **${score}%** — ${correctCount}/${total} ${isFr ? 'correcte(s)' : 'correct'} · ${attLeft}`);
        lines.push('');
    }
    lines.push('---');
    lines.push('');
    for (const r of perQuestion) {
        const q = quiz.questions.find((q) => q.id === r.questionId);
        const submitted = r.submitted.length ? r.submitted.join(', ') : '—';
        const submittedKbd = r.submitted.map((l) => `<kbd>${l}</kbd>`).join(' ');
        if (r.isCorrect) {
            lines.push(`✅ **${r.questionId}.** ${q.text}`);
        }
        else {
            lines.push(`❌ **${r.questionId}.** ${q.text}`);
            lines.push(`> ↳ You answered ${submittedKbd || '—'}`);
            lines.push(`> 💡 ${r.explanation}`);
        }
        lines.push('');
    }
    if (!passed && quiz.maxAttempts > 0 && quiz.attemptsUsed >= quiz.maxAttempts) {
        lines.push('---');
        lines.push('');
        lines.push(isFr
            ? '> 🔒 Plus de tentatives — tapez `!balrog retry` ou poussez un commit pour obtenir un nouveau quiz.'
            : '> 🔒 No attempts left — type `!balrog retry` or push a commit to get a fresh quiz.');
    }
    return lines.join('\n');
}
// ---------------------------------------------------------------------------
// Answer parsing
// ---------------------------------------------------------------------------
const ANSWER_REGEX = /!balrog\s+((?:\d+:[A-Ca-c](?:,[A-Ca-c])*\s*)+)/i;
function parseAnswerComment(body) {
    const match = body.match(ANSWER_REGEX);
    if (!match)
        return null;
    const answers = {};
    const pairs = match[1].trim().split(/\s+/);
    for (const pair of pairs) {
        const [qNum, rawAnswers] = pair.split(':');
        if (!qNum || !rawAnswers)
            return null;
        const letters = rawAnswers.split(',').map((l) => l.toUpperCase());
        const valid = letters.every((l) => ['A', 'B', 'C'].includes(l));
        if (!valid)
            return null;
        answers[qNum] = letters;
    }
    return Object.keys(answers).length > 0 ? answers : null;
}
//# sourceMappingURL=quiz.js.map