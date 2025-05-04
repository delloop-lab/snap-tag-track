import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "./AuthProvider";
import { toast } from "@/components/ui/use-toast";
import { Menu, X, Home } from "lucide-react";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

const Navbar = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signOutDialogOpen, setSignOutDialogOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    // Remove Supabase session from both localStorage and sessionStorage
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('sb-')) localStorage.removeItem(key);
    });
    Object.keys(sessionStorage).forEach((key) => {
      if (key.startsWith('sb-')) sessionStorage.removeItem(key);
    });
    toast({
      title: "Signed out",
      description: "You have been signed out successfully.",
    });
    navigate("/");
  };

  return (
    <nav className="bg-white md:bg-white md:shadow-sm sticky top-0 z-30">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl">
          <img src="/snap tag logo III.png" alt="SnapTagForget Logo" className="h-8 w-auto hidden md:block" style={{maxWidth: '160px'}} />
          <span className="sr-only">SnapTagForget</span>
        </Link>
        {/* Hamburger for mobile */}
        <button
          className="md:hidden p-2 rounded focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
        {/* Desktop menu */}
        <div className="hidden md:flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <Home className="h-5 w-5 mr-1" /> Home
          </Button>
          {user ? (
            <>
              <Link to="/receipts" className="text-sm hover:underline">
                My Receipts
              </Link>
              <Link to="/upload" className="text-sm hover:underline">
                Upload
              </Link>
              <Link to="/summary" className="text-sm hover:underline">
                Summary
              </Link>
              <Link to="/profile" className="text-sm hover:underline">Profile</Link>
              <AlertDialog open={signOutDialogOpen} onOpenChange={setSignOutDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="outline" onClick={() => setSignOutDialogOpen(true)}>
                    Sign Out
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Sign Out</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to sign out? You can stay logged in if you prefer.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel asChild>
                      <Button variant="outline" onClick={() => setSignOutDialogOpen(false)}>Stay Logged In</Button>
                    </AlertDialogCancel>
                    <AlertDialogAction asChild>
                      <Button variant="destructive" onClick={handleSignOut}>Sign Out</Button>
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          ) : (
            <Button size="sm" onClick={() => navigate("/auth")}>Sign In</Button>
          )}
        </div>
      </div>
      {/* Mobile menu dropdown */}
      {menuOpen && (
        <div className="md:hidden bg-white animate-fade-in-down">
          <div className="flex flex-col gap-2 px-4 py-3">
            <Button variant="ghost" size="sm" className="justify-start" onClick={() => { setMenuOpen(false); navigate("/"); }}>
              <Home className="h-5 w-5 mr-1" /> Home
            </Button>
            {user ? (
              <>
                <Link to="/receipts" className="text-sm py-2" onClick={() => setMenuOpen(false)}>
                  My Receipts
                </Link>
                <Link to="/upload" className="text-sm py-2" onClick={() => setMenuOpen(false)}>
                  Upload
                </Link>
                <Link to="/summary" className="text-sm py-2" onClick={() => setMenuOpen(false)}>
                  Summary
                </Link>
                <Link to="/profile" className="text-sm py-2" onClick={() => setMenuOpen(false)}>Profile</Link>
                <AlertDialog open={signOutDialogOpen} onOpenChange={setSignOutDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="outline" className="w-full mt-2" onClick={() => setSignOutDialogOpen(true)}>
                      Sign Out
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Sign Out</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to sign out? You can stay logged in if you prefer.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel asChild>
                        <Button variant="outline" onClick={() => setSignOutDialogOpen(false)}>Stay Logged In</Button>
                      </AlertDialogCancel>
                      <AlertDialogAction asChild>
                        <Button variant="destructive" onClick={handleSignOut}>Sign Out</Button>
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            ) : (
              <Button size="sm" className="w-full" onClick={() => { setMenuOpen(false); navigate("/auth"); }}>
                Sign In
              </Button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
