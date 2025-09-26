import { config } from '../config/env';

type LogMethod = (message?: any, ...optionalParams: any[]) => void;

function makeLogger() {
  const isDev = config.isDev;

  const debug: LogMethod = isDev ? console.debug.bind(console) : () => {};
  const info: LogMethod = isDev ? console.info.bind(console) : () => {};
  const warn: LogMethod = console.warn.bind(console);
  const error: LogMethod = console.error.bind(console);

  return { debug, info, warn, error };
}

export const logger = makeLogger();


