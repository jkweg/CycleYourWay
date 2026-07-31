/**
 * Detect ORS failures caused by alternative_routes limits
 * (typically when the routed distance exceeds ~100 km).
 */
const isAlternativesLimitError = (errorOrApiData) => {
  const apiData = errorOrApiData?.response?.data ?? errorOrApiData;
  const status = errorOrApiData?.response?.status;
  const code = apiData?.error?.code;
  const message = String(apiData?.error?.message || apiData?.error || "");

  if (status != null && status !== 400 && status !== 404) {
    return false;
  }

  if (code === 2003 || code === 2004 || code === 2099) {
    return true;
  }

  return (
    /alternative/i.test(message) ||
    /must not be greater/i.test(message) ||
    /maximum distance/i.test(message) ||
    /route length/i.test(message) ||
    /too long/i.test(message)
  );
};

module.exports = {
  isAlternativesLimitError,
};
