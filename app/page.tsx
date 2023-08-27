
import { Kaushan_Script } from "next/font/google";
const kaushanScript = Kaushan_Script({ weight: '400', subsets: ['latin'] })
import Image from 'next/image'
import React from "react";
import Link from "next/link";

export default function Home() {
  return (
      <main>
          <section className="min-h-screen bg-white">
              <div className="min-h-screen flex justify-center items-center">
                  <div className="w-full grid lg:grid-cols-2">

                      <div className="w-full flex items-center justify-center mb-8">
                          <Image
                              src="/images/maneki-neko-3.png"
                              alt="Tokyo Sushi Bar maneki neko"
                              width={500}
                              height={500}
                              draggable={false}
                          />
                      </div>

                      <div className="w-full flex flex-col items-center justify-center mb-8">
                          <div className="flex flex-col items-center justify-center lg:-translate-x-28">
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
                              <h1 className={`text-9xl w-full text-center tracking-tight`}>TOKYO</h1>
                              <h2 className="text- text-5xl flex-1 w-full -mt-2 mb-8 text-center tracking-widest">SUSHI & BAR</h2>
                          </div>

                          <button
                              className="px-8 text-2xl rounded-2xl h-16 text-charcoal font-semibold  bg-white border-coralPink border-2 transition-all duration-300 shadow-md hover:shadow-lg hover:text-offWhite hover:bg-coralPink-darker transform hover:-translate-y-1 lg:-translate-x-28"
                          >
                              <Link href="/menu">
                                  LIVRAISON
                              </Link>
                          </button>
                      </div>
                  </div>
              </div>
          </section>
      </main>

  )
}
