# Development guardrail

For every change that introduces or changes automatic network work, effects, polling, subscriptions, pagination or retries, trace all triggers and dependencies before implementation. Verify that rerenders, invalidation, remounts, retries, multiple windows and cancellation cannot cause repeated scans or unbounded request traffic. Bound the number and rate of requests, deduplicate where appropriate, respect server backoff, and add a meaningful regression test. Do not fetch historical data automatically for a purely decorative interface element.
