
import { Kaushan_Script } from "next/font/google";
const kaushanScript = Kaushan_Script({ weight: '400', subsets: ['latin'] })
import Image from 'next/image'
import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import Manekineko from "@/components/Manekineko";
import DeliveryButton from "@/components/DeliveryButton";

export default function Home() {
  return (
      <main className="bg-tsb-gray">
          <section className="min-h-screen bg-tsb-gray">
              <div className="min-h-screen flex justify-center items-center">
                  <div className="flex flex-col items-center md:items-start justify-center mb-8">
                      <div className="flex flex-col items-center justify-center">
                          <Image
                              src={"/images/tsb-logo.svg"}
                              alt="Tokyo Sushi Bar logo"
                              width="380"
                              height="380"
                              draggable={false}
                              className="relative -left-8 mb-10"
                          />
                          {/*
                              <h1 className="lg:text-9xl text-8xl w-full text-center tracking-tight">TOKYO</h1>
                              <h2 className="lg:text-5xl text-4xl flex-1 w-full -mt-2 mb-8 text-center tracking-widest">SUSHI & BAR</h2>
                              */}
                          <DeliveryButton />
                      </div>
                  </div>
              </div>
          </section>
      </main>
  )
}
