import localFont from 'next/font/local';

const fontSans = localFont({
  src: '../../public/fonts/Satoshi-Variable.woff2',
  display: 'swap',
  preload: true,
  weight: '300 900',
  variable: '--font-sans',
});

const fontMono = localFont({
  src: '../../public/OverusedGrotesk-VF.woff2',
  display: 'swap',
  preload: false,
  weight: '300 900',
  variable: '--font-mono',
});

export const fontVariables = [fontSans.variable, fontMono.variable].join(' ');
