/**
 * Converts a time value in the format of `number[smhd]` to milliseconds.
 *
 * @param value The value to convert to milliseconds. The value should be a string in the format of `number[smhd]`, where `s` is seconds, `m` is minutes, `h` is hours, and `d` is days.
 * @returns The value in milliseconds.
 * @throws {Error} If the value is not in the correct format.
 * @example
 * ```typescript
 * ms('5s'); // returns 5000
 * ms('2m'); // returns 120000
 * ms('1h'); // returns 3600000
 * ms('1d'); // returns 86400000
 * ```
 */
export const ms = (value: string): number => {
  const match = value.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error('Invalid time format');
  }
  const num = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 's':
      return num * 1000;
    case 'm':
      return num * 60 * 1000;
    case 'h':
      return num * 60 * 60 * 1000;
    case 'd':
      return num * 24 * 60 * 60 * 1000;
    default:
      throw new Error('Invalid time unit');
  }
};
