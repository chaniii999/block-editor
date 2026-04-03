#!/usr/bin/env node
/*
 * Copyright: SELab.AI (c) 2025
 */

// monorepo의 여러 패키지에서 공통 ESBuild 옵션을 재사용하기 위해 간단한 빌드 래퍼를 둔다.
// 사용법(예):
//   node ../../scripts/build.mjs node src/node/extension.ts src/node/language-server/main.ts -o ./dist/node --minify
//   node ../../scripts/build.mjs browser src/browser/extension.ts src/browser/language-server/main.ts -o ./dist/browser --sourcemap inline

import { build, context } from 'esbuild';
import path from 'node:path';
import process from 'node:process';
import stdLibBrowser from 'node-stdlib-browser';
import stdLibBrowserPlugin from 'node-stdlib-browser/helpers/esbuild/plugin';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function aliasNodeFetchPlugin() {
  return {
    name: 'alias-node-fetch',
    setup(build) {
      build.onResolve({ filter: /^node-fetch$/ }, () => {
        return { path: path.resolve(__dirname, 'shims/node-fetch-browser.mjs') };
      });
    },
  };
}

function parseArgs(argv) {
  // [주의] 간단 파서: 첫 토큰은 타깃(node|browser), 그 뒤로 -o/--outdir 전까지 entryPoints.
  const ret = {
    target: null,
    entryPoints: [],
    outdir: null,
    flags: {
      minify: false,
      watch: false,
      sourcemap: false, // true | 'inline' | false
    },
  };

  const args = [...argv];
  if (args.length === 0) {
    throw new Error('Usage: build.mjs <node|browser> <entry...> -o <outdir> [--minify] [--sourcemap [inline]] [--watch]');
  }
  ret.target = args.shift();
  if (!['node', 'browser'].includes(ret.target)) {
    throw new Error(`First argument must be 'node' or 'browser', got: ${ret.target}`);
  }

  // entryPoints 수집
  while (args.length > 0 && args[0] !== '-o' && args[0] !== '--outdir') {
    ret.entryPoints.push(args.shift());
  }

  // outdir 처리
  if (args[0] === '-o' || args[0] === '--outdir') {
    args.shift();
    ret.outdir = args.shift() || null;
  }
  if (!ret.outdir) {
    // 기본 outdir: './out' (여러 패키지 스크립트가 outdir 생략 호출함)
    ret.outdir = './out';
  }

  // 플래그 처리
  while (args.length > 0) {
    const tok = args.shift();
    if (tok === '--minify') {
      ret.flags.minify = true;
    } else if (tok === '--watch') {
      ret.flags.watch = true;
    } else if (tok === '--sourcemap') {
      // 값이 뒤따를 수도 있음
      if (args[0] && !args[0].startsWith('-')) {
        const val = args.shift();
        ret.flags.sourcemap = val === 'inline' ? 'inline' : true;
      } else {
        ret.flags.sourcemap = true;
      }
    }
  }

  if (ret.entryPoints.length === 0) {
    throw new Error('At least one entry point is required.');
  }

  return ret;
}

function resolveOutdir(outdir) {
  // 패키지 내부에서 상대 경로를 넘기므로 CWD 기준으로 절대경로화.
  return path.isAbsolute(outdir) ? outdir : path.resolve(process.cwd(), outdir);
}

function getEsbuildOptions(parsed) {
  const isNode = parsed.target === 'node';
  const nodeEnv = process.env.NODE_ENV || (parsed.flags.minify ? 'production' : 'development');

  /** @type {import('esbuild').BuildOptions} */
  const base = {
    entryPoints: parsed.entryPoints,
    outdir: resolveOutdir(parsed.outdir),
    bundle: true,
    platform: isNode ? 'node' : 'browser',
    format: isNode ? 'cjs' : 'esm',
    target: isNode ? 'node16' : 'es2020',
    sourcemap: parsed.flags.sourcemap,
    minify: parsed.flags.minify,
    treeShaking: true,
    logLevel: 'info',
    define: {
      'process.env.NODE_ENV': JSON.stringify(nodeEnv),
    },
    // 파일명 유지(엔트리 기준)하여 VS Code 확장이 기대하는 출력 구조 보장
    entryNames: '[dir]/[name]',
    chunkNames: 'chunks/[name]-[hash]',
    // VS Code 런타임에서 제공되는 모듈은 번들에서 제외
    external: ['vscode'],
  };

  if (!isNode) {
    // 브라우저 타깃: 코드 분할 활성화로 중복 최소화
    base.splitting = true;
    base.jsx = 'automatic';
    // 브라우저 번들에서 Node 코어 모듈 및 'node:' 스킴을 폴리필
    base.mainFields = ['browser', 'module', 'main'];
    base.conditions = ['browser'];
    base.inject = [require.resolve('node-stdlib-browser/helpers/esbuild/shim')];
    base.plugins = [stdLibBrowserPlugin(stdLibBrowser), aliasNodeFetchPlugin()];
    base.define = {
      ...base.define,
      global: 'globalThis',
    };
  }

  return base;
}

async function run() {
  // 로그는 함수명 프리픽스 규칙 준수
  console.log('[run] starting build script');

  const parsed = parseArgs(process.argv.slice(2));
  const options = getEsbuildOptions(parsed);

  console.log('[run] target=%s, entries=%j, outdir=%s, flags=%j', parsed.target, parsed.entryPoints, options.outdir, parsed.flags);

  if (parsed.flags.watch) {
    // watch 모드에서는 esbuild context API 사용
    const ctx = await context(options);
    await ctx.watch();
    console.log('[run] watching for changes...');
  } else {
    await build(options);
    console.log('[run] build completed');
  }
}

run().catch((err) => {
  // 오류를 명확히 표시하고 프로세스 종료
  console.error('[run] build failed:', err);
  process.exit(1);
});
