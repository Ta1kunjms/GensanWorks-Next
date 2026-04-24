/**
 * Standard fetcher for TanStack Query (React Query).
 * Automatically handles response status and parsing.
 */
export async function queryFetcher<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(errorData.error || "An error occurred while fetching data");
    (error as any).status = response.status;
    (error as any).details = errorData;
    throw error;
  }
  
  return response.json();
}
