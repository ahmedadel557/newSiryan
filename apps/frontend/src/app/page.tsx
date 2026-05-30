import { LandingNav } from '@/components/landing/LandingNav';
import { HeroSection } from '@/components/landing/HeroSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { RolesSection } from '@/components/landing/RolesSection';
import { HowSection } from '@/components/landing/HowSection';
import { CtaSection } from '@/components/landing/CtaSection';
import { FooterSection } from '@/components/landing/FooterSection';
import { ScrollToTop } from '@/components/landing/ScrollToTop';

export default function LandingPage() {
  return (
    <>
      <LandingNav />
      <HeroSection />
      <FeaturesSection />
      <RolesSection />
      <HowSection />
      <CtaSection />
      <FooterSection />
      <ScrollToTop />
    </>
  );
}
