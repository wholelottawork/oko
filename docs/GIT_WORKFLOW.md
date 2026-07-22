# Git Workflow

## Goals

The workflow keeps the public and private editions stable, reviewable, and easy to release. Every change should be developed on a short-lived branch, reviewed through a pull request, and validated before promotion.

## Public repository

The public repository follows GitHub Flow:

1. Update `dev`.
2. Create `feature/<name>` or `fix/<name>`.
3. Make focused commits and push the branch.
4. Open a pull request into `dev`.
5. Complete review and automated checks.
6. Merge into `dev`.
7. After full integration testing, promote `dev` to `main`.

```bash
git switch dev
git pull --ff-only
git switch -c feature/example

# Develop and test.
git add <files>
git commit -m "feat: describe the change"
git push -u origin feature/example
```

`main` must remain releasable. Do not push feature work directly to `main` or `dev`.

## Private repository

The private edition uses a test-first promotion flow:

1. Branch from the current `test` branch.
2. Develop on `feature/<name>` or `hotfix/<name>`.
3. Open a pull request and merge the candidate into `test-cp` for verification.
4. After complete testing, merge the reviewed pull request into `test`.
5. Deploy or update the test environment.
6. Promote `test` to `main` through a pull request.
7. Let the release workflow create the version tag.

Production-only changes must never flow back into the public repository unless they are intentionally approved for release.

## Synchronizing public changes

Public changes may be imported into the private repository on a dedicated sync branch. Review the entire diff, resolve product-specific conflicts, run both public and private test suites, and merge through the normal private pull-request path.

Never merge repository histories blindly or copy secrets, private configuration, customer data, or proprietary modules into the public repository.

## Conflict resolution

For complicated conflicts, use a temporary integration branch:

```bash
git switch -c integration/<topic> origin/test
git merge --no-ff origin/feature/<topic>

# Resolve files, then validate and commit.
git add <resolved-files>
git commit
git push -u origin integration/<topic>
```

Open a pull request from the integration branch into `test`. Delete the temporary branch after it is merged.

## Release policy

- Use milestones to group release work.
- Require checks and review on protected branches.
- Generate releases from the reviewed `main` branch only.
- Use semantic version tags where practical.
- Include migrations, compatibility notes, and rollback instructions in release notes.

## Best practices

- Keep pull requests small and independently testable.
- Rebase or merge the target branch before final review according to repository policy.
- Use conventional, descriptive commit messages.
- Never commit credentials or generated runtime data.
- Run formatting, tests, and build checks locally.
- Document behavior changes and operational steps.
- Prefer reversible migrations and identify rollback procedures before deployment.
