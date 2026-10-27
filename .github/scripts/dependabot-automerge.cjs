const { isDeepStrictEqual } = require("node:util");

const REQUIRED_JOBS = [
  "Frontend checks",
  "Container build",
  "Dependency review",
  "Automation policy",
];
const ALLOWED_FILES = new Set([
  "frontend/package.json",
  "frontend/pnpm-lock.yaml",
]);

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
      const oldVersion = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(
        oldDeps[name],
      );
      const newVersion = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(
        newDeps[name],
      );
      if (!oldVersion || !newVersion) return false;
      if (oldDeps[name] === newDeps[name]) continue;
      const [, major, minor, patch] = oldVersion.map(Number);
      const [, nextMajor, nextMinor, nextPatch] = newVersion.map(Number);
      // Pre-1.0 minor updates can break compatibility; only patches qualify.
      if (major !== nextMajor || (major === 0 && minor !== nextMinor))
        return false;
      if (nextMinor < minor || (nextMinor === minor && nextPatch <= patch))
        return false;
      changed = true;
    }
    delete oldOther[field];
    delete newOther[field];
  }
  // Scripts, engines, package manager, overrides, and all other fields are immutable.
  return changed && isDeepStrictEqual(oldOther, newOther);
}

function eligibleFiles(files) {
  return (
    files.length === 2 &&
    files.every(
      (file) =>
        ALLOWED_FILES.has(file.filename) &&
        file.status === "modified" &&
        !file.previous_filename,
    )
  );
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
    pr.head.ref.startsWith("dependabot/npm_and_yarn/frontend/") &&
    pr.head.sha === sha &&
    !pr.labels.some((label) => label.name === "do-not-automerge")
  );
}

async function automate({ github, context, core }) {
  const repo = context.repo;
  const repository = `${repo.owner}/${repo.repo}`;
  const skip = (reason) => core.info(`Auto-merge skipped: ${reason}`);
  const { data: run } = await github.rest.actions.getWorkflowRun({
    ...repo,
    run_id: context.payload.workflow_run.id,
  });
  if (
    run.event !== "pull_request" ||
    run.conclusion !== "success" ||
    run.path !== ".github/workflows/ci.yml" ||
    run.head_repository?.full_name !== repository
  ) {
    return skip("requires successful PR CI from this repository");
  }
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
  const files = await github.paginate(github.rest.pulls.listFiles, {
    ...repo,
    pull_number: pr.number,
    per_page: 100,
  });
  if (!eligibleFiles(files))
    return skip("only the frontend manifest and lockfile may change");

  const manifest = async (ref) => {
    const { data } = await github.rest.repos.getContent({
      ...repo,
      path: "frontend/package.json",
      ref,
    });
    if (data.type !== "file" || data.encoding !== "base64")
      throw new Error("Invalid manifest response");
    return JSON.parse(Buffer.from(data.content, "base64").toString("utf8"));
  };
  const [before, after] = await Promise.all([
    manifest(pr.base.sha),
    manifest(pr.head.sha),
  ]);
  if (!eligibleManifest(before, after))
    return skip("requires exact, stable, compatible dependency upgrades");

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
      basehead: `${main.commit.sha}...${run.head_sha}`,
    });
  if (
    !eligiblePull(current, repository, run.head_sha) ||
    current.mergeable !== true ||
    current.mergeable_state !== "clean" ||
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
  eligibleFiles,
  eligibleManifest,
  eligiblePull,
  REQUIRED_JOBS,
};
