import { ENV } from './env';

export const log = (...values) => {
  if (ENV.DEBUG) {
    const [message, ...rest] = values;
    global.console.log(message, rest);
  }
};
