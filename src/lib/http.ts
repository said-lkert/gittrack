export async function readJsonSafe(response: Response) {
  const text = await response.text();

  if (!text.trim()) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      error: "Invalid JSON response received from the server.",
      details: text.slice(0, 300),
    };
  }
}

export function buildHttpError(response: Response, json: any, fallback: string) {
  if (json?.details || json?.error) {
    return new Error(json.details || json.error);
  }

  if (response.status === 404) {
    return new Error(`${fallback} Route not found on the backend (${response.status}).`);
  }

  return new Error(`${fallback} (${response.status}).`);
}
