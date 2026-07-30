export function validateWalletAddress(value: string): boolean {
  const address = value.trim();
  return address.length >= 8 && !/\s/.test(address);
}
