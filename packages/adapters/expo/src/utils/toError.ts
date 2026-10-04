export const toError = <TThrown>(thrown: TThrown): Error => {
  if (thrown instanceof Error) {
    return thrown;
  }

  return new Error(`${thrown}`);
};
