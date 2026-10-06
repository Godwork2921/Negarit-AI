"use client";

import { motion } from "framer-motion";
import Sidebar from "../../components/Sidebar";
import AmbientBackdrop from "../../components/AmbientBackdrop";
import LibraryPanel from "../../components/LibraryPanel";
import { EASE } from "../../lib/animations";
import content from "../../lib/library-content";

export default function LibraryPage() {
  return (
    <div className="relative min-h-screen">
      <Sidebar />
      <AmbientBackdrop />

      <main className="relative z-10 mx-auto max-w-6xl px-6 pb-20 pt-20 lg:ml-64 lg:pt-12">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE.out }}
        >
          <LibraryPanel
            articles={content.libraryArticles}
            videos={content.videos}
          />
        </motion.div>
      </main>
    </div>
  );
}
