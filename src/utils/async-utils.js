/**
 * Runs a promise with a timeout limit.
 * 
 * If the provided promise does not settle (resolve or reject)
 * within the specified time, the returned promise rejects
 * with an error. You can optionally provide a custom error message.
 *
 * @template T
 * @param {Promise<T>} promise - The asynchronous operation to execute.
 * @param {number} ms - The timeout duration in milliseconds.
 * @param {string} [error='Timeout exceeded'] - Optional custom error message for the timeout.
 * @returns {Promise<T>} A promise that resolves with the result of `promise`,
 *                       or rejects with an `Error` if the timeout is exceeded.
 *
 * @throws {Error} Throws an `Error` with either the provided custom message 
 *                 or `'Timeout exceeded'` if the operation takes too long.
 *
 * @example
 * // Example usage with default timeout message:
 * const data = await withTimeout(fetchData(), 5000);
 * 
 * @example
 * // Example usage with custom timeout message:
 * const data = await withTimeout(fetchData(), 5000, 'Server did not respond in time');
 */
export const withTimeout = async (promise, ms, error) => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(error || 'Timeout exceeded')), ms)
    ),
  ]);
};

/**
 * Retries an asynchronous function multiple times with optional exponential backoff.
 *
 * @template T
 * @param {() => Promise<T>} fn - The asynchronous function to execute.
 * @param {number} [retries=2] - The number of retry attempts (total tries = retries).
 * @param {number} [delay=500] - Initial delay between retries, in milliseconds.
 * @returns {Promise<T>} Resolves with the result of `fn()` if it eventually succeeds.
 * @throws Will throw the last error if all retry attempts fail.
 *
 * @example
 * // Example usage:
 * const data = await retryWithBackoff(() => axios.get('/api/data'), 3, 1000);
 * console.log(data);
 */
export async function retryWithBackoff(fn, retries = 2, delay = 500) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries - 1) throw err; 
      console.warn(`Retry ${i + 1} failed, waiting ${delay}ms...`);
      await new Promise(res => setTimeout(res, delay));
      delay *= 2; 
    }
  }
}
