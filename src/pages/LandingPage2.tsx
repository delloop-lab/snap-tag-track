import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const LandingPage2 = () => {
  return (
    <main className="flex min-h-screen justify-center items-center p-4 md:p-8 relative">
      <div className="flex flex-col lg:flex-row w-full max-w-[1100px] bg-white rounded-[24px] shadow-[0_8px_32px_rgba(44,62,80,0.10)] overflow-hidden">
        {/* Left Section */}
        <section className="flex-[0_0_40%] max-w-[440px] p-8 lg:p-[2.2rem_2rem_0_2vw] min-w-[300px] z-[5]">
          <div className="flex flex-col justify-center h-full min-h-[450px] lg:min-h-[650px]">
            <div className="mb-6 lg:mb-12">
              <img 
                src="/home/_assets/media/f0e22dab0a9645220a4eb65c48b50b4c.png" 
                alt="SnapTagTrak Logo" 
                className="h-[40px] lg:h-[60px] mt-2 lg:mt-5"
              />
            </div>
            
            <h1 className="text-[2rem] lg:text-[2.8rem] font-extrabold text-[#666] mt-2 lg:mt-5 mb-6 lg:mb-11 leading-[1.1] tracking-[-1px] pt-[10px] lg:pt-[20px]">
              Turn every receipt into a searchable, trackable, organised record.
            </h1>
            
            <Link 
              to="/auth" 
              className="inline-block bg-[#80ba82] text-white px-8 lg:px-11 py-3 lg:py-4 rounded-[30px] text-base lg:text-[1.15rem] font-bold mb-4 cursor-pointer transition-colors hover:bg-[#6da56f] shadow-[0_2px_8px_rgba(128,186,130,0.08)] text-center w-full"
            >
              GET STARTED IT'S FREE
            </Link>
            
            <div className="text-sm lg:text-base text-[#222] mb-4 mt-6 lg:mt-[50px]">
              <p className="mb-2 lg:mb-3">
                The easiest way to stay on top of your receipts, spending, and warranties—no matter who you are or what you buy.
              </p>
              <p className="mb-2 lg:mb-3">
                No need to download an APP – it works on any device you have a browser.
              </p>
            </div>
            
            <div className="flex gap-6 lg:gap-14 mt-6 lg:mt-9 justify-start">
              <div className="flex flex-col items-center min-w-[100px] lg:min-w-[120px] text-center">
                <img 
                  src="/assets/images/camera-icon.svg" 
                  alt="Snap Icon" 
                  className="w-10 h-10 lg:w-12 lg:h-12 mb-2 lg:mb-3"
                />
                <span className="text-sm lg:text-[1.08rem] font-bold tracking-[0.5px] mt-0.5 block mb-0.5 text-[#ff9708]">SNAP YOUR RECEIPT</span>
              </div>
              
              <div className="flex flex-col items-center min-w-[100px] lg:min-w-[120px] text-center">
                <img 
                  src="/assets/images/tag-icon.svg" 
                  alt="Tag Icon" 
                  className="w-10 h-10 lg:w-12 lg:h-12 mb-2 lg:mb-3"
                />
                <span className="text-sm lg:text-[1.08rem] font-bold tracking-[0.5px] mt-0.5 block mb-0.5 text-[#2b3990]">TAG IT YOUR WAY</span>
              </div>
              
              <div className="flex flex-col items-center min-w-[100px] lg:min-w-[120px] text-center">
                <img 
                  src="/assets/images/track-icon.svg" 
                  alt="Track Icon" 
                  className="w-10 h-10 lg:w-12 lg:h-12 mb-2 lg:mb-3"
                />
                <span className="text-sm lg:text-[1.08rem] font-bold tracking-[0.5px] mt-0.5 block mb-0.5 text-[#80ba82]">TRACK IT WITH EASE</span>
              </div>
            </div>
          </div>
        </section>

        {/* Right Section */}
        <section className="flex-1 min-w-0 relative min-h-[300px] lg:min-h-[700px] overflow-hidden bg-white">
          <div className="hidden lg:block absolute -right-[10%] -top-[10%] w-[110%] h-[110%] bg-[#4285f4] rounded-full z-[1] opacity-[0.18]"></div>
          <div className="hidden lg:block absolute right-[8%] top-[4%] w-[200px] h-[140px] bg-[radial-gradient(#2b3990_1.5px,transparent_1.5px)] bg-[length:18px_18px] opacity-25 z-[2] pointer-events-none"></div>
          
          <div className="relative z-[3] w-full h-full">
            <img 
              src="/home/_assets/media/5cdfca5bafd425675a5bfdc47417d87c.png" 
              alt="Woman with receipt" 
              className="absolute left-0 top-0 w-full h-full object-cover object-right"
            />
            
            <div className="absolute bottom-4 right-4 lg:bottom-8 lg:right-8 bg-white p-3 lg:p-4 rounded-[22px] shadow-[0_8px_32px_rgba(44,62,80,0.18)] z-[4]">
              <img 
                src="/home/_assets/media/8d0db40693fba92d239ee56243f720ee.png" 
                alt="QR Code" 
                className="w-24 h-24 lg:w-32 lg:h-32 mb-2"
              />
              <span className="text-xs lg:text-sm text-gray-600 block text-center">Mobile Version</span>
            </div>
          </div>
        </section>
      </div>

      {/* Version Number */}
      <div className="absolute bottom-4 right-4 text-gray-400 text-sm">
        V0.9.01
      </div>
    </main>
  );
};

export default LandingPage2; 