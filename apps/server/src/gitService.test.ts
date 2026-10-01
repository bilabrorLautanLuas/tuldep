import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getGitInfo, parseCommit, parseStatus, pullProject } from "./gitService";

const root = mkdtempSync(join(tmpdir(), "tuldep-git-"));
const remote = join(root, "remote.git");
const repoA = join(root, "a"); // main working copy (tracks remote)
const repoB = join(root, "b"); // second clone used to push new commits

function git(cwd: string, ...args: string[]) {
  const res = Bun.spawnSync(
    ["git", "-c", "user.email=t@t.t", "-c", "user.name=t", "-c", "commit.gpgsign=false", ...args],
    { cwd, stdout: "pipe", stderr: "pipe" },
  );
  if (res.exitCode !== 0) throw new Error(`git ${args.join(" ")}: ${res.stderr.toString()}`);
  return res.stdout.toString().trim();
}

function commitFile(cwd: string, name: string, content: string) {
  writeFileSync(join(cwd, name), content);
  git(cwd, "add", name);
  git(cwd, "commit", "-m", `add ${name}`);
}

beforeAll(() => {
  Bun.spawnSync(["git", "init", "--bare", "-b", "main", remote]);
  git(root, "clone", remote, repoA);
  git(repoA, "checkout", "-B", "main");
  commitFile(repoA, "one.txt", "1");
  git(repoA, "push", "-u", "origin", "main");
  git(root, "clone", remote, repoB);
});

afterAll(() => rmSync(root, { recursive: true, force: true }));

describe("parseStatus", () => {
  test("branch with upstream, ahead/behind and a dirty entry", () => {
    const info = parseStatus(
      ["# branch.oid abc", "# branch.head feature/x", "# branch.upstream origin/feature/x", "# branch.ab +2 -3", "? new.txt"].join("\n"),
    );
    expect(info).toMatchObject({ isRepo: true, branch: "feature/x", dirty: true, hasUpstream: true, ahead: 2, behind: 3 });
  });

  test("detached HEAD uses short sha", () => {
    const info = parseStatus("# branch.oid 1234567890abcdef\n# branch.head (detached)\n");
    expect(info).toMatchObject({ detached: true, branch: "1234567", dirty: false, hasUpstream: false });
  });

  test("repo without commits has a branch name but no sha", () => {
    expect(parseStatus("# branch.oid (initial)\n# branch.head main\n")).toMatchObject({ branch: "main", detached: false });
  });
});

describe("parseCommit", () => {
  test("splits fields on unit separator, subject may contain odd characters", () => {
    expect(parseCommit("abc1234\x1fAda\x1f2026-01-02T03:04:05+07:00\x1ffix: a | b \"c\"\x1f\n")).toEqual({
      hash: "abc1234",
      subject: 'fix: a | b "c"',
      body: "",
      author: "Ada",
      date: "2026-01-02T03:04:05+07:00",
    });
  });

  test("multi-line body is kept intact (blank lines included)", () => {
    const c = parseCommit("abc1234\x1fAda\x1f2026-01-02T03:04:05+07:00\x1fsubj\x1fline1\n\nline3\n");
    expect(c?.subject).toBe("subj");
    expect(c?.body).toBe("line1\n\nline3");
  });

  test("empty output means no commit", () => {
    expect(parseCommit("")).toBeNull();
  });
});

describe("getGitInfo", () => {
  test("latest local commit is reported, and follows new commits", async () => {
    const first = (await getGitInfo(repoA)).commit;
    expect(first).toMatchObject({ subject: "add one.txt", author: "t" });
    expect(first?.hash).toBe(git(repoA, "rev-parse", "--short", "HEAD"));
    expect(Number.isNaN(Date.parse(first!.date))).toBe(false);

    commitFile(repoA, "tmp.txt", "t");
    expect((await getGitInfo(repoA)).commit?.subject).toBe("add tmp.txt");
    git(repoA, "reset", "--hard", "origin/main");
  });

  test("commit message with body and blank lines is split into subject and body", async () => {
    writeFileSync(join(repoA, "msg.txt"), "m");
    git(repoA, "add", "msg.txt");
    git(repoA, "commit", "-m", "short subject", "-m", "first paragraph\nsecond line", "-m", "last paragraph");
    const commit = (await getGitInfo(repoA)).commit;
    expect(commit?.subject).toBe("short subject");
    expect(commit?.body).toBe("first paragraph\nsecond line\n\nlast paragraph");
    git(repoA, "reset", "--hard", "origin/main");
  });

  test("repo without commits has commit null", async () => {
    const empty = join(root, "empty");
    git(root, "init", "-b", "main", empty);
    const info = await getGitInfo(empty);
    expect(info).toMatchObject({ isRepo: true, branch: "main" });
    expect(info.commit).toBeNull();
  });

  test("non-repo folder", async () => {
    expect(await getGitInfo(root)).toEqual({ isRepo: false });
  });

  test("missing folder", async () => {
    expect(await getGitInfo(join(root, "nope"))).toEqual({ isRepo: false });
  });

  test("clean repo on main, in sync", async () => {
    expect(await getGitInfo(repoA)).toMatchObject({ isRepo: true, branch: "main", dirty: false, hasUpstream: true, ahead: 0, behind: 0 });
  });

  test("dirty and ahead", async () => {
    commitFile(repoA, "local.txt", "x");
    writeFileSync(join(repoA, "untracked.txt"), "u");
    expect(await getGitInfo(repoA)).toMatchObject({ dirty: true, ahead: 1, behind: 0 });
    rmSync(join(repoA, "untracked.txt"));
    git(repoA, "reset", "--hard", "origin/main");
  });

  test("detached HEAD", async () => {
    git(repoA, "checkout", "--detach");
    const info = await getGitInfo(repoA);
    expect(info.detached).toBe(true);
    expect(info.branch).toMatch(/^[0-9a-f]{7}$/);
    git(repoA, "checkout", "main");
  });
});

describe("pullProject", () => {
  test("fast-forward succeeds and info reflects it", async () => {
    commitFile(repoB, "two.txt", "2");
    git(repoB, "push");
    git(repoA, "fetch");
    expect((await getGitInfo(repoA)).behind).toBe(1);

    const res = await pullProject(repoA);
    expect(res.success).toBe(true);
    expect(res.info).toMatchObject({ behind: 0, ahead: 0 });
  });

  test("diverged branches fail with git's message", async () => {
    commitFile(repoB, "three.txt", "3");
    git(repoB, "push");
    commitFile(repoA, "local2.txt", "l");

    const res = await pullProject(repoA);
    expect(res.success).toBe(false);
    expect(res.output.length).toBeGreaterThan(0);
    expect(res.info).toMatchObject({ ahead: 1 });
  });

  test("missing folder", async () => {
    const res = await pullProject(join(root, "nope"));
    expect(res.success).toBe(false);
    expect(res.info.isRepo).toBe(false);
  });
});
