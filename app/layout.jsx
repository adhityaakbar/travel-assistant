import './globals.css';

export const metadata = {
  title: 'Travel Assistant Japan',
  description: 'Asisten perjalanan personal untuk Jepang'
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
