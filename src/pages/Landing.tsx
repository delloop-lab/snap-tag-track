import React from "react";
import { useNavigate } from "react-router-dom";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="bg-gray-50 min-h-screen relative">
      {/* Hero Section */}
      <section className="w-full bg-gradient-to-br from-blue-600 via-blue-500 to-blue-700 text-white py-6 flex justify-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="w-96 h-96 bg-blue-400 opacity-20 rounded-full blur-3xl absolute -top-32 -left-32 animate-pulse"></div>
          <div className="w-96 h-96 bg-blue-800 opacity-20 rounded-full blur-3xl absolute -bottom-32 -right-32 animate-pulse"></div>
        </div>
        <div className="w-11/12 md:w-3/4 mx-auto flex flex-col md:flex-row items-center justify-center relative z-10">
          {/* Hero text and button on the left */}
          <div className="w-full md:w-1/2 flex flex-col items-center md:items-start text-center md:text-left px-4 animate-fade-in">
            <h1 className="text-3xl md:text-5xl font-bold mb-4 drop-shadow-lg">Snap it. Tag it. Track it.</h1>
            <p className="text-lg md:text-xl mb-2 opacity-90">
              The easiest way to stay on top of your receipts, spending, and warranties—no matter who you are or what you buy.
            </p>
            <p className="text-lg md:text-xl mb-6 font-semibold opacity-90">
              No need to download an APP – it works on any device you have a browser.
            </p>
            <button
              className="bg-white text-blue-600 font-bold px-8 py-3 rounded-full shadow-xl hover:bg-blue-100 transition transform hover:scale-105 focus:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300 animate-bounce"
              onClick={() => navigate("/auth")}
            >
              Try it now, it's free!
            </button>
          </div>
          {/* Phone and PC images on the right */}
          <div className="w-full md:w-1/2 flex justify-center items-center mt-8 md:mt-0">
            <img
              src="/assets/images/hero-image.png"
              alt="App Preview"
              className="w-full max-w-lg transform hover:scale-105 transition-transform duration-300"
            />
          </div>
        </div>
      </section>

      {/* Version Number */}
      <div className="absolute bottom-4 right-4 text-gray-400 text-sm">
        V0.9.977
      </div>

      {/* How It Works */}
      <section className="max-w-5xl mx-auto py-6 px-4">
        <h2 className="text-3xl font-bold text-center mb-6">How It Works</h2>
        <div className="flex flex-col md:flex-row gap-6 justify-center">
          {[
            { icon: "📸", title: "Snap your receipt", desc: "Take a photo right from your phone." },
            { icon: "🏷️", title: "Tag it your way", desc: "Add a tag like store, category, client or project." },
            { icon: "📊", title: "Track with ease", desc: "See everything organised, searchable, and ready when you need it." }
          ].map((step, idx) => (
            <div
              key={step.title}
              className="w-full md:w-1/3 bg-white rounded-xl shadow p-6 flex flex-col items-center transition-transform duration-300 hover:scale-105 hover:shadow-2xl animate-fade-in-up"
              style={{ animationDelay: `${idx * 0.1 + 0.2}s` }}
            >
              <span className="text-4xl mb-4">{step.icon}</span>
              <h3 className="font-bold text-xl mb-2">{step.title}</h3>
              <p className="text-center text-gray-600">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why Use It */}
      <section className="max-w-5xl mx-auto py-16 px-4">
        <h2 className="text-3xl font-bold text-center mb-10">Why Use It?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
          <div className="flex items-center gap-4">
            <span className="text-green-500 text-2xl">✔️</span>
            <span>Works for personal & business expenses</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-green-500 text-2xl">✔️</span>
            <span>Tracks warranties for easy returns</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-green-500 text-2xl">✔️</span>
            <span>Great for budgeting, taxes, and reimbursements</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-green-500 text-2xl">✔️</span>
            <span>No more lost receipts or messy folders</span>
          </div>
        </div>
      </section>

      {/* Who It's For */}
      <section className="max-w-5xl mx-auto py-16 px-4">
        <h2 className="text-3xl font-bold text-center mb-10">Who It's For</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 text-center">
          <div>
            <span className="text-3xl">👨‍👩‍👧‍👦</span>
            <div>Individuals & families</div>
          </div>
          <div>
            <span className="text-3xl">🧑‍💻</span>
            <div>Freelancers & contractors</div>
          </div>
          <div>
            <span className="text-3xl">🏢</span>
            <div>Small business owners</div>
          </div>
          <div>
            <span className="text-3xl">💸</span>
            <div>Anyone who spends money and wants to track it</div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="w-full bg-blue-700 text-white py-16 flex flex-col items-center justify-center">
        <h2 className="text-3xl font-bold mb-4">Ready to get organised?</h2>
        <p className="mb-8 text-lg">Start snapping and tagging today.</p>
        <button
          className="bg-white text-blue-700 font-bold px-8 py-3 rounded-full shadow hover:bg-blue-100 transition"
          onClick={() => navigate("/auth")}
        >
          Try it now, it's free!
        </button>
      </section>
    </div>
  );
} 