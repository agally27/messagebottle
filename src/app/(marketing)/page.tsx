import { BrandMoment } from "@/components/marketing/BrandMoment";
import { ChristmasSection } from "@/components/marketing/ChristmasSection";
import { Experience } from "@/components/marketing/Experience";
import { MemorySection } from "@/components/marketing/MemorySection";
import { InsideTheBox } from "@/components/marketing/InsideTheBox";
import { FAQ } from "@/components/marketing/FAQ";
import { FinalCta } from "@/components/marketing/FinalCta";
import { Hero } from "@/components/marketing/Hero";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { Occasions } from "@/components/marketing/Occasions";
import { Products } from "@/components/marketing/Products";

export default function HomePage() {
  return (
    <>
      <Hero />
      <ChristmasSection />
      <HowItWorks />
      <InsideTheBox />
      <Experience />
      <MemorySection />
      <Occasions />
      <Products />
      <BrandMoment />
      <FAQ />
      <FinalCta />
    </>
  );
}

/** Re-check the seasonal (Christmas) window hourly. */
export const revalidate = 3600;
