import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const engine = join(homedir(), '.impeccable/bin/0.1.17/impeccable');
const uiFile = /\.(?:astro|css|scss|sass|less|html|jsx|tsx|vue|svelte|js|ts)$/i;

// Native omp post-edit adapter. The installed engine owns config, filtering and deduplication.
export default function impeccable(pi) {
  const sessionId = randomUUID();
  pi.on('tool_result', async (event, ctx) => {
    if (event.isError || !['edit', 'write', 'ast_edit'].includes(event.toolName)) return;
    const input = event.input;
    const paths = Array.isArray(input.paths) ? input.paths : [input.path ?? input.file];
    const messages = [];
    for (const path of new Set(paths)) {
      if (typeof path !== 'string' || path.includes('://') || !uiFile.test(path)) continue;
      try {
        const job = run(engine, ['hook'], { cwd: ctx.cwd, timeout: 10000, maxBuffer: 65536 });
        job.child.stdin.end(JSON.stringify({
          hook_event_name: 'PostToolUse', session_id: sessionId, cwd: ctx.cwd,
          tool_name: 'Edit', tool_input: { file_path: path },
        }));
        const { stdout } = await job;
        if (stdout.trim()) {
          const result = JSON.parse(stdout);
          const message = result.hookSpecificOutput?.additionalContext ?? result.systemMessage;
          if (message) messages.push(message);
        }
      } catch (error) {
        messages.push(`Impeccable could not check ${path}: ${error.message}`);
      }
    }
    // Detector output stays tool data, not higher-priority instructions. Never block or rewrite an edit.
    if (messages.length) return { content: [...event.content, { type: 'text', text: messages.join('\n\n') }] };
  });
}
