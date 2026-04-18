import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom"; // 1. Import useNavigate

import img1 from "../assets/slide1.png"; 
import img2 from "../assets/slide2.png";
import img3 from "../assets/slide3.png";
import img4 from "../assets/slide4.png";
import img5 from "../assets/slide5.png";

const images = [img1, img2, img3, img4, img5];

export default function HeroSlideshow() {
  const [index, setIndex] = useState(0);
  const navigate = useNavigate(); // 2. Initialize the hook

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
          transition={{ delay: 1, duration: 1, ease: "easeOut" }}
        >
          Glow Aroma
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
        >
          Make Your Own Candle
        </motion.p>
        
        {/* 3. Use a standard button with navigate() */}
        <button 
          className="glow-btn" 
          onClick={() => navigate("/products")}
        >
          Explore Now
        </button>
      </div>
    </div>
  );
}