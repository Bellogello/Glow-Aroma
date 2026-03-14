import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// These paths say: "Go out of components, into assets, and find the file"
import img1 from "../assets/slide1.png"; 
import img2 from "../assets/slide2.png";
import img3 from "../assets/slide3.png";
import img4 from "../assets/slide4.png";
import img5 from "../assets/slide5.png";

const images = [img1, img2, img3, img4, img5];

export default function HeroSlideshow() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % images.length);
    }, 6500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="slideshow-wrapper">
      <AnimatePresence mode="wait">
        <motion.img
          key={index}
          src={images[index]}
          initial={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, filter: "blur(10px)" }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
          className="main-slide-img"
        />
      </AnimatePresence>

      <div className="slideshow-content">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 3, duration: 1, ease: "easeOut" }}
        >
          Glow Aroma
        </motion.h1>
        <p>Make Your Own Candle</p>
        <button className="glow-btn">Explore Now</button>
      </div>
    </div>
  );
}