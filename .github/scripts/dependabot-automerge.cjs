const { isDeepStrictEqual } = require("node:util");

const REQUIRED_JOBS = [
  "Frontend checks",
  "Container build (amd64)",
  "Container build (arm64)",
  "Dependency review",
  "Automation policy",
];
const NPM_FILES = new Set([
  "frontend/package.json",
  "frontend/pnpm-lock.yaml",
]);
const DOCKERFILE = "frontend/Dockerfile";
const CI_WORKFLOW = ".github/workflows/ci.yml";
const DEPENDABOT_BRANCHES = {
  npm: "dependabot/npm_and_yarn/frontend/",
  docker: "dependabot/docker/frontend/",
  actions: "dependabot/github_actions/",
};
const REVIEWED_ACTIONS = new Set([
  "actions/checkout",
  "actions/dependency-review-action",
  "actions/setup-node",
  "aquasecurity/trivy-action",
  "docker/build-push-action",
  "docker/setup-buildx-action",
]);

function stableVersion(version) {
  const parts = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/
    .exec(version)
    ?.slice(1)
    .map(Number);
  return parts?.every(Number.isSafeInteger) ? parts : null;
}

function compatibleUpgrade(from, to, allowMinor = true) {
  const [major, minor, patch] = from;
  const [nextMajor, nextMinor, nextPatch] = to;
  if (major !== nextMajor) return false;
  if (minor === nextMinor) return nextPatch > patch;
  // Pre-1.0 minor updates can break compatibility.
  return allowMinor && major > 0 && nextMinor > minor;
}

function updateType(branch) {
  return Object.keys(DEPENDABOT_BRANCHES).find((type) =>
    branch.startsWith(DEPENDABOT_BRANCHES[type]),
  );
}

function eligibleManifest(before, after) {
  const oldOther = { ...before };
  const newOther = { ...after };
  let changed = false;
  for (const field of ["dependencies", "devDependencies"]) {
    const oldDeps = before[field] || {};
    const newDeps = after[field] || {};
    if (
      !isDeepStrictEqual(
        Object.keys(oldDeps).sort(),
        Object.keys(newDeps).sort(),
      )
    )
      return false;
    for (const name of Object.keys(oldDeps)) {
      const oldVersion = stableVersion(oldDeps[name]);
      const newVersion = stableVersion(newDeps[name]);
      if (!oldVersion || !newVersion) return false;
      if (oldDeps[name] === newDeps[name]) continue;
      if (!compatibleUpgrade(oldVersion, newVersion)) return false;
      changed = true;
    }
    delete oldOther[field];
    delete newOther[field];
  }
  // Scripts, engines, package manager, overrides, and all other fields are immutable.
  return changed && isDeepStrictEqual(oldOther, newOther);
}

function eligibleFiles(files, type = "npm") {
  const allowedPaths = {
    npm: NPM_FILES,
    docker: new Set([DOCKERFILE]),
    actions: new Set([CI_WORKFLOW]),
  }[type];
  if (!allowedPaths || !Array.isArray(files)) return false;
  return (
    files.length === allowedPaths.size &&
    new Set(files.map((file) => file.filename)).size === allowedPaths.size &&
    files.every(
      (file) =>
        allowedPaths.has(file.filename) &&
        file.status === "modified" &&
        !file.previous_filename,
    )
  );
}

function eligibleDockerfile(before, after) {
  const oldLines = before.split("\n");
  const newLines = after.split("\n");
  if (oldLines.length !== newLines.length) return false;
  const images = new Set();
  const from = /^FROM (node|nginx):([0-9.]+)(-alpine[0-9]+\.[0-9]+)@sha256:([a-f0-9]{64}) AS (build|runtime)$/;
  for (let index = 0; index < oldLines.length; index++) {
    if (oldLines[index] === newLines[index]) continue;
    const oldImage = from.exec(oldLines[index]);
    const newImage = from.exec(newLines[index]);
    if (!oldImage || !newImage) return false;
    const [, image, oldTag, oldVariant, oldDigest, stage] = oldImage;
    const [, nextImage, newTag, newVariant, newDigest, nextStage] = newImage;
    const oldVersion = stableVersion(oldTag);
    const newVersion = stableVersion(newTag);
    if (
      image !== nextImage ||
      stage !== nextStage ||
      stage !== (image === "node" ? "build" : "runtime") ||
      images.has(image) ||
      oldVariant !== newVariant ||
      oldDigest === newDigest ||
      !oldVersion ||
      !newVersion ||
      (oldTag !== newTag && !compatibleUpgrade(oldVersion, newVersion, false))
    )
      return false;
    images.add(image);
  }
  return images.size > 0;
}

function actionUpdates(before, after) {
  const oldLines = before.split("\n");
  const newLines = after.split("\n");
  if (oldLines.length !== newLines.length) return [];
  const updates = new Map();
  const uses = /^( +uses: )([a-z0-9-]+\/[a-z0-9-]+)@([a-f0-9]{40}) # v([0-9.]+)$/;
  for (let index = 0; index < oldLines.length; index++) {
    if (oldLines[index] === newLines[index]) continue;
    const previous = uses.exec(oldLines[index]);
    const next = uses.exec(newLines[index]);
    if (!previous || !next) return [];
    const [, prefix, action, oldSha, oldTag] = previous;
    const [, nextPrefix, nextAction, sha, tag] = next;
    const oldVersion = stableVersion(oldTag);
    const newVersion = stableVersion(tag);
    if (
      prefix !== nextPrefix ||
      action !== nextAction ||
      !REVIEWED_ACTIONS.has(action) ||
      oldSha === sha ||
      !oldVersion ||
      !newVersion ||
      !compatibleUpgrade(oldVersion, newVersion)
    )
      return [];
    const key = action + "@" + tag;
    if (updates.has(key) && updates.get(key).sha !== sha) return [];
    updates.set(key, { action, tag, sha });
  }
  return [...updates.values()];
}

function contents(data) {
  if (data.encoding !== "base64") throw new Error("Invalid file response");
  return Buffer.from(data.content, "base64").toString("utf8");
}

async function changedFile(github, repo, file, base) {
  const [previous, next] = await Promise.all([
    github.rest.repos.getContent({ ...repo, path: file.filename, ref: base }),
    github.rest.git.getBlob({ ...repo, file_sha: file.sha }),
  ]);
  if (previous.data.type !== "file") throw new Error("Invalid base file");
  return [contents(previous.data), contents(next.data)];
}

async function validateUpdate(github, repo, pr, comparison, type, core) {
  const files = comparison.files;
  if (!eligibleFiles(files, type)) {
    if (type === "actions")
      core.info("PR #" + pr.number + " needs manual review of workflow changes");
    return false;
  }
  const file =
    type === "npm"
      ? files.find((entry) => entry.filename === "frontend/package.json")
      : files[0];
  const [before, after] = await changedFile(
    github,
    repo,
    file,
    comparison.merge_base_commit.sha,
  );
  if (type === "npm")
    return eligibleManifest(JSON.parse(before), JSON.parse(after));
  if (type === "docker") return eligibleDockerfile(before, after);

  // Check Action updates from trusted main code. Updating workflow files needs
  // a maintainer because the built-in token cannot write workflows.
  const updates = actionUpdates(before, after);
  let verified;
  try {
    const matches = await Promise.all(
      updates.map(async ({ action, tag, sha }) => {
        // Upstream repositories are public, so verification needs no token.
        const response = await fetch(
          "https://api.github.com/repos/" + action + "/commits/v" + tag,
          {
            headers: { Accept: "application/vnd.github+json" },
            signal: AbortSignal.timeout(7000),
          },
        );
        if (response.status === 404) return false;
        if (!response.ok) throw new Error("GitHub API HTTP " + response.status);
        const commit = await response.json();
        return commit.sha === sha;
      }),
    );
    verified = matches.length > 0 && matches.every(Boolean);
  } catch {
    core.info("PR #" + pr.number + ": upstream Action verification unavailable");
    return false;
  }
  const message = verified
    ? "verified upstream Action tags and commit SHAs. Maintainer merge required"
    : "needs manual review of Action versions or workflow changes";
  core.info("PR #" + pr.number + " (" + pr.head.sha + "): " + message);
  return false;
}

function eligiblePull(pr, repository, sha) {
  return (
    pr.state === "open" &&
    !pr.draft &&
    pr.user.login === "dependabot[bot]" &&
    pr.user.id === 49699333 &&
    pr.user.type === "Bot" &&
    pr.base.ref === "main" &&
    pr.base.repo.full_name === repository &&
    pr.head.repo?.full_name === repository &&
    Boolean(updateType(pr.head.ref)) &&
    pr.head.sha === sha &&
    !pr.labels.some((label) => label.name === "do-not-automerge")
  );
}

async function refresh({ github, context, core }) {
  const repo = context.repo;
  const repository = `${repo.owner}/${repo.repo}`;
  const pulls = await github.paginate(github.rest.pulls.list, {
    ...repo,
    state: "open",
    base: "main",
    per_page: 100,
  });
  for (const candidate of pulls) {
    const { data: pr } = await github.rest.pulls.get({
      ...repo,
      pull_number: candidate.number,
    });
    if (!eligiblePull(pr, repository, pr.head.sha)) continue;
    const type = updateType(pr.head.ref);
    const { data: main } = await github.rest.repos.getBranch({
      ...repo,
      branch: "main",
    });
    const { data: comparison } =
      await github.rest.repos.compareCommitsWithBasehead({
        ...repo,
        basehead: main.commit.sha + "..." + pr.head.sha,
        per_page: 1,
      });
    if (!(await validateUpdate(github, repo, pr, comparison, type, core)))
      continue;
    if (comparison.behind_by === 0) {
      // Recover a missing dispatch (for example after an API outage between
      // updateBranch and createWorkflowDispatch) without rerunning failed tests.
      const { data } = await github.rest.actions.listWorkflowRuns({
        ...repo,
        workflow_id: "ci.yml",
        head_sha: pr.head.sha,
        per_page: 100,
      });
      const latest = data.workflow_runs.find(
        (run) =>
          ["pull_request", "workflow_dispatch"].includes(run.event) &&
          run.conclusion !== "action_required",
      );
      if (latest) {
        // Token-dispatched CI does not reliably emit another workflow_run.
        // Re-evaluate completed success on each daily main sweep. Never retry
        // an actual failing, pending or cancelled run automatically.
        if (latest.status === "completed" && latest.conclusion === "success")
          await automate({
            github,
            core,
            context: {
              ...context,
              payload: { workflow_run: { id: latest.id } },
            },
          });
        continue;
      }
    } else {
      // Never force-push or execute PR code. The API rejects conflicts and races.
      try {
        await github.rest.pulls.updateBranch({
          ...repo,
          pull_number: pr.number,
          expected_head_sha: pr.head.sha,
        });
      } catch (error) {
        if (![409, 422].includes(error.status)) throw error;
        core.warning(`PR #${pr.number} needs manual conflict/race resolution`);
        continue;
      }
    }
    // Token branch updates create approval-only PR runs. Explicitly
    // dispatch the read-only CI workflow; its dependency review also runs here.
    await github.rest.actions.createWorkflowDispatch({
      ...repo,
      workflow_id: "ci.yml",
      ref: pr.head.ref,
    });
    core.info(
      `Dispatched fresh CI for PR #${pr.number} containing current main`,
    );
  }
}

async function automate({ github, context, core }) {
  if (!context.payload.workflow_run) return;
  const repo = context.repo;
  const repository = `${repo.owner}/${repo.repo}`;
  const skip = (reason) => core.info(`Auto-merge skipped: ${reason}`);
  const { data: run } = await github.rest.actions.getWorkflowRun({
    ...repo,
    run_id: context.payload.workflow_run.id,
  });
  if (
    !["pull_request", "workflow_dispatch", "push", "schedule"].includes(
      run.event,
    ) ||
    run.conclusion !== "success" ||
    run.path !== CI_WORKFLOW ||
    run.head_repository?.full_name !== repository
  ) {
    return skip("requires successful PR CI from this repository");
  }
  if (run.head_branch === "main") return refresh({ github, context, core });
  if (!["pull_request", "workflow_dispatch"].includes(run.event))
    return skip("requires a PR run or explicit branch CI");
  // GitHub can omit pull_requests for Dependabot runs. Resolve from the tested
  // commit through GitHub's API; never accept a number supplied by PR content.
  const associated = await github.paginate(
    github.rest.repos.listPullRequestsAssociatedWithCommit,
    {
      ...repo,
      commit_sha: run.head_sha,
      per_page: 100,
    },
  );
  const candidates = associated.filter(
    (pr) => pr.state === "open" && pr.base.ref === "main",
  );
  if (candidates.length !== 1)
    return skip("tested commit must identify exactly one open PR");
  const association = candidates[0];
  const { data: pr } = await github.rest.pulls.get({
    ...repo,
    pull_number: association.number,
  });
  if (!eligiblePull(pr, repository, run.head_sha))
    return skip("PR identity, SHA, or opt-out policy");

  const jobs = await github.paginate(
    github.rest.actions.listJobsForWorkflowRun,
    {
      ...repo,
      run_id: run.id,
      filter: "latest",
      per_page: 100,
    },
  );
  if (
    !REQUIRED_JOBS.every((name) =>
      jobs.some(
        (job) =>
          job.name === name &&
          job.status === "completed" &&
          job.conclusion === "success",
      ),
    ) ||
    jobs.some(
      (job) => job.status !== "completed" || job.conclusion !== "success",
    )
  ) {
    return skip("every CI job must pass, including all required gates");
  }
  // Recheck both branch tips. The tested head must contain the latest main so
  // merging cannot introduce an untested combination of changes.
  const { data: current } = await github.rest.pulls.get({
    ...repo,
    pull_number: pr.number,
  });
  const { data: main } = await github.rest.repos.getBranch({
    ...repo,
    branch: "main",
  });
  const { data: comparison } =
    await github.rest.repos.compareCommitsWithBasehead({
      ...repo,
      basehead: main.commit.sha + "..." + run.head_sha,
    per_page: 1,
    });
  if (!eligiblePull(current, repository, run.head_sha))
    return skip("PR changed, is blocked, or needs fresh CI on main");
  const type = updateType(pr.head.ref);
  if (!(await validateUpdate(github, repo, pr, comparison, type, core)))
    return skip("files or versions fall outside the auto-merge policy");

  let mergeStateAllowed = current.mergeable_state === "clean";
  if (
    current.mergeable_state === "unstable" &&
    run.event === "workflow_dispatch"
  ) {
    const { data } = await github.rest.actions.listWorkflowRuns({
      ...repo,
      workflow_id: "ci.yml",
      head_sha: run.head_sha,
      per_page: 100,
    });
    // A GITHUB_TOKEN update also creates a duplicate approval-only PR suite.
    // Accept only that known duplicate alongside the fully tested dispatch.
    // Real failed/pending runs and protected-branch blocks still stop merging;
    // GitHub's merge API independently enforces repository branch protection.
    mergeStateAllowed =
      data.workflow_runs.some(
        (other) =>
          other.event === "pull_request" &&
          other.conclusion === "action_required",
      ) &&
      data.workflow_runs.every(
        (other) =>
          other.id === run.id ||
          (other.event === "pull_request" &&
            other.conclusion === "action_required"),
      );
  }
  const { data: latest } = await github.rest.pulls.get({
    ...repo,
    pull_number: pr.number,
  });
  if (
    !eligiblePull(latest, repository, run.head_sha) ||
    latest.mergeable !== true ||
    latest.mergeable_state !== current.mergeable_state ||
    latest.base.sha !== main.commit.sha ||
    !mergeStateAllowed ||
    comparison.behind_by !== 0 ||
    comparison.status !== "ahead" ||
    current.base.sha !== main.commit.sha ||
    pr.base.sha !== main.commit.sha
  )
    return skip("PR changed, is blocked, or needs fresh CI on main");

  const { data: result } = await github.rest.pulls.merge({
    ...repo,
    pull_number: pr.number,
    sha: run.head_sha,
    merge_method: "squash",
  });
  if (!result.merged) throw new Error(result.message);
  core.info(`Merged Dependabot PR #${pr.number}: ${result.sha}`);
  // GITHUB_TOKEN merges do not generate another push workflow. Dispatch CI
  // explicitly (an allowed token-triggered event) to verify the resulting main.
  await github.rest.actions.createWorkflowDispatch({
    ...repo,
    workflow_id: "ci.yml",
    ref: "main",
  });
}

module.exports = {
  automate,
  refresh,
  eligibleFiles,
  eligibleManifest,
  eligibleDockerfile,
  actionUpdates,
  eligiblePull,
  REQUIRED_JOBS,
};
