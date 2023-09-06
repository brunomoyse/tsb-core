
import Image from 'next/image'
import React from "react";
// import Manekineko from "@/components/home/Manekineko";
import DeliveryButton from "@/components/buttons/DeliveryButton";
import TokyoSushiLogo from "@/components/home/TokyoSushiLogo";

export default function Home() {
  return (
      <main className="bg-tsb-gray">
          <section className="min-h-screen bg-tsb-gray">
              <div className="min-h-screen flex justify-center items-center">
                  <div className="flex flex-col items-center md:items-start justify-center mb-8">
                      <div className="flex flex-col items-center justify-center">
                          <TokyoSushiLogo />
                          <DeliveryButton />
                      </div>
                  </div>
              </div>
          </section>
      </main>
  )
}
