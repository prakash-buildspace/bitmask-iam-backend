export interface ErrorLogDetails {
  error: string;
  stack?: string;
}

export function getErrorLogDetails(error: unknown): ErrorLogDetails {
  if (error instanceof Error) {
    return {
      error: error.message,
      stack: error.stack,
    };
  }

  if (typeof error === 'string') {
    return { error };
  }

  return { error: 'Unknown error occurred' };
}
