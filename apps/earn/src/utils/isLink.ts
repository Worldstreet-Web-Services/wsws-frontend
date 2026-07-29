import { URL_REGEX } from '@earn/constants/URL_REGEX';

export const isLink = (text: string) => {
  return URL_REGEX.test(text);
};
