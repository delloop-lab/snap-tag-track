import { useNavigate } from "react-router-dom";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Hero Section */}
      <section className="w-full bg-blue-600 text-white py-10 flex flex-col md:flex-row items-center justify-center">
        {/* Hero text and button on the left */}
        <div className="w-full md:w-1/2 flex flex-col items-center md:items-start text-center md:text-left px-4">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">Snap it. Tag it. Track it.</h1>
          <p className="text-lg md:text-xl mb-2">
            The easiest way to stay on top of your receipts, spending, and warranties—no matter who you are or what you buy.
          </p>
          <p className="text-lg md:text-xl mb-8 font-semibold">
            No need to download an APP – it works on any device you have a browser.
          </p>
          <button
            className="bg-white text-blue-600 font-bold px-8 py-3 rounded-full shadow hover:bg-blue-100 transition"
            onClick={() => navigate("/auth")}
          >
            Try it now, it's free!
          </button>
        </div>
        {/* Phone and PC images on the right */}
        <div className="w-full md:w-1/2 flex flex-row justify-center items-center gap-4 mt-8 md:mt-0 px-4">
          <img
            src="/phone.png"
            alt="App on phone"
            className="w-32 md:w-44"
          />
          <img
            src="/pc.png"
            alt="App on PC"
            className="w-40 md:w-56"
          />
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-5xl mx-auto py-16 px-4">
        <h2 className="text-3xl font-bold text-center mb-10">How It Works</h2>
        <div className="flex flex-col md:flex-row gap-8 justify-center">
          <div className="w-full md:w-1/3 bg-white rounded-xl shadow p-6 flex flex-col items-center">
            <span className="text-4xl mb-4">📸</span>
            <h3 className="font-bold text-xl mb-2">Snap your receipt</h3>
            <p className="text-center text-gray-600">Take a photo right from your phone.</p>
          </div>
          <div className="w-full md:w-1/3 bg-white rounded-xl shadow p-6 flex flex-col items-center">
            <span className="text-4xl mb-4">🏷️</span>
            <h3 className="font-bold text-xl mb-2">Tag it your way</h3>
            <p className="text-center text-gray-600">Add a tag like store, category, client or project.</p>
          </div>
          <div className="w-full md:w-1/3 bg-white rounded-xl shadow p-6 flex flex-col items-center">
            <span className="text-4xl mb-4">📊</span>
            <h3 className="font-bold text-xl mb-2">Track with ease</h3>
            <p className="text-center text-gray-600">See everything organised, searchable, and ready when you need it.</p>
          </div>
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