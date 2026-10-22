# NWN skill-pack documentation ownership

The [version manifest](version-manifest.json) is the canonical map of package
state, authoring source, distribution copy and generated reports. This index
does not change its version or release state.

- Edit domain knowledge in the declared authoring source:
  [draft skill](draft-skills/nwn-server-gamedev/SKILL.md) and its references.
- The matching [plugin skill](draft-plugins/nwn-server-gamedev-pack/skills/nwn-server-gamedev/SKILL.md)
  is the self-contained distribution snapshot. Its 19 identical Markdown
  files are intentional package contents, not independent knowledge owners.
  Keep the copies synchronized under the existing versioning workflow;
  do not replace installed-package content with links outside the package.
- Read [package boundaries](package-boundaries.md),
  [versioning policy](versioning-policy.md) and
  [source-of-truth map](source-of-truth-map.md) before changing package content.
- Read [release readiness](release-readiness.md),
  [next actions](release-next-actions.md) and
  [evidence index](release-evidence-index.md) for current maintainer inputs.
  These are generated reports; update their declared inputs and use their
  existing generators/checkers instead of maintaining a second summary.

The 2026-09-29 documentation consolidation changed no package source,
distribution copy, manifest, release claim or validator.
