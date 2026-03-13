# Roadmap

This roadmap reflects plausible next steps from the current implementation rather than a generic wishlist.

Related docs: [README](../README.md), [Architecture](architecture.md), [Deployment Notes](deployment-notes.md)

## Near Term

| Improvement                                     | Why it matters                                                                           |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Add incident list and detail endpoints          | Completes the read side of the incident workflow already present in the write path       |
| Introduce operator roles and scoped permissions | Makes the access model match the repository's operational posture                        |
| Add richer notification actions                 | Supports read state, acknowledgement, and operator-facing triage workflows               |
| Expand retry policy controls                    | Moves from manual-only retries toward backoff, scheduled retry, and dead-letter handling |

## Mid Term

| Improvement                                           | Why it matters                                                |
| ----------------------------------------------------- | ------------------------------------------------------------- |
| Add tracing across API, worker, and realtime services | Makes cross-service debugging and performance analysis easier |
| Add queue depth and processing latency metrics        | Gives the platform an actual operational telemetry layer      |
| Add idempotency keys for write endpoints              | Protects command handling from duplicate submissions          |
| Add replay or catch-up support for realtime consumers | Helps late-joining clients recover recent lifecycle context   |

## Long Term

| Improvement                                               | Why it matters                                                          |
| --------------------------------------------------------- | ----------------------------------------------------------------------- |
| Add multi-tenant partitioning                             | Moves the model from single-operations workspace to shared platform     |
| Add alert correlation and policy-driven incident creation | Makes incident management more realistic for larger operational estates |
| Add production deployment manifests                       | Makes the repository easier to evaluate in a full deployment pipeline   |

## Explicitly Not Yet Implemented

The current repository does not yet include:

- RBAC
- automatic retry backoff or dead-letter queues
- incident read endpoints
- distributed Socket.IO fanout
- production infrastructure manifests

These are tracked as future improvements so the present implementation remains clear and credible.
