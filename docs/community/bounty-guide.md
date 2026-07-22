# Publishing a GitHub Integration Bounty

## Create the issue

Create a normal GitHub issue and clearly label it as a bounty. Include:

- the integration or feature goal;
- required behavior and supported operations;
- files or interfaces likely to be involved;
- acceptance criteria and required tests;
- documentation requirements;
- reward amount, currency, and payment conditions;
- eligibility and submission deadline; and
- whether maintainers must approve an implementation plan before work begins.

Use the relevant integration bounty document as a starting point when one exists.

With GitHub CLI:

```bash
gh auth login
gh issue create \
  --repo oko-trading/okotrading \
  --title "[BOUNTY] Add example exchange integration" \
  --label "bounty,enhancement" \
  --body-file bounty.md
```

## Reward terms

State the reward directly in the issue. Define whether it is paid to the first accepted implementation or divided among contributors. Specify the payment method, who pays transaction fees, any identity or tax requirements, and the point at which the reward becomes payable.

Do not promise funds that have not been reserved. If an external bounty platform is used, link its authoritative terms and keep the GitHub issue synchronized.

## Acceptance criteria

Good acceptance criteria are observable. For an exchange integration, they commonly cover:

- authenticated and public client construction;
- market-data retrieval;
- balance and position retrieval;
- order placement, cancellation, and status queries;
- symbol, quantity, precision, and error normalization;
- unit tests with mocks and any approved integration tests;
- configuration and deployment documentation; and
- no credentials or sensitive data in code, fixtures, or logs.

Maintainers retain final review authority even when every checkbox appears complete.

## Managing submissions

- Respond promptly to scope questions.
- Assign or acknowledge contributors according to the stated policy.
- Keep the issue status and milestone current.
- Require contributors to link their pull request to the bounty.
- Review security, correctness, maintainability, and test coverage.
- Record the accepted submission and payment status publicly when appropriate.

Do not merge incomplete code merely to meet a bounty deadline. Request changes through normal review and CI.

## Promotion

Share the issue in relevant developer communities and project channels. Include a short description, reward, deadline, required skills, and the canonical issue link. Avoid spam and make clear that work is subject to review.

## Legal and safety notes

Confirm that the reward and payment method comply with applicable laws and platform rules. Never ask contributors to share private keys, production credentials, or regulated customer data. For security-sensitive work, coordinate disclosure privately under the project's security policy.
