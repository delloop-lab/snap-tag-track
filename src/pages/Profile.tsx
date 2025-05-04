import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";

const AVATAR_BUCKET = "avatars";

const Profile = () => {
  const { user } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from("users")
        .select("first_name, last_name, avatar_url")
        .eq("id", user.id)
        .single();
      if (data) {
        setFirstName(data.first_name || "");
        setLastName(data.last_name || "");
        setAvatarUrl(data.avatar_url || "");
        console.log("Fetched avatarUrl from DB:", data.avatar_url);
      }
    };
    fetchProfile();
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess("");
    setError("");
    const { error } = await supabase
      .from("users")
      .update({ first_name: firstName, last_name: lastName, avatar_url: avatarUrl })
      .eq("id", user.id);
    setLoading(false);
    if (error) {
      setError("Failed to update profile. Please try again.");
    } else {
      setSuccess("Profile updated successfully!");
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError("");
    setSuccess("");
    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage.from(AVATAR_BUCKET).upload(filePath, file, { upsert: true });
    if (error) {
      setError("Failed to upload avatar. Please try again.");
      setLoading(false);
      return;
    }
    // Get signed URL for private bucket
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage.from(AVATAR_BUCKET).createSignedUrl(filePath, 60 * 60 * 24 * 7); // 7 days expiry
    if (signedUrlError) {
      setError("Failed to generate avatar URL.");
      setLoading(false);
      return;
    }
    setAvatarUrl(signedUrlData.signedUrl);
    setLoading(false);
    setSuccess("Avatar uploaded! Click Save to update your profile.");
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-6 text-center">Edit Profile</h2>
      <form onSubmit={handleSave} className="space-y-6">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-24 h-24 flex flex-col items-center">
            {avatarUrl && (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="w-24 h-24 rounded-full object-cover border"
              />
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            className="mt-2 text-xs px-2 py-1"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
          >
            {avatarUrl ? "Change" : "Add"} Photo
          </Button>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            className="hidden"
            onChange={handleAvatarChange}
            disabled={loading}
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">First Name</label>
          <Input
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            placeholder="First Name"
            disabled={loading}
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">Last Name</label>
          <Input
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            placeholder="Last Name"
            disabled={loading}
          />
        </div>
        {success && <div className="text-green-600 text-center">{success}</div>}
        {error && <div className="text-red-600 text-center">{error}</div>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </form>
    </div>
  );
};

export default Profile; 