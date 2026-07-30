import FaDiscord from '@earn/components/icons/FaDiscord';
import FaGithub from '@earn/components/icons/FaGithub';
import FaGlobe from '@earn/components/icons/FaGlobe';
import FaLinkedin from '@earn/components/icons/FaLinkedin';
import FaTelegram from '@earn/components/icons/FaTelegram';
import FaXTwitter from '@earn/components/icons/FaXTwitter';
import { type IconType } from '@earn/components/icons/helpers/GenIcon';

export type SocialType =
  | 'discord'
  | 'twitter'
  | 'github'
  | 'linkedin'
  | 'telegram'
  | 'website';
interface Social {
  name: SocialType;
  placeholder: string;
  icon: IconType;
  prefix: string | undefined;
  label: string | undefined;
}
export const socials: Social[] = [
  {
    name: 'discord',
    placeholder: 'johncena',
    icon: FaDiscord,
    prefix: undefined,
    label: undefined,
  },
  {
    name: 'twitter',
    label: 'x.com/',
    placeholder: 'johncena',
    icon: FaXTwitter,
    prefix: 'https://x.com/',
  },
  {
    name: 'github',
    label: 'github.com/',
    placeholder: 'johncena',
    icon: FaGithub,
    prefix: 'https://github.com/',
  },
  {
    name: 'linkedin',
    label: 'linkedin.com/in/',
    placeholder: 'johncena',
    icon: FaLinkedin,
    prefix: 'https://linkedin.com/in/',
  },
  {
    name: 'telegram',
    label: 't.me/',
    placeholder: 'tonystark',
    icon: FaTelegram,
    prefix: 'https://t.me/',
  },
  {
    name: 'website',
    placeholder: 'https://starkindustries.com',
    icon: FaGlobe,
    prefix: 'https://',
    label: 'https://',
  },
] as const;
