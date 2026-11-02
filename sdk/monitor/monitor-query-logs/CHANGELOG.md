# Release History

## 1.0.1 (Unreleased)

### Features Added

### Breaking Changes

### Bugs Fixed

- Fix `LogsQueryClient` ignoring the `audience` option when requesting tokens. The audience (with or without the `/.default` suffix) is now used as the token scope, so sovereign clouds such as Azure Government and Azure China authenticate against the right resource.

### Other Changes

## 1.0.0 (2025-07-29)

### Features Added

- Initial release of `@azure/monitor-query-logs` package
- This package contains the logs querying functionality split from `@azure/monitor-query`
- Provides `LogsQueryClient` for querying Azure Monitor Logs using KQL (Kusto Query Language)
- Supports querying Azure Log Analytics workspaces and resource-centric queries
- Includes batch query capabilities for multiple queries
