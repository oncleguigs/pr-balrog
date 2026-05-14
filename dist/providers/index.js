"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.OllamaAdapter = exports.AzureOpenAIAdapter = exports.GitHubModelsAdapter = exports.OpenAIAdapter = exports.AnthropicAdapter = void 0;
exports.createProvider = createProvider;
const core = __importStar(require("@actions/core"));
const anthropic_1 = require("./anthropic");
Object.defineProperty(exports, "AnthropicAdapter", { enumerable: true, get: function () { return anthropic_1.AnthropicAdapter; } });
const openai_1 = require("./openai");
Object.defineProperty(exports, "OpenAIAdapter", { enumerable: true, get: function () { return openai_1.OpenAIAdapter; } });
Object.defineProperty(exports, "GitHubModelsAdapter", { enumerable: true, get: function () { return openai_1.GitHubModelsAdapter; } });
Object.defineProperty(exports, "AzureOpenAIAdapter", { enumerable: true, get: function () { return openai_1.AzureOpenAIAdapter; } });
const ollama_1 = require("./ollama");
Object.defineProperty(exports, "OllamaAdapter", { enumerable: true, get: function () { return ollama_1.OllamaAdapter; } });
function createProvider(provider, apiKey, model) {
    core.info(`Initializing AI provider: ${provider}${model ? ` (model: ${model})` : ''}`);
    switch (provider) {
        case 'anthropic':
            return new anthropic_1.AnthropicAdapter(apiKey, model);
        case 'openai':
            return new openai_1.OpenAIAdapter(apiKey, model);
        case 'github-models':
            // apiKey is the GITHUB_TOKEN here — no extra secrets needed for orgs with Copilot
            return new openai_1.GitHubModelsAdapter(apiKey, model);
        case 'azure-openai': {
            const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
            const deployment = process.env.AZURE_OPENAI_DEPLOYMENT ?? model ?? 'gpt-4o';
            const apiVersion = process.env.AZURE_OPENAI_API_VERSION;
            if (!endpoint)
                throw new Error('AZURE_OPENAI_ENDPOINT env var required for azure-openai provider');
            return new openai_1.AzureOpenAIAdapter(apiKey, endpoint, deployment, apiVersion);
        }
        case 'ollama': {
            const baseURL = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
            return new ollama_1.OllamaAdapter(baseURL, model);
        }
        default:
            throw new Error(`Unknown AI provider: ${provider}`);
    }
}
//# sourceMappingURL=index.js.map