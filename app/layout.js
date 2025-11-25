import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AnimatedBackground from "../components/AnimatedBackground";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "GangaGen AI EctoLysin - Powered by Orbuculum",
  description: "Advanced healthcare management platform for modern medical practices",
  keywords: "healthcare, medical, patient management, health records, medical practice",
  authors: [{ name: "GangaGen Team" }],
  openGraph: {
    title: "GangaGen AI EctoLysin - Powered by Orbuculum",
    description: "Advanced healthcare management platform for modern medical practices",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AnimatedBackground />
        <main>
          {children}
        </main>
      </body>
    </html>
  );
}
