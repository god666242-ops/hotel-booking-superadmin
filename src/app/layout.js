import './globals.css';
import { SuperAdminAuthProvider } from '@/context/SuperAdminAuthContext';
import { FeedbackProvider } from '@/components/Feedback';

export const metadata = { title: 'PureBook Super Admin', robots: { index: false, follow: false } };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SuperAdminAuthProvider>
          <FeedbackProvider>{children}</FeedbackProvider>
        </SuperAdminAuthProvider>
      </body>
    </html>
  );
}
