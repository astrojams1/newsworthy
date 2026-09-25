// Delete branches whose pull request has merged. Run by
// .github/workflows/delete-merged-branches.yml, twice over:
//
//   node scripts/delete-merged-branches.mjs --pr     one branch, as its PR merges
//   node scripts/delete-merged-branches.mjs --sweep  every branch, weekly and on demand
//
// A branch is deleted only when its tip is still exactly the head of a pull
// request from this repository that merged. A branch reused for follow-up
// work after its PR merged carries new commits, so its tip differs and it is
// kept; so is the default branch, any protected branch, and any branch with a
// pull request still open. Needs GITHUB_TOKEN (contents: write) and
// GITHUB_REPOSITORY; --pr also reads BRANCH.
import { pathToFileURL } from 'node:url';

/** Whether one branch may go, and why. Pure, so the rules are tested. */
export function decide({ branch, tip, defaultBranch, isProtected = false, mergedHeads = [], hasOpenPr = false }) {
  if (branch === defaultBranch) return { remove: false, reason: 'default branch' };
  if (isProtected) return { remove: false, reason: 'protected' };
  if (hasOpenPr) return { remove: false, reason: 'an open pull request uses it' };
  if (!mergedHeads.length) return { remove: false, reason: 'no merged pull request' };
  if (!mergedHeads.includes(tip)) return { remove: false, reason: 'commits after the merge' };
  return { remove: true, reason: 'merged' };
}

const API = 'https://api.github.com';

async function github(path, { method = 'GET', token } = {}) {
  const response = await fetch(`${API}${path}`, { method, headers: {
    authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28',
  } });
  if (method === 'DELETE') return response;
  if (!response.ok) throw new Error(`${method} ${path}: ${response.status} ${await response.text()}`);
  return response.json();
}

async function all(path, token) {
  const items = [];
  for (let page = 1; ; page += 1) {
    const batch = await github(`${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`, { token });
    items.push(...batch);
    if (batch.length < 100) return items;
  }
}

const refPath = branch => branch.split('/').map(encodeURIComponent).join('/');

async function remove(repo, branch, token) {
  const response = await github(`/repos/${repo}/git/refs/heads/${refPath(branch)}`, { method: 'DELETE', token });
  // 422 is "reference does not exist": someone deleted it first.
  if (response.status === 204 || response.status === 422) return true;
  throw new Error(`delete ${branch}: ${response.status} ${await response.text()}`);
}

async function main() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY;
  if (!token || !repo) throw new Error('GITHUB_TOKEN and GITHUB_REPOSITORY are required');
  const { default_branch: defaultBranch } = await github(`/repos/${repo}`, { token });
  const pulls = await all(`/repos/${repo}/pulls?state=all`, token);
  const own = pulls.filter(pull => pull.head.repo?.full_name === repo);
  const branches = await all(`/repos/${repo}/branches`, token);
  const only = process.argv.includes('--pr') ? process.env.BRANCH : null;
  if (process.argv.includes('--pr') && !only) throw new Error('--pr needs BRANCH');
  const targets = only ? branches.filter(branch => branch.name === only) : branches;
  if (only && !targets.length) { console.log(`${only}: already gone`); return; }
  for (const branch of targets) {
    const mine = own.filter(pull => pull.head.ref === branch.name);
    const verdict = decide({
      branch: branch.name, tip: branch.commit.sha, defaultBranch, isProtected: branch.protected,
      mergedHeads: mine.filter(pull => pull.merged_at).map(pull => pull.head.sha),
      hasOpenPr: mine.some(pull => pull.state === 'open'),
    });
    if (verdict.remove) await remove(repo, branch.name, token);
    console.log(`${branch.name}: ${verdict.remove ? 'deleted' : `kept (${verdict.reason})`}`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
