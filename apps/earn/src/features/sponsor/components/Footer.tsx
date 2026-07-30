import Link from 'next/link';

import MdOutlineMail from '@earn/components/icons/MdOutlineMail';
import { SupportFormDialog } from '@earn/components/shared/SupportFormDialog';
import { LocalImage } from '@earn/components/ui/local-image';
import { cn } from '@earn/utils/cn';

import { Twitter } from '@earn/features/social/components/SocialIcons';

import { maxW } from '../utils/styles';

type FooterLink = { href?: string; text: string; supportForm?: boolean };

const FooterColumn = ({
  title,
  links,
}: {
  title: string;
  links: FooterLink[];
}) => (
  <div className="flex flex-col items-start">
    <p className="mb-2 text-base font-medium text-white md:text-lg">{title}</p>
    <div className="flex flex-col space-y-2">
      {links
        .filter((s) => !!s.href)
        .map((link) => (
          <Link
            key={link.text}
            href={link.href || ''}
            className="text-sm text-slate-300 transition-colors hover:text-white md:text-base"
            target={link.href?.startsWith('http') ? '_blank' : undefined}
            rel={
              link.href?.startsWith('http') ? 'noopener noreferrer' : undefined
            }
          >
            {link.text}
          </Link>
        ))}
      {links
        .filter((s) => !!s.supportForm)
        .map((link) => (
          <SupportFormDialog key={link.text}>
            <button className="w-fit text-sm text-slate-300 transition-colors hover:text-white md:text-base">
              {link.text}
            </button>
          </SupportFormDialog>
        ))}
    </div>
  </div>
);

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  const about: FooterLink[] = [
    { text: 'Pricing', href: '#pricing' },
    { text: 'Customers', href: '#trusted-by' },
    { text: 'Terms & Conditions', href: '/earn/terms-of-use.pdf' },
    { text: 'Privacy Policy', href: '/earn/privacy-policy.pdf' },
  ];

  const resources: FooterLink[] = [
    {
      text: 'Changelog',
      href: 'https://superteamdao.notion.site/Superteam-Earn-Changelog-faf0c85972a742699ecc07a52b569827',
    },
    {
      text: 'Rate Card',
      href: 'https://docs.google.com/spreadsheets/d/18Pahc-_9WhXezz7DW2kjwE1Iu-ExbOFtoxlPPsavsvg/edit?gid=0#gid=0',
    },
    { text: 'Contact Us', supportForm: true },
  ];

  const opportunities: FooterLink[] = [
    { text: 'Bounty', href: '/earn/bounties' },
    { text: 'Project', href: '/earn/projects' },
    { text: 'Grants', href: '/earn/grants' },
  ];

  return (
    <footer className="w-full border-t border-slate-800 bg-slate-950 text-white">
      <div
        className={cn(
          'mx-auto max-w-7xl px-4 py-10',
          maxW,
          'px-[1.875rem] lg:px-[7rem] xl:px-[11rem]',
        )}
      >
        <div className="flex flex-col items-start justify-between md:flex-row">
          <div className="mb-8 flex flex-col md:mb-0">
            <div className="mb-4 flex items-center gap-4">
              <LocalImage
                className="h-10 object-contain"
                alt="TSION Earn"
                src="/assets/tsion-logo.png"
              />

              <div className="h-6 w-[1.5px] rotate-10 bg-slate-600" />
              <p className="text-sm font-medium tracking-[1.6px] text-slate-50">
                SPONSORS
              </p>
            </div>
            <p className="mb-5 max-w-sm text-lg text-slate-300">
              TSION Earn helps teams publish opportunities and connect with
              skilled contributors.
            </p>
            <div className="flex items-center gap-4">
              <button
                className="text-slate-100 transition-opacity hover:text-white"
                onClick={() => {
                  window.open('mailto:support@superteam.fun', '_blank');
                }}
                aria-label="Email"
              >
                <MdOutlineMail className="size-5" />
              </button>
              <Twitter
                link="https://x.com/TSIONGroup"
                className="text-slate-100 hover:text-white"
              />
            </div>
          </div>

          <div className="grid w-full grid-cols-2 gap-6 md:w-auto md:grid-cols-3 md:gap-16">
            <FooterColumn title="About" links={about} />
            <FooterColumn title="Resources" links={resources} />
            <FooterColumn title="Opportunities" links={opportunities} />
          </div>
        </div>
      </div>
      <div className="border-t border-slate-800 bg-white/11 py-4 pb-2 md:pb-4">
        <div
          className={cn(
            'mx-auto max-w-7xl px-4',
            maxW,
            'px-[1.875rem] lg:px-[7rem] xl:px-[11rem]',
          )}
        >
          <div className="flex flex-col items-start justify-between md:flex-row md:items-center">
            <p className="mb-3 text-sm text-slate-400 md:mb-0">
              © {currentYear} Superteam All Rights Reserved
            </p>
            <p className="hidden text-sm text-slate-400 md:block">
              Thanks for reading this far, use coupon{' '}
              <span className="font-medium text-white">FOOTERS</span> to claim a
              free BOOST
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
