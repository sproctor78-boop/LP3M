// =============================================================================
// Constraint engine
// =============================================================================
// Public surface for constraint detection. The implementation lives in
// scheduleEngine because constraints and the schedule are tightly coupled, but
// callers should import from this module for clarity.
// =============================================================================

export { detectConstraintIssues } from './scheduleEngine';
