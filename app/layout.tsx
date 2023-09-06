import './globals.css'
import React from "react";
import type { Metadata } from 'next'
import { Josefin_Sans } from "next/font/google";
import ReduxProvider from "@/components/others/ReduxProvider";

const josefinSans = Josefin_Sans({ weight: '400', subsets: ['latin'] })
import { ApolloWrapper } from "@/lib/apollo-wrapper";
// import Navbar from "@/components/navbar/Navbar";

export const metadata: Metadata = {
  title: 'Tokyo Sushi Bar',
  description: 'Situé au cœur de Liège, Tokyo Sushi Bar propose une expérience sushi authentique et de haute qualité. Réservez votre table et dégustez les meilleurs sushis de la ville!',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`bg-tsb-gray text-off-white ${josefinSans.className}`}>
        <ReduxProvider>
            <ApolloWrapper>
                {children}
            </ApolloWrapper>
        </ReduxProvider>
      </body>
    </html>
  )
}
