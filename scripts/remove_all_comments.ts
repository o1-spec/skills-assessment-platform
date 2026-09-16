import fs from 'fs';
import path from 'path';
import ts from 'typescript';

function isPreservedComment(text: string): boolean {
  return (
    text.includes('eslint-disable') ||
    text.includes('eslint-enable') ||
    text.includes('@ts-') ||
    text.includes('/// <reference') ||
    text.includes('@type')
  );
}

function stripCommentsFromFile(filePath: string): { changed: boolean; count: number } {
  const source = fs.readFileSync(filePath, 'utf8');
  const isTsx = filePath.endsWith('.tsx') || filePath.endsWith('.jsx');

  const sf = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    isTsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );

  const ranges: { start: number; end: number; text: string }[] = [];

  function collectFromOffset(pos: number) {
    const leading = ts.getLeadingCommentRanges(source, pos);
    if (leading) {
      for (const r of leading) {
        const text = source.slice(r.pos, r.end);
        if (!isPreservedComment(text)) {
          ranges.push({ start: r.pos, end: r.end, text });
        }
      }
    }
    const trailing = ts.getTrailingCommentRanges(source, pos);
    if (trailing) {
      for (const r of trailing) {
        const text = source.slice(r.pos, r.end);
        if (!isPreservedComment(text)) {
          ranges.push({ start: r.pos, end: r.end, text });
        }
      }
    }
  }

  // Check start of file
  collectFromOffset(0);

  function visit(node: ts.Node) {
    // 1. JSX comment expression: {/* comment */}
    if (ts.isJsxExpression(node) && !node.expression) {
      let start = node.getFullStart();
      let end = node.getEnd();

      // Expand start to consume leading whitespace on the same line if it's the only thing on that line
      const lineStart = source.lastIndexOf('\n', start - 1);
      const prefix = source.slice(lineStart === -1 ? 0 : lineStart + 1, start);
      if (/^[ \t]*$/.test(prefix)) {
        start = lineStart === -1 ? 0 : lineStart + 1;
        // Also consume trailing newline if present
        if (source[end] === '\r' && source[end + 1] === '\n') {
          end += 2;
        } else if (source[end] === '\n') {
          end += 1;
        }
      }

      const text = source.slice(start, end);
      if (!isPreservedComment(text)) {
        ranges.push({ start, end, text });
        return;
      }
    }

    collectFromOffset(node.getFullStart());
    collectFromOffset(node.getEnd());

    ts.forEachChild(node, visit);
  }

  visit(sf);

  if (ranges.length === 0) {
    return { changed: false, count: 0 };
  }

  // Deduplicate and sort descending by start
  const uniqueRanges = Array.from(
    new Map(ranges.map((r) => [`${r.start}-${r.end}`, r])).values()
  ).sort((a, b) => b.start - a.start);

  let updated = source;
  for (const r of uniqueRanges) {
    // Check if the comment was on its own line
    const before = updated.slice(0, r.start);
    const after = updated.slice(r.end);
    const lastNewlineBefore = before.lastIndexOf('\n');
    const firstNewlineAfter = after.indexOf('\n');
    const linePrefix = lastNewlineBefore === -1 ? before : before.slice(lastNewlineBefore + 1);
    const lineSuffix = firstNewlineAfter === -1 ? after : after.slice(0, firstNewlineAfter);

    if (/^[ \t]*$/.test(linePrefix) && /^[ \t\r]*$/.test(lineSuffix)) {
      // Entire line was just this comment - remove the entire line including the newline
      const cutStart = lastNewlineBefore === -1 ? 0 : lastNewlineBefore + 1;
      const cutEnd = firstNewlineAfter === -1 ? updated.length : r.end + firstNewlineAfter + 1;
      updated = updated.slice(0, cutStart) + updated.slice(cutEnd);
    } else {
      updated = before + after;
    }
  }

  // Clean trailing spaces and excessive blank lines
  updated = updated
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n');

  if (updated !== source) {
    fs.writeFileSync(filePath, updated, 'utf8');
    return { changed: true, count: uniqueRanges.length };
  }

  return { changed: false, count: 0 };
}

function walkDir(dir: string, fileList: string[] = []): string[] {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (item !== 'node_modules' && item !== '.next' && item !== '.git') {
        walkDir(fullPath, fileList);
      }
    } else if (stat.isFile()) {
      if (
        (item.endsWith('.ts') || item.endsWith('.tsx') || item.endsWith('.js') || item.endsWith('.jsx')) &&
        !item.endsWith('.d.ts')
      ) {
        fileList.push(fullPath);
      }
    }
  }
  return fileList;
}

function run() {
  const targetDirs = process.argv.slice(2);
  const dirsToScan = targetDirs.length > 0 ? targetDirs : ['src/components', 'src/app', 'src/actions', 'src/services', 'src/lib'];

  console.log('🚀 Stripping comments from application files in:', dirsToScan.join(', '), '\n');

  let totalFilesChecked = 0;
  let totalFilesModified = 0;
  let totalCommentsRemoved = 0;

  for (const targetDir of dirsToScan) {
    const fullDirPath = path.resolve(process.cwd(), targetDir);
    if (!fs.existsSync(fullDirPath)) {
      console.warn(`⚠️ Directory not found: ${targetDir}`);
      continue;
    }

    const files = walkDir(fullDirPath);
    for (const file of files) {
      totalFilesChecked++;
      const relativePath = path.relative(process.cwd(), file);
      const result = stripCommentsFromFile(file);
      if (result.changed) {
        totalFilesModified++;
        totalCommentsRemoved += result.count;
        console.log(`  ✓ Cleaned ${result.count} comment(s) in ${relativePath}`);
      }
    }
  }

  console.log('\n========================================');
  console.log(`Files scanned:  ${totalFilesChecked}`);
  console.log(`Files modified: ${totalFilesModified}`);
  console.log(`Comments purged: ${totalCommentsRemoved}`);
  console.log('========================================\n');
}

run();
