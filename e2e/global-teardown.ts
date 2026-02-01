/**
 * Global teardown - runs ONCE after all tests complete.
 * Cleanup is optional since we recreate test user on each run.
 */
async function globalTeardown(): Promise<void> {
  console.log('\n🧹 [Global Teardown] E2E tests completed.');
  // Optional: Add cleanup logic here if needed
  // For now, we keep test data for debugging purposes
}

export default globalTeardown;
