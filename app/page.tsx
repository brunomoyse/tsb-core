import React from "react";
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
                              <h1 className="lg:text-9xl text-7xl w-full text-center tracking-tight">TOKYO</h1>
                              <h2 className="lg:text-5xl text-3xl flex-1 w-full -mt-2 mb-8 text-center tracking-widest">SUSHI & BAR</h2>
                              <DeliveryButton />
                          </div>
                      </div>
                  </div>
              </div>
          </section>
          <section className="min-h-screen bg-white"></section>
      </main>
  )
}
