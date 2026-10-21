import { toast } from "sonner";

/** Shows an error toast with the server's error message, when there is one, as its description. */
export const showError = (message: string, error: unknown): void => {
  toast.error(message, { description: error instanceof Error ? error.message : undefined });
};
