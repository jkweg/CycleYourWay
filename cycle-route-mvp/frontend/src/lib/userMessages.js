// Turns low-level browser/network errors into Polish messages for the UI.
// Errors that already carry a server or app message are passed through.
export const NETWORK_ERROR_MESSAGE =
  'Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie.'
export const BAD_RESPONSE_MESSAGE =
  'Serwer odpowiedział nieprawidłowo. Spróbuj ponownie za chwilę.'

const NETWORK_PATTERN = /Failed to fetch|NetworkError when attempting|Load failed|Network request failed|ERR_INTERNET_DISCONNECTED/i
const BAD_JSON_PATTERN = /Unexpected token|is not valid JSON|JSON\.parse|Unexpected end of JSON/i

export function isNetworkError(error) {
  return NETWORK_PATTERN.test(String(error?.message || ''))
}

export function toUserMessage(error, fallback) {
  const message = String(error?.message || '')
  if (isNetworkError(error)) return NETWORK_ERROR_MESSAGE
  if (error?.name === 'SyntaxError' || BAD_JSON_PATTERN.test(message)) return BAD_RESPONSE_MESSAGE
  return message || fallback
}
