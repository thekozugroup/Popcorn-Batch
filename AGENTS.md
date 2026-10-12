Commit and push as thekozugroup@gmail.com. No AI co-author tags or session links in commits or pull requests.
Keep replies concise; explain the user impact before technical detail.
Keep main as the session-end source of truth. Commit only intended files. Commits follow Conventional Commits (`feat:`, `fix:`, `docs:`).
Read PRODUCT.md before design work; DESIGN.md is the family design system (its frontmatter matches Popcorn SR's). Use installed Taste and Impeccable skills during design and review.
Before shipping, run from the repository root: `cargo fmt --all --check`, `cargo clippy --workspace --all-targets -- -D warnings`, `cargo test --workspace` (or `make lint` and `make test`); in `web/`: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, then `pnpm e2e:layout`. Build the image with `make docker`, then run `make test-docker`, `make e2e` (scripts/e2e-smoke.sh) and `make e2e-browser` (scripts/e2e-browser.sh). For changes to `.github/` or `scripts/`: `make test-release` and `shellcheck docker/*.sh scripts/*.sh`.
A change to a core type is an API change: update `web/src/lib/types.ts`, `web/scripts/mock-api.mjs` and `docs/ARCHITECTURE.md` in the same commit.
Never replace or overwrite a library original without a passing verification, and never weaken a check to make a file pass. Never claim GPU support from a device name, a codec list or a mock test; only a real test encode counts.
Record current scope and evidence in working.md. No credentials, tokens or local media in commits; test media comes from `scripts/make-test-media.sh`.
