
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
      <main>
          <section className="min-h-screen bg-white">
              <div className="min-h-screen flex justify-center items-center">
                  <div className="w-full grid md:grid-cols-2 2xl:gap-x-36 xl:gap-x-20 lg:gap-x-12">

                      <div className="w-full flex flex-col items-center md:items-end justify-center mb-8">
                          <Manekineko />
                      </div>


                      <div className="flex flex-col items-center md:items-start justify-center mb-8">
                          <div className="flex flex-col items-center justify-center">
                              {/*
                              <h1 className={`${kaushanScript.className} text-9xl w-full mb-4 text-center`}>Tokyo</h1>
                              <h2 className="text-6xl flex-1 w-full mb-4 text-center">SUSHI & BAR</h2>
                              <Image
                                  src="/images/tsb_logo.jpg"
                                  alt="Tokyo Sushi Bar logo"
                                  width={250}
                                  height={250}
                                  draggable={false}
                              />
                              */}
                              <h1 className="lg:text-9xl text-8xl w-full text-center tracking-tight">TOKYO</h1>
                              <h2 className="lg:text-5xl text-4xl flex-1 w-full -mt-2 mb-8 text-center tracking-widest">SUSHI & BAR</h2>
                              <DeliveryButton />
                          </div>
                      </div>
                  </div>
              </div>
          </section>
      </main>
  )
}
