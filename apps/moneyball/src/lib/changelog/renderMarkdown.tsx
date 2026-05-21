import { Fragment, type ReactNode } from 'react';

// Minimal markdown renderer for CHANGELOG body. Handles:
// - ### h3
// - - bullet (multi-level via leading spaces)
// - **bold**, *italic*, `code`, [link](url)
// - --- horizontal rule
// - blank line = paragraph break

const INLINE_REGEX =
  /(\*\*[^*\n]+\*\*|`[^`\n]+`|\[[^\]\n]+\]\([^)\n]+\)|\*[^*\n]+\*)/g;

function renderInline(text: string): ReactNode[] {
  const parts = text.split(INLINE_REGEX);
  return parts.map((part, i) => {
    if (!part) return null;
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="text-brand-900 dark:text-white font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 rounded bg-brand-100 dark:bg-brand-800 text-brand-700 dark:text-brand-200 text-[0.85em] font-mono"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const [, label, href] = linkMatch;
      const isExternal = /^https?:\/\//.test(href);
      return (
        <a
          key={i}
          href={href}
          {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          className="text-brand-600 dark:text-brand-300 hover:text-brand-700 dark:hover:text-brand-100 underline decoration-brand-400/40 hover:decoration-brand-500 transition-colors"
        >
          {label}
        </a>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
      return (
        <em key={i} className="italic text-brand-700 dark:text-brand-200">
          {part.slice(1, -1)}
        </em>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

export interface Block {
  kind: 'h3' | 'p' | 'ul' | 'hr';
  lines?: string[];
  items?: { text: string; depth: number }[];
}

export function tokenize(body: string): Block[] {
  const blocks: Block[] = [];
  const lines = body.split('\n');
  let para: string[] = [];
  let bullets: { text: string; depth: number }[] = [];

  const flushPara = () => {
    if (para.length > 0) {
      blocks.push({ kind: 'p', lines: [...para] });
      para = [];
    }
  };
  const flushBullets = () => {
    if (bullets.length > 0) {
      blocks.push({ kind: 'ul', items: [...bullets] });
      bullets = [];
    }
  };

  for (const raw of lines) {
    if (/^---+\s*$/.test(raw)) {
      flushPara();
      flushBullets();
      blocks.push({ kind: 'hr' });
      continue;
    }
    if (raw.startsWith('### ')) {
      flushPara();
      flushBullets();
      blocks.push({ kind: 'h3', lines: [raw.slice(4).trim()] });
      continue;
    }
    const bulletMatch = raw.match(/^(\s*)-\s+(.+)$/);
    if (bulletMatch) {
      flushPara();
      const depth = Math.floor(bulletMatch[1].length / 2);
      bullets.push({ text: bulletMatch[2], depth });
      continue;
    }
    if (raw.trim() === '') {
      flushPara();
      flushBullets();
      continue;
    }
    flushBullets();
    para.push(raw);
  }
  flushPara();
  flushBullets();
  return blocks;
}

export function renderChangelogBody(body: string): ReactNode {
  const blocks = tokenize(body);
  return (
    <div className="space-y-4 text-sm text-brand-800 dark:text-brand-200 leading-relaxed">
      {blocks.map((block, i) => {
        if (block.kind === 'hr') {
          return <hr key={i} className="border-brand-200 dark:border-brand-800" />;
        }
        if (block.kind === 'h3') {
          return (
            <h3
              key={i}
              className="text-base font-semibold text-brand-900 dark:text-white pt-2"
            >
              {renderInline(block.lines![0])}
            </h3>
          );
        }
        if (block.kind === 'p') {
          return (
            <p key={i}>
              {renderInline(block.lines!.join(' '))}
            </p>
          );
        }
        if (block.kind === 'ul') {
          return (
            <ul key={i} className="space-y-1.5 list-disc pl-5 marker:text-brand-400">
              {block.items!.map((item, j) => (
                <li
                  key={j}
                  style={{ marginLeft: item.depth > 0 ? item.depth * 12 : 0 }}
                >
                  {renderInline(item.text)}
                </li>
              ))}
            </ul>
          );
        }
        return null;
      })}
    </div>
  );
}
