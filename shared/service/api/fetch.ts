type APIResponse<T> = {
  ok: boolean;
  message?: string;
  error?: string;
  data: T;
};
export async function fetchApi<T>(url: string, options?: RequestInit) {
  const response = fetch(`/api/${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });
  const data = await (await response).json();
  return data as APIResponse<T>;
}
