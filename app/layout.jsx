import './globals.css';

export const metadata = {
  title: 'Travel Assistant Japan',
  description: 'Asisten perjalanan personal untuk Jepang'
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
