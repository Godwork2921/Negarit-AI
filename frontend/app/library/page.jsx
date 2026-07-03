"use client";
import { motion } from "framer-motion";
import Sidebar from "../../components/Sidebar";
import LibraryPanel from "../../components/LibraryPanel";
import content from "../../lib/library-content";

export default function LibraryPage() {
  return (
    <div className="min-h-screen flex bg-[#0a0a1a] text-white">
      <Sidebar />
      <main className="flex-1 lg:ml-48 p-6 lg:p-10">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
          <LibraryPanel articles={content.libraryArticles} videos={content.videos} />
        </motion.div>
      </main>
    </div>
  );
}
