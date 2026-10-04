export const getMockError = (error: Error | undefined) =>
  error ?? new Error("The mock was told to fail.");
