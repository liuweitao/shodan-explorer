const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  automate,
  refresh,
  eligibleManifest,
  eligibleFiles,
  eligiblePull,
  REQUIRED_JOBS,
} = require("./dependabot-automerge.cjs");

const manifest = () => ({
  name: "app",
  scripts: { build: "vite build" },
  dependencies: { vue: "3.5.43" },
  devDependencies: { vite: "8.3.3" },
});
const upgrade = () => ({ ...manifest(), dependencies: { vue: "3.5.44" } });
const files = () =>
  ["frontend/package.json", "frontend/pnpm-lock.yaml"].map((filename) => ({
    filename,
    status: "modified",
  }));
const pull = () => ({
  number: 123,
  state: "open",
  draft: false,
  user: { login: "dependabot[bot]", id: 49699333, type: "Bot" },
  base: { ref: "main", sha: "base", repo: { full_name: "owner/repo" } },
  head: {
    ref: "dependabot/npm_and_yarn/frontend/group",
    sha: "head",
    repo: { full_name: "owner/repo" },
  },
  labels: [],
  mergeable: true,
  mergeable_state: "clean",
});

function fixture() {
  const state = {
    run: {
      id: 1,
      event: "pull_request",
      conclusion: "success",
      path: ".github/workflows/ci.yml",
      head_sha: "head",
      head_repository: { full_name: "owner/repo" },
      pull_requests: [{ number: 123, base: { sha: "base" } }],
    },
    pr: pull(),
    current: pull(),
    main: "base",
    files: files(),
    before: manifest(),
    after: upgrade(),
    associated: [{ number: 123, state: "open", base: { ref: "main" } }],
    behind: 0,
    comparisonStatus: "ahead",
    jobs: REQUIRED_JOBS.map((name) => ({
      name,
      status: "completed",
      conclusion: "success",
    })),
    merged: [],
    updated: [],
    updateError: null,
    runs: [{ event: "pull_request" }],
    pulls: [pull()],
    dispatched: [],
    messages: [],
  };
  let reads = 0;
  const listJobsForWorkflowRun = () => {};
  const listFiles = () => {};
  const listPulls = () => {};
  const listPullRequestsAssociatedWithCommit = () => {};
  const github = {
    rest: {
      actions: {
        getWorkflowRun: async () => ({ data: state.run }),
        listJobsForWorkflowRun,
        listWorkflowRuns: async () => ({ data: { workflow_runs: state.runs } }),
        createWorkflowDispatch: async (args) => state.dispatched.push(args),
      },
      pulls: {
        get: async () => ({ data: reads++ === 0 ? state.pr : state.current }),
        listFiles,
        list: listPulls,
        updateBranch: async (args) => {
          if (state.updateError) throw state.updateError;
          state.updated.push(args);
          return { data: { sha: "updated-head" } };
        },
        merge: async (args) => {
          state.merged.push(args);
          return { data: { merged: true, sha: "merged" } };
        },
      },
      repos: {
        listPullRequestsAssociatedWithCommit,
        compareCommitsWithBasehead: async () => ({
          data: { behind_by: state.behind, status: state.comparisonStatus },
        }),
        getContent: async ({ ref }) => ({
          data: {
            type: "file",
            encoding: "base64",
            content: Buffer.from(
              JSON.stringify(ref === "base" ? state.before : state.after),
            ).toString("base64"),
          },
        }),
        getBranch: async () => ({ data: { commit: { sha: state.main } } }),
      },
    },
    paginate: async (method) =>
      method === listPulls
        ? state.pulls
        : method === listFiles
          ? state.files
          : method === listPullRequestsAssociatedWithCommit
            ? state.associated
            : state.jobs,
  };
  return {
    state,
    refresh: () =>
      refresh({
        github,
        context: { repo: { owner: "owner", repo: "repo" } },
        core: {
          info: (message) => state.messages.push(message),
          warning: (message) => state.messages.push(message),
        },
      }),
    run: () =>
      automate({
        github,
        context: {
          repo: { owner: "owner", repo: "repo" },
          payload: { workflow_run: { id: 1 } },
        },
        core: { info: (message) => state.messages.push(message) },
      }),
  };
}

test("accepts exact stable patch and minor upgrades, including grouped updates", () => {
  assert.equal(eligibleManifest(manifest(), upgrade()), true);
  assert.equal(
    eligibleManifest(manifest(), {
      ...upgrade(),
      devDependencies: { vite: "8.4.0" },
    }),
    true,
  );
});

test("rejects major, downgrade, prerelease, range, added dependency and non-dependency edits", () => {
  for (const version of [
    "4.0.0",
    "3.5.42",
    "3.4.99",
    "3.6.0-rc.1",
    "^3.5.44",
    "3.05.44",
    "https://example.com/pkg.tgz",
  ]) {
    assert.equal(
      eligibleManifest(manifest(), {
        ...upgrade(),
        dependencies: { vue: version },
      }),
      false,
      version,
    );
  }
  assert.equal(eligibleManifest(manifest(), manifest()), false);
  assert.equal(
    eligibleManifest(manifest(), {
      ...upgrade(),
      dependencies: { vue: "3.5.44", extra: "1.0.0" },
    }),
    false,
  );
  for (const edit of [
    { scripts: { build: "curl attacker" } },
    { packageManager: "pnpm@12" },
    { pnpm: { overrides: {} } },
    { engines: { node: "*" } },
  ]) {
    assert.equal(
      eligibleManifest(manifest(), { ...upgrade(), ...edit }),
      false,
    );
  }
  assert.equal(
    eligibleManifest(
      { dependencies: { pkg: "0.2.1" } },
      { dependencies: { pkg: "0.3.0" } },
    ),
    false,
  );
  assert.equal(
    eligibleManifest(
      { dependencies: { pkg: "0.2.1" } },
      { dependencies: { pkg: "0.2.2" } },
    ),
    true,
  );
});

test("rejects changes to workflows, Docker, supply-chain settings, renamed and deleted files", () => {
  assert.equal(eligibleFiles(files()), true);
  for (const filename of [
    ".github/workflows/ci.yml",
    "frontend/Dockerfile",
    "frontend/pnpm-workspace.yaml",
    "frontend/.npmrc",
  ]) {
    assert.equal(
      eligibleFiles([...files(), { filename, status: "modified" }]),
      false,
    );
  }
  for (const status of ["renamed", "removed", "added"])
    assert.equal(eligibleFiles([{ ...files()[0], status }, files()[1]]), false);
});

test("rejects impersonation, forks, stale heads, drafts and explicit opt-out", () => {
  assert.equal(eligiblePull(pull(), "owner/repo", "head"), true);
  for (const edit of [
    { user: { login: "dependabot[bot]", id: 7, type: "Bot" } },
    { head: { ...pull().head, repo: { full_name: "attacker/repo" } } },
    { head: { ...pull().head, sha: "new-head" } },
    { draft: true },
    { state: "closed" },
    { labels: [{ name: "do-not-automerge" }] },
    { base: { ...pull().base, ref: "release" } },
  ])
    assert.equal(
      eligiblePull({ ...pull(), ...edit }, "owner/repo", "head"),
      false,
    );
});

test("merges the tested SHA and explicitly dispatches CI on main", async () => {
  const f = fixture();
  await f.run();
  assert.equal(f.state.merged.length, 1);
  assert.equal(f.state.merged[0].sha, "head");
  assert.equal(f.state.merged[0].merge_method, "squash");
  assert.equal(f.state.dispatched[0].workflow_id, "ci.yml");
  assert.equal(f.state.dispatched[0].ref, "main");
});

test("fails closed for missing, skipped, failing or pending CI jobs", async () => {
  for (const mutate of [
    (s) => s.jobs.pop(),
    (s) => (s.jobs[0].conclusion = "skipped"),
    (s) => (s.jobs[1].conclusion = "failure"),
    (s) => (s.jobs[2].status = "in_progress"),
    (s) =>
      s.jobs.push({
        name: "extra",
        status: "completed",
        conclusion: "failure",
      }),
  ]) {
    const f = fixture();
    mutate(f.state);
    await f.run();
    assert.equal(f.state.merged.length, 0);
    assert.equal(f.state.dispatched.length, 0);
  }
});

test("rejects unrelated CI, ambiguous association and a changed base or PR before merge", async () => {
  for (const mutate of [
    (s) => (s.run.event = "push"),
    (s) => (s.run.path = ".github/workflows/other.yml"),
    (s) => (s.run.conclusion = "failure"),
    (s) => (s.run.head_repository.full_name = "fork/repo"),
    (s) => (s.associated = []),
    (s) => s.associated.push(s.associated[0]),
    (s) => (s.behind = 1),
    (s) => (s.comparisonStatus = "diverged"),
    (s) => (s.current.head.sha = "changed"),
    (s) => s.current.labels.push({ name: "do-not-automerge" }),
    (s) => (s.current.mergeable = null),
    (s) => (s.current.mergeable_state = "blocked"),
    (s) => (s.main = "new-main"),
    (s) => (s.current.base.sha = "other-base"),
    (s) =>
      s.files.push({ filename: "frontend/src/app.js", status: "modified" }),
    (s) => (s.after.scripts.build = "unsafe"),
  ]) {
    const f = fixture();
    mutate(f.state);
    await f.run();
    assert.equal(f.state.merged.length, 0);
    assert.equal(f.state.dispatched.length, 0);
  }
});

test("resolves Dependabot PRs when workflow_run has no pull_requests", async () => {
  const f = fixture();
  f.state.run.pull_requests = [];
  await f.run();
  assert.equal(f.state.merged.length, 1);
});

test("refreshes only compatible outdated PRs and dispatches branch CI", async () => {
  const f = fixture();
  f.state.behind = 1;
  await f.refresh();
  assert.deepEqual(f.state.updated, [
    {
      owner: "owner",
      repo: "repo",
      pull_number: 123,
      expected_head_sha: "head",
    },
  ]);
  assert.equal(f.state.dispatched[0].ref, pull().head.ref);
  assert.equal(f.state.dispatched[0].workflow_id, "ci.yml");
  assert.equal(f.state.merged.length, 0);
});

test("refresh skips current, opted-out, major, fork and workflow PRs", async () => {
  for (const mutate of [
    (s) => (s.behind = 0),
    (s) => s.pr.labels.push({ name: "do-not-automerge" }),
    (s) => (s.pr.head.repo.full_name = "fork/repo"),
    (s) => (s.after.dependencies.vue = "4.0.0"),
    (s) => (s.after.scripts.build = "changed"),
    (s) =>
      s.files.push({
        filename: ".github/workflows/ci.yml",
        status: "modified",
      }),
    (s) =>
      (s.pr.head.ref = "dependabot/github_actions/actions/github-script-9"),
  ]) {
    const f = fixture();
    f.state.behind = 1;
    mutate(f.state);
    await f.refresh();
    assert.equal(f.state.updated.length, 0);
    assert.equal(f.state.dispatched.length, 0);
  }
});

test("refresh handles conflicts and stale SHA without dispatching or merging", async () => {
  for (const status of [409, 422]) {
    const f = fixture();
    f.state.behind = 1;
    f.state.updateError = Object.assign(new Error("conflict"), { status });
    await f.refresh();
    assert.equal(f.state.updated.length, 0);
    assert.equal(f.state.dispatched.length, 0);
    assert.match(f.state.messages[0], /manual/);
  }
  const f = fixture();
  f.state.behind = 1;
  f.state.updateError = Object.assign(new Error("forbidden"), { status: 403 });
  await assert.rejects(f.refresh(), /forbidden/);
});

test("explicit branch CI uses the same complete merge gate", async () => {
  const f = fixture();
  f.state.run.event = "workflow_dispatch";
  f.state.run.head_branch = pull().head.ref;
  await f.run();
  assert.equal(f.state.merged.length, 1);
});

test("successful main CI refreshes stale PRs without attempting a merge", async () => {
  for (const event of ["push", "workflow_dispatch", "schedule"]) {
    const f = fixture();
    f.state.run.event = event;
    f.state.run.head_branch = "main";
    f.state.behind = 1;
    await f.run();
    assert.equal(f.state.updated.length, 1);
    assert.equal(f.state.merged.length, 0);
  }
});

test("recovers a missing dispatch without retrying failing or pending CI", async () => {
  const f = fixture();
  f.state.runs = [];
  await f.refresh();
  assert.equal(f.state.updated.length, 0);
  assert.equal(f.state.dispatched.length, 1);
  for (const status of ["completed", "in_progress", "queued"]) {
    const g = fixture();
    g.state.runs = [
      { event: "workflow_dispatch", status, conclusion: "failure" },
    ];
    await g.refresh();
    assert.equal(g.state.dispatched.length, 0);
  }
});
