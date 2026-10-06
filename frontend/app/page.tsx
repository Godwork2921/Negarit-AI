import Navbar from "../components/Navbar";
import HeroSection from "../components/HeroSection";
import Features from "../components/Features";
import Workflow from "../components/Workflow";
import Testimonials from "../components/Testimonials";
import FAQ from "../components/FAQ";
import Footer from "../components/Footer";

export default function LandingPage() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-brand-gradient focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[var(--text-inverse)]"
      >
        Skip to content
      </a>

      <Navbar />

      <main id="main">
        <HeroSection />
        <Features />
        <Workflow />
        <Testimonials />
        <FAQ />
      </main>

      <Footer />
    </>
  );
}
