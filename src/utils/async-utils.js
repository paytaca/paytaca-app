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
