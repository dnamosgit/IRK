// Shared shape returned by server actions used with useActionState.
export type ActionState = {
  ok?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
  data?: Record<string, unknown>;
};

export const initialState: ActionState = {};
