import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";

export default function HeroSlideshow() {
  const [images, setImages] = useState([]);
  const [index, setIndex] = useState(0);
  const navigate = useNavigate();

  // 1. Fetch images on load
  useEffect(() => {
    fetch(`${API_BASE_URL}/hero-images`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          // Map database URLs to full URLs
          const urls = data.map(img => img.image_url.startsWith('http') ? img.image_url : `${API_BASE_URL}${img.image_url}`);
          setImages(urls);
        }
      })
      .catch(err => console.error("Failed to load hero images", err));
  }, []);

  // 2. Start timer only if images exist
  useEffect(() => {
    if (images.length === 0) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % images.length);
    }, 6500);
    return () => clearInterval(timer);
  }, [images]);

  // Prevent crashing if no images are uploaded yet
  if (images.length === 0) return <div className="slideshow-wrapper" style={{ backgroundColor: '#2d241c' }}></div>;

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