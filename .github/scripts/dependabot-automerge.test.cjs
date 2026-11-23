const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  automate,
  refresh,
  eligibleManifest,
  eligibleDockerfile,
  actionUpdates,
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
    sha: "changed-blob",
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

const encode = (value) =>
  Buffer.from(typeof value === "string" ? value : JSON.stringify(value)).toString(
    "base64",
  );

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
    mergeBase: "base",
    contentReads: [],
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
  const listPulls = () => {};
  const listPullRequestsAssociatedWithCommit = () => {};
  const github = {
    rest: {
      git: {
        getBlob: async ({ file_sha }) => {
          assert.equal(file_sha, "changed-blob");
          return { data: { encoding: "base64", content: encode(state.after) } };
        },
      },
      actions: {
        getWorkflowRun: async () => ({ data: state.run }),
        listJobsForWorkflowRun,
        listWorkflowRuns: async () => ({ data: { workflow_runs: state.runs } }),
        createWorkflowDispatch: async (args) => state.dispatched.push(args),
      },
      pulls: {
        get: async () => ({ data: reads++ === 0 ? state.pr : state.current }),
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
          data: {
            behind_by: state.behind,
            status: state.comparisonStatus,
            files: state.files,
            merge_base_commit: { sha: state.mergeBase },
          },
        }),
        getContent: async ({ path, ref }) => {
          state.contentReads.push({ path, ref });
          return {
            data: {
              type: "file",
              encoding: "base64",
              content: encode(state.before),
            },
          };
        },
        getBranch: async () => ({ data: { commit: { sha: state.main } } }),
      },
    },
    paginate: async (method) =>
      method === listPulls
        ? state.pulls
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

test("daily sweep rechecks green dispatch despite an approval-only duplicate", async () => {
  const f = fixture();
  f.state.run.event = "workflow_dispatch";
  f.state.current.mergeable_state = "unstable";
  f.state.runs = [
    { id: 2, event: "pull_request", conclusion: "action_required" },
    {
      id: 1,
      event: "workflow_dispatch",
      status: "completed",
      conclusion: "success",
    },
  ];
  await f.refresh();
  assert.equal(f.state.merged.length, 1);
  assert.equal(f.state.dispatched[0].ref, "main");
});

test("approval-only runs cannot hide a missing dispatch", async () => {
  const f = fixture();
  f.state.runs = [
    { id: 2, event: "pull_request", conclusion: "action_required" },
  ];
  await f.refresh();
  assert.equal(f.state.merged.length, 0);
  assert.equal(f.state.dispatched[0].ref, pull().head.ref);
});

test("unstable PRs still reject actual failing or pending runs and protected blocks", async () => {
  for (const extra of [
    { id: 3, event: "pull_request", conclusion: "failure" },
    { id: 3, event: "workflow_dispatch", status: "in_progress" },
  ]) {
    const f = fixture();
    f.state.run.event = "workflow_dispatch";
    f.state.current.mergeable_state = "unstable";
    f.state.runs = [
      { id: 2, event: "pull_request", conclusion: "action_required" },
      extra,
    ];
    await f.run();
    assert.equal(f.state.merged.length, 0);
  }
  const f = fixture();
  f.state.current.mergeable_state = "blocked";
  f.state.run.event = "workflow_dispatch";
  f.state.runs = [
    { id: 2, event: "pull_request", conclusion: "action_required" },
  ];
  await f.run();
  assert.equal(f.state.merged.length, 0);
});

const nodeImage = (tag, digest) =>
  "FROM node:" + tag + "-alpine3.24@sha256:" + digest.repeat(64) + " AS build";
const nginxImage = (digest) =>
  "FROM nginx:1.31.8-alpine3.24@sha256:" + digest.repeat(64) + " AS runtime";

const oldDockerfile = [nodeImage("24.22.1", "a"), "RUN pnpm build", nginxImage("b"), ""].join("\n");
const newDockerfile = [nodeImage("24.22.3", "c"), "RUN pnpm build", nginxImage("d"), ""].join("\n");

function dependencyFixture(type, path, before, after) {
  const f = fixture();
  const branch = "dependabot/" + type + "/group";
  f.state.pr.head.ref = branch;
  f.state.current.head.ref = branch;
  f.state.files = [{ filename: path, status: "modified", sha: "changed-blob" }];
  f.state.before = before;
  f.state.after = after;
  return f;
}

test("accepts grouped digest updates and compatible image patches without other edits", () => {
  assert.equal(eligibleDockerfile(oldDockerfile, newDockerfile), true);
  assert.equal(eligibleDockerfile(oldDockerfile, oldDockerfile.replace(nginxImage("b"), nginxImage("d"))), true);
  for (const rejected of [
    oldDockerfile,
    newDockerfile.replace("RUN pnpm build", "RUN pnpm lint"),
    newDockerfile.replace("24.22.3", "25.22.3"),
    newDockerfile.replace("24.22.3", "24.23.0"),
    newDockerfile.replace("24.22.3", "24.22.0"),
    newDockerfile.replace("alpine3.24", "alpine3.25"),
    newDockerfile.replace("FROM node:", "FROM someone/node:"),
    newDockerfile.replace("AS build", "AS other"),
    newDockerfile.replace("c".repeat(64), "a".repeat(64)),
    newDockerfile + "RUN something\n",
  ])
    assert.equal(eligibleDockerfile(oldDockerfile, rejected), false, rejected);
});

test("merges eligible Docker PRs only after successful builds on both platforms", async () => {
  for (const armPassed of [true, false]) {
    const f = dependencyFixture(
      "docker/frontend", "frontend/Dockerfile", oldDockerfile, newDockerfile,
    );
    if (!armPassed)
      f.state.jobs = f.state.jobs.filter((job) => job.name !== "Container build (arm64)");
    await f.run();
    assert.equal(f.state.merged.length, armPassed ? 1 : 0);
  }
});

test("refresh compares a stale Docker PR against its merge base and redispatches CI", async () => {
  const f = dependencyFixture(
    "docker/frontend", "frontend/Dockerfile", oldDockerfile, newDockerfile,
  );
  f.state.behind = 1;
  f.state.main = "new-main";
  f.state.mergeBase = "previous-main";
  await f.refresh();
  assert.deepEqual(f.state.contentReads, [
    { path: "frontend/Dockerfile", ref: "previous-main" },
  ]);
  assert.equal(f.state.updated[0].expected_head_sha, "head");
  assert.equal(f.state.dispatched[0].ref, "dependabot/docker/frontend/group");
});

const reviewAction = (tag, sha) =>
  "        uses: actions/dependency-review-action@" + sha.repeat(40) + " # v" + tag;
const workflow = (action) => [
  "permissions:", "  contents: read", "    steps:", action, "        with:",
  "          fail-on-severity: moderate", "",
].join("\n");
const previousWorkflow = workflow(reviewAction("5.0.0", "a"));
const updatedWorkflow = workflow(reviewAction("5.0.1", "b"));

test("accepts only allowed, version-only Action changes in the CI file", () => {
  assert.deepEqual(actionUpdates(previousWorkflow, updatedWorkflow), [
    { action: "actions/dependency-review-action", sha: "b".repeat(40), tag: "5.0.1" },
  ]);
  for (const rejected of [
    previousWorkflow,
    workflow(reviewAction("6.0.0", "b")),
    workflow(reviewAction("5.0.1", "a")),
    workflow(reviewAction("5.0.1", "b").replace("actions/", "unknown/")),
    updatedWorkflow.replace("contents: read", "contents: write"),
    updatedWorkflow.replace("fail-on-severity: moderate", "fail-on-severity: high"),
  ])
    assert.deepEqual(actionUpdates(previousWorkflow, rejected), []);
});

test("reports Action verification without merging, refreshing or dispatching", async (t) => {
  for (const launch of ["run", "refresh"]) {
    for (const [status, sha, message] of [
      [200, "b", /verified upstream/],
      [200, "c", /needs manual review/],
      [404, "b", /needs manual review/],
      [503, "b", /upstream Action verification unavailable/],
    ]) {
      await t.test(launch + " " + status + " " + sha, async (testCase) => {
        const fetch = testCase.mock.method(globalThis, "fetch", async () => ({
          status,
          ok: status === 200,
          json: async () => ({ sha: sha.repeat(40) }),
        }));
        const f = dependencyFixture(
          "github_actions",
          ".github/workflows/ci.yml",
          previousWorkflow,
          updatedWorkflow,
        );
        await f[launch]();
        assert.equal(fetch.mock.callCount(), 1);
        assert.equal(
          fetch.mock.calls[0].arguments[0],
          "https://api.github.com/repos/actions/dependency-review-action/commits/v5.0.1",
        );
        assert.match(f.state.messages[0], message);
        assert.deepEqual(f.state.merged, []);
        assert.deepEqual(f.state.updated, []);
        assert.deepEqual(f.state.dispatched, []);
      });
    }
  }
});

test("leaves privileged and release workflow changes for maintainers", async () => {
  for (const path of [
    ".github/workflows/dependabot-automerge.yml",
    ".github/workflows/docker-build-push.yml",
  ]) {
    const f = dependencyFixture("github_actions", path, previousWorkflow, updatedWorkflow);
    await f.run();
    assert.match(f.state.messages[0], /manual review of workflow changes/);
    assert.deepEqual(f.state.merged, []);
  }
});
