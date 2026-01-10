import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ProductImageCarouselProps {
  images: string[];
  productName: string;
}

export function ProductImageCarousel({
  images,
  productName,
}: ProductImageCarouselProps) {
  const [current, setCurrent] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const nextSlide = useCallback(() => {
    setCurrent((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const prevSlide = useCallback(() => {
    setCurrent((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  useEffect(() => {
    if (isHovered) return;
    const timer = setInterval(nextSlide, 5000);
    return () => clearInterval(timer);
  }, [nextSlide, isHovered]);

  if (!images || images.length === 0) return null;

  return (
    <div 
      className="relative w-full space-y-4"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Main Image Stage */}
      <div className="relative aspect-[4/3] md:aspect-video w-full overflow-hidden rounded-xl border bg-muted">
        <div 
            className="flex h-full transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${current * 100}%)` }}
        >
            {images.map((img, index) => (
                <div key={index} className="min-w-full h-full flex items-center justify-center p-2">
                    <img
                        src={img}
                        alt={`${productName} - View ${index + 1}`}
                        className="max-h-full max-w-full object-contain"
                    />
                </div>
            ))}
        </div>

        {/* Navigation Buttons */}
        <div className="absolute inset-0 flex items-center justify-between p-2 pointer-events-none">
            <Button
                variant="secondary"
                size="icon"
                className={cn(
                    "pointer-events-auto h-8 w-8 md:h-10 md:w-10 rounded-full shadow-lg opacity-0 transition-opacity", 
                    (isHovered || images.length > 1) && "opacity-100 bg-background/80 hover:bg-background"
                )}
                onClick={prevSlide}
                disabled={images.length <= 1}
            >
                <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
            <Button
                variant="secondary"
                size="icon"
                className={cn(
                    "pointer-events-auto h-8 w-8 md:h-10 md:w-10 rounded-full shadow-lg opacity-0 transition-opacity", 
                    (isHovered || images.length > 1) && "opacity-100 bg-background/80 hover:bg-background"
                )}
                onClick={nextSlide}
                disabled={images.length <= 1}
            >
                <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
        </div>

        {/* Counter Badge */}
        <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm">
            {current + 1} / {images.length}
        </div>
      </div>

      {/* Thumbnails */}
      <div className="flex gap-2 overflow-x-auto pb-2 justify-start md:justify-center scrollbar-hide">
        {images.map((img, index) => (
            <button
                key={index}
                onClick={() => setCurrent(index)}
                className={cn(
                    "relative flex-none w-16 h-16 md:w-20 md:h-20 rounded-md overflow-hidden border-2 transition-all",
                    current === index 
                        ? "border-primary ring-2 ring-primary/30" 
                        : "border-transparent opacity-60 hover:opacity-100"
                )}
            >
                <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
        ))}
      </div>
    </div>
  );
}
