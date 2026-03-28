const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI = null;
let model = null;

function getModel() {
  if (model) return model;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return null;
  }
  genAI = new GoogleGenerativeAI(apiKey);
  model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  return model;
}

// Generate a fix suggestion for a doc issue by analyzing actual file contents
async function generateDocFix(issue, docContent, codeContent, packageJson) {
  const ai = getModel();
  if (!ai) {
    return generateFallbackFix(issue, docContent, codeContent, packageJson);
  }

  try {
    const prompt = buildPrompt(issue, docContent, codeContent, packageJson);
    const result = await ai.generateContent(prompt);
    const text = result.response.text();
    return parseAIResponse(text, issue);
  } catch (err) {
    console.error('Gemini API error:', err.message);
    return generateFallbackFix(issue, docContent, codeContent, packageJson);
  }
}

function buildPrompt(issue, docContent, codeContent, packageJson) {
  let prompt = `You are a senior developer reviewing documentation for a GitHub repository.

ISSUE DETECTED:
- Type: ${issue.type}
- Severity: ${issue.severity}
- Title: ${issue.title}
- Description: ${issue.description}
- File: ${issue.file || 'N/A'}
- Related Code: ${issue.relatedCode || 'N/A'}
`;

  if (docContent) {
    prompt += `\nCURRENT DOCUMENTATION CONTENT (${issue.file}):\n\`\`\`\n${docContent.slice(0, 3000)}\n\`\`\`\n`;
  }

  if (codeContent) {
    prompt += `\nRELATED CODE FILE CONTENT:\n\`\`\`\n${codeContent.slice(0, 3000)}\n\`\`\`\n`;
  }

  if (packageJson) {
    prompt += `\npackage.json (partial):\n\`\`\`json\n${packageJson.slice(0, 1500)}\n\`\`\`\n`;
  }

  prompt += `
TASK: Provide a concrete fix for this documentation issue.

Respond in this exact JSON format:
{
  "summary": "One-line description of what needs to change",
  "fixType": "update|create|rewrite|add_section",
  "changes": [
    {
      "action": "replace|add|remove",
      "description": "What to change",
      "oldContent": "existing text to find (if replacing, keep short)",
      "newContent": "the corrected/new text"
    }
  ],
  "updatedDoc": "The full updated documentation content (if creating or rewriting)",
  "reasoning": "Why this fix is needed"
}

IMPORTANT:
- If docs reference outdated versions, update them to match package.json
- If docs reference functions/APIs that no longer exist in code, remove or update those sections
- If docs are missing for code endpoints, generate documentation for them
- Keep the original formatting style
- Be specific with changes — show exact text to find and replace
- For "updatedDoc", only include if creating a new file or doing a full rewrite
- Return ONLY the JSON, no markdown fences`;

  return prompt;
}

function parseAIResponse(text, issue) {
  try {
    // Strip markdown code fences if present
    let cleaned = text.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }
    const parsed = JSON.parse(cleaned);
    return {
      issueId: issue._id,
      issueTitle: issue.title,
      issueType: issue.type,
      severity: issue.severity,
      file: issue.file,
      ...parsed,
      source: 'gemini',
    };
  } catch {
    // If JSON parsing fails, return the raw text as a suggestion
    return {
      issueId: issue._id,
      issueTitle: issue.title,
      issueType: issue.type,
      severity: issue.severity,
      file: issue.file,
      summary: 'AI-generated fix suggestion',
      fixType: 'update',
      changes: [],
      reasoning: text.slice(0, 2000),
      source: 'gemini',
    };
  }
}

// Fallback when Gemini is not available — rule-based fixes
function generateFallbackFix(issue, docContent, codeContent, packageJson) {
  const fix = {
    issueId: issue._id,
    issueTitle: issue.title,
    issueType: issue.type,
    severity: issue.severity,
    file: issue.file,
    source: 'rule-based',
    changes: [],
  };

  switch (issue.type) {
    case 'missing': {
      if (issue.title.includes('README')) {
        const projectName = issue.repoName?.split('/').pop() || 'Project';
        let deps = '';
        if (packageJson) {
          try {
            const pkg = JSON.parse(packageJson);
            deps = Object.keys(pkg.dependencies || {}).slice(0, 8).map(d => `- ${d}`).join('\n');
          } catch {}
        }
        fix.summary = 'Create a README.md with project overview, setup, and usage';
        fix.fixType = 'create';
        fix.updatedDoc = `# ${projectName}

## Overview
A brief description of what this project does.

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm or yarn

### Installation
\`\`\`bash
git clone https://github.com/${issue.repoName || 'owner/repo'}.git
cd ${projectName.toLowerCase()}
npm install
\`\`\`

### Running
\`\`\`bash
npm start
\`\`\`

${deps ? `## Dependencies\n${deps}\n` : ''}
## Contributing
Pull requests are welcome. For major changes, please open an issue first.

## License
[MIT](LICENSE)
`;
        fix.reasoning = 'Every repository needs a README.md for developer onboarding. This template includes essential sections.';
      } else if (issue.relatedCode) {
        fix.summary = `Create API documentation for endpoints in ${issue.file}`;
        fix.fixType = 'create';
        const routes = issue.relatedCode.split(', ');
        fix.updatedDoc = `# API Documentation\n\n${routes.map(r => {
          const [method, path] = r.split(' ');
          return `## ${method} ${path}\n\n**Description:** TODO\n\n**Request:**\n\`\`\`json\n{}\n\`\`\`\n\n**Response:**\n\`\`\`json\n{}\n\`\`\`\n`;
        }).join('\n')}`;
        fix.reasoning = `Found ${routes.length} undocumented API endpoint(s). Documentation is essential for API consumers.`;
      } else {
        fix.summary = `Create ${issue.title.replace('Missing ', '')}`;
        fix.fixType = 'create';
        fix.reasoning = 'This file is expected but missing from the repository.';
      }
      break;
    }

    case 'stale':
    case 'outdated': {
      fix.summary = `Review and update stale documentation: ${issue.file}`;
      fix.fixType = 'update';
      fix.reasoning = `${issue.description} Documentation should be reviewed and updated to reflect current state of the project.`;

      // Check for version mismatches with package.json
      if (docContent && packageJson) {
        try {
          const pkg = JSON.parse(packageJson);
          const versionMatches = docContent.match(/(\d+\.\d+\.\d+)/g) || [];
          const changes = [];

          // Check if doc references old project version
          if (pkg.version && !docContent.includes(pkg.version)) {
            const oldVersion = versionMatches.find(v => v !== pkg.version);
            if (oldVersion) {
              changes.push({
                action: 'replace',
                description: `Update project version from ${oldVersion} to ${pkg.version}`,
                oldContent: oldVersion,
                newContent: pkg.version,
              });
            }
          }

          // Check for outdated dependency versions mentioned in docs
          const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
          for (const [dep, ver] of Object.entries(allDeps)) {
            const cleanVer = ver.replace(/^[\^~>=<]/, '');
            if (docContent.includes(dep)) {
              const oldVerMatch = docContent.match(new RegExp(`${dep}[\\s@:]+([\\d.]+)`));
              if (oldVerMatch && oldVerMatch[1] !== cleanVer) {
                changes.push({
                  action: 'replace',
                  description: `Update ${dep} version reference from ${oldVerMatch[1]} to ${cleanVer}`,
                  oldContent: `${dep}${oldVerMatch[0].slice(dep.length)}`,
                  newContent: `${dep}@${cleanVer}`,
                });
              }
            }
          }

          if (changes.length > 0) {
            fix.changes = changes;
            fix.summary = `Update ${changes.length} version reference(s) in ${issue.file}`;
          }
        } catch {}
      }

      // If no specific changes found, provide general guidance
      if (fix.changes.length === 0) {
        fix.changes = [{
          action: 'add',
          description: 'Add last-reviewed timestamp',
          newContent: `\n\n---\n*Last reviewed: ${new Date().toISOString().slice(0, 10)}*\n`,
        }];
      }
      break;
    }

    case 'mismatch': {
      fix.summary = `Add documentation for ${issue.relatedCode}`;
      fix.fixType = 'add_section';
      const [method, path] = (issue.relatedCode || 'GET /unknown').split(' ');
      fix.changes = [{
        action: 'add',
        description: `Add API documentation for ${method} ${path}`,
        newContent: `\n## ${method} ${path}\n\n**Description:** TODO - describe this endpoint\n\n**Parameters:** TODO\n\n**Response:**\n\`\`\`json\n// TODO: add response example\n\`\`\`\n`,
      }];
      fix.reasoning = `Endpoint "${method} ${path}" exists in code (${issue.file}) but is not documented. This creates drift between code and docs.`;
      break;
    }

    default: {
      fix.summary = 'Review this documentation issue';
      fix.fixType = 'update';
      fix.reasoning = issue.description;
    }
  }

  return fix;
}

module.exports = { generateDocFix };
