import '../styles/global.css';

export const metadata = {
  title: 'Louis1618 URL Redirect',
  description: 'URL Redirect Manager',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
