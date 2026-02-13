export function createDMKey(userA: string, userB: string) {
  return [userA, userB].sort().join("_");
}
