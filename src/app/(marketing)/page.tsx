import { Experience } from "@/components/marketing/Experience";
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
      <HowItWorks />
      <Experience />
      <Occasions />
      <Products />
      <FAQ />
      <FinalCta />
    </>
  );
}
