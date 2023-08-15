import './globals.css'
import React from "react";
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import ReduxProvider from "@/components/ReduxProvider";
const inter = Inter({ subsets: ['latin'] })
import { ApolloWrapper } from "@/lib/apollo-wrapper";

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
      <body className={`bg-hero-pattern ${inter.className}`}>
        <ReduxProvider>
            <ApolloWrapper>
                {children}
            </ApolloWrapper>
        </ReduxProvider>
      </body>
    </html>
  )
}
