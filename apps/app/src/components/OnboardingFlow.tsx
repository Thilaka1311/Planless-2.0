import React, { useState, useEffect } from "react";
import { ArrowLeft, HelpCircle, Smartphone, User, Check } from "lucide-react";
import { UserProfile } from "../core/types";
import { getInitialsAvatar } from "../demo/seedData";

interface OnboardingFlowProps {
  onComplete: (profile: UserProfile) => void;
}

type OnboardingStep = "LANDING" | "PHONE_INPUT" | "PROFILE_SETUP";

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState<OnboardingStep>("LANDING");
  const [authMode, setAuthMode] = useState<"signup" | "login">("signup");
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileName, setProfileName] = useState("");
  const [tempUser, setTempUser] = useState<any>(null);

  const normalizePhone = (phone: string) => {
    return String(phone).replace(/[^0-9+]/g, "");
  };
  const [bio, setBio] = useState("Always spontaneous, never planless.");
  const [avatar, setAvatar] = useState("https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200");
  const [errorMessage, setErrorMessage] = useState("");
  const [checkingUser, setCheckingUser] = useState(false);

  // Automatically update initials avatar dynamically when typing name
  useEffect(() => {
    if (profileName.trim() && (avatar === "" || avatar.includes("unsplash.com") || avatar.includes("api/placeholder"))) {
      setAvatar(getInitialsAvatar(profileName));
    }
  }, [profileName]);

  const generateUsername = (name: string) => {
    const sanitized = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "")
      .slice(0, 15);
    return sanitized || `user${Math.floor(Math.random() * 9000 + 1000)}`;
  };



  // Handle custom login/signup flow
  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) {
      setErrorMessage("Please enter your name");
      return;
    }
    if (phoneNumber.trim().length < 8) {
      setErrorMessage("Enter a valid phone number");
      return;
    }

    const cleanPhone = normalizePhone(`${countryCode}${phoneNumber}`);
    setErrorMessage("");
    setCheckingUser(true);

    try {
      const res = await fetch("/api/auth/login-or-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone, name: profileName }),
      });

      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMessage(result.error || "Authentication failed. Please try again.");
        return;
      }

      const user = result.user;
      if (result.isNew) {
        setTempUser({ ...user, token: result.token });
        setProfileName(user.full_name || profileName);
        setBio(user.bio || "Always planning the next move.");
        setAvatar(user.profile_photo || getInitialsAvatar(user.full_name || profileName));
        setStep("PROFILE_SETUP");
      } else {
        onComplete({
          name: user.full_name,
          phone: user.phone_number,
          bio: user.bio || "Always spontaneous, never planless.",
          avatar: user.profile_photo || getInitialsAvatar(user.full_name),
          joined: true,
          college_or_work: user.college_or_work || "SRM Chennai",
          user_id: user.user_id,
          dbUuid: user.id,
          token: result.token,
        });
      }
    } catch (err) {
      console.warn("[Onboarding] Authentication error:", err);
      setErrorMessage("Unable to authenticate. Please try again.");
    } finally {
      setCheckingUser(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) {
      setErrorMessage("Please enter your name");
      return;
    }
    if (!tempUser) {
      setErrorMessage("Session expired. Please try logging in again.");
      return;
    }

    try {
      const res = await fetch("/api/db/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table: "users",
          records: [{
            id: tempUser.id,
            user_id: tempUser.user_id,
            username: tempUser.username || generateUsername(profileName),
            phone_number: tempUser.phone_number,
            full_name: profileName.trim(),
            bio: bio.trim(),
            profile_photo: avatar,
            college_or_work: tempUser.college_or_work || "SRM Chennai"
          }]
        }),
      });

      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMessage(result.error || "Failed to update profile. Please try again.");
        return;
      }

      onComplete({
        name: profileName.trim(),
        phone: tempUser.phone_number,
        bio: bio.trim(),
        avatar: avatar || getInitialsAvatar(profileName),
        joined: true,
        college_or_work: tempUser.college_or_work || "SRM Chennai",
        user_id: tempUser.user_id,
        dbUuid: tempUser.id,
        token: tempUser.token,
      });
    } catch (err) {
      console.warn("[Onboarding] Failed to save profile:", err);
      setErrorMessage("Unable to save profile details. Please try again.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setAvatar(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const sampleAvatars = [
    getInitialsAvatar("VR Thilaka Sundar"),
    getInitialsAvatar("Keval"),
    getInitialsAvatar("Guhan"),
    getInitialsAvatar("Rahul"),
    getInitialsAvatar("Sudeshna")
  ];

  return (
    <div id="onboarding_wrapper" className="w-full h-full text-white bg-[#0A0A0B] flex flex-col justify-between font-sans relative overflow-hidden p-6 md:p-8">
      
      {/* Visual background abstract element */}
      <div className="absolute top-[-100px] left-[-100px] w-64 h-64 bg-[#ff5e3b] opacity-[0.06] rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-50px] right-[-50px] w-72 h-72 bg-[#ff8b66] opacity-[0.04] rounded-full blur-[100px] pointer-events-none" />

      {/* Header bar */}
      {step !== "LANDING" && (
        <div id="onboarding_header" className="flex items-center justify-between w-full h-10 shrink-0 z-10">
          <button
            id="back_btn"
            onClick={() => {
              if (step === "PHONE_INPUT") setStep("LANDING");
              else setStep("PHONE_INPUT");
            }}
            className="w-10 h-10 rounded-full flex items-center justify-start text-zinc-400 hover:text-white transition-all cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <span className="text-[11px] font-display uppercase tracking-[0.25em] text-zinc-500 font-semibold">
            PLANLESS
          </span>
          
          <button className="w-10 h-10 rounded-full flex items-center justify-end text-zinc-500 hover:text-zinc-300 transition-all">
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Form/Content Section */}
      <div id="onboarding_main" className="flex-1 flex flex-col justify-center my-auto py-10 z-10">
        
        {/* LANDING STEP */}
        {step === "LANDING" && (
          <div id="step_landing" className="flex flex-col h-full justify-between py-12">
            <div className="text-zinc-500 text-[11px] font-display uppercase tracking-[0.25em] font-semibold text-center mt-4">
              PLANLESS
            </div>

            <div className="my-auto flex flex-col gap-6">
              <h1 className="text-5xl font-display font-bold tracking-tight text-white leading-[1.05] max-w-sm">
                Planless<br />
                fixes plans.<br />
                Ironic.<br />
                We know.
              </h1>
              <p className="text-zinc-400 text-sm leading-relaxed max-w-xs font-sans">
                Spontaneous hangouts, real-world experiences, and circles of friends without the calendar complex.
              </p>
            </div>

            <div className="flex flex-col gap-4 mt-auto">
              <button
                id="btn_create_account"
                onClick={() => {
                  setAuthMode("signup");
                  setErrorMessage("");
                  setPassword("");
                  setConfirmPassword("");
                  setProfileName("");
                  setStep("PHONE_INPUT");
                }}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-brand-orange to-brand-peach text-white font-medium text-sm tracking-wide shadow-lg shadow-[#ff5e3a]/15 hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer text-center"
              >
                Create account
              </button>
              
              <button
                id="btn_login"
                onClick={() => {
                  setAuthMode("login");
                  setErrorMessage("");
                  setPassword("");
                  setConfirmPassword("");
                  setProfileName("");
                  setStep("PHONE_INPUT");
                }}
                className="w-full py-3 text-zinc-400 text-xs font-sans font-medium text-center hover:text-white transition-colors"
              >
                Log in to existing account
              </button>
            </div>
          </div>
        )}

        {/* PHONE SIGN IN STEP */}
        {step === "PHONE_INPUT" && (
          <div id="step_phone" className="space-y-8">
            <div className="space-y-2">
              <h2 className="text-3xl font-display font-medium text-white tracking-tight">
                {authMode === "login" ? "Welcome back" : "Let's get you started"}
              </h2>
              <p className="text-zinc-500 text-xs">
                Enter your name and phone number to continue.
              </p>
            </div>

            <form onSubmit={handlePhoneSubmit} className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] text-zinc-500 font-display font-semibold uppercase tracking-widest block">
                  Full Name
                </label>
                <input
                  id="profile_name_input"
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-brand-orange"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-zinc-500 font-display font-semibold uppercase tracking-widest block">
                  Country Code & Phone Number
                </label>
                <div className="flex gap-2.5">
                  <div className="relative">
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="bg-zinc-900/80 border border-zinc-800 rounded-xl px-3 py-3 text-sm text-zinc-200 focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange cursor-pointer appearance-none pr-7"
                    >
                      <option value="+91">+91 (IN)</option>
                      <option value="+1">+1 (US)</option>
                      <option value="+44">+44 (UK)</option>
                      <option value="+61">+61 (AU)</option>
                      <option value="+65">+65 (SG)</option>
                    </select>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400 text-[10px]">▼</div>
                  </div>
                  
                  <div className="relative flex-1">
                    <input
                      id="phone_input_field"
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ""))}
                      placeholder="Phone Number"
                      className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange"
                    />
                  </div>
                </div>
                {errorMessage && (
                  <p className="text-xs text-brand-orange font-sans mt-1">{errorMessage}</p>
                )}
              </div>

              <div className="text-[11px] text-zinc-500 leading-relaxed">
                If your account already exists, we'll log you in immediately. Otherwise, a new account will be created.
              </div>

              <button
                id="phone_continue_btn"
                type="submit"
                disabled={checkingUser}
                className="w-full py-3.5 px-6 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 text-white font-medium text-xs tracking-wider uppercase transition-all duration-200 text-center cursor-pointer disabled:opacity-50"
              >
                {checkingUser ? "Connecting..." : "Continue"}
              </button>
            </form>

            <div className="text-[11px] text-zinc-600 text-center leading-relaxed">
              By continuing, you agree to our <span className="underline cursor-pointer">Terms of Service</span> and <span className="underline cursor-pointer">Privacy Policy</span>.
            </div>
          </div>
        )}


        {/* PROFILE SETUP - post-login profile photo and bio setup */}
        {step === "PROFILE_SETUP" && (
          <div id="step_profile" className="flex flex-col items-center justify-between h-full py-2 space-y-6">
            
            {/* Circle Photo Selector */}
            <div className="relative flex flex-col items-center justify-center">
              <div 
                onClick={() => document.getElementById("profile_avatar_upload_input")?.click()}
                className="w-28 h-28 rounded-full border-2 border-transparent bg-gradient-to-tr from-[#ff5e3b] to-[#ff8b66] p-[2.5px] shadow-2xl relative cursor-pointer active:scale-95 transition-all duration-300 animate-fade-in"
              >
                <div className="w-full h-full bg-[#0A0A0B] rounded-full overflow-hidden flex items-center justify-center relative">
                  {avatar ? (
                    <img 
                      src={avatar} 
                      className="w-full h-full object-cover rounded-full" 
                      alt="Avatar Preview" 
                    />
                  ) : (
                    <User className="w-10 h-10 text-zinc-700" />
                  )}
                </div>
                
                {/* Custom orange plus badge overlay in bottom-right corner */}
                <div className="absolute bottom-1.5 right-1.5 w-6.5 h-6.5 bg-gradient-to-r from-[#ff5e3b] to-[#ff8b66] rounded-full flex items-center justify-center border-2 border-[#0A0A0B] shadow cursor-pointer">
                  <span className="text-white text-xs font-black leading-none">+</span>
                </div>
              </div>
              
              {/* Hidden file input */}
              <input 
                id="profile_avatar_upload_input"
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleFileChange}
              />
            </div>

            {/* Title & Subtitle */}
            <div className="text-center space-y-1">
              <h2 className="text-[26px] font-display font-bold text-white tracking-tight leading-tight">
                Set up your profile
              </h2>
              <p className="text-zinc-500 text-[10.5px] font-sans">
                This is how people will see you in plans
              </p>
            </div>

            {/* Inputs & Form */}
            <form onSubmit={handleProfileSubmit} className="w-full space-y-4 pt-2">
              <div className="space-y-3">
                
                {/* Pill Name Input */}
                <input
                  id="profile_name_input"
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="Enter Your Name"
                  className="w-full bg-white text-zinc-900 rounded-full py-3 px-6 text-sm text-center border-none font-sans font-medium placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#ff5e3b] shadow-lg shadow-black/10"
                  required
                />

                {/* Pill Bio Input */}
                <input
                  id="profile_bio_input"
                  type="text"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="About you"
                  className="w-full bg-white text-zinc-900 rounded-full py-3 px-6 text-sm text-center border-none font-sans font-medium placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#ff5e3b] shadow-lg shadow-black/10"
                />
              </div>

              {errorMessage && (
                <p className="text-xs text-brand-orange font-sans text-center mt-1 animate-pulse">{errorMessage}</p>
              )}

              {/* Gradient Continue Button */}
              <div className="pt-8">
                <button
                  id="complete_onboarding_btn"
                  type="submit"
                  className="w-full py-3.5 px-6 rounded-full bg-gradient-to-r from-[#ff5e3b] to-[#ff8b66] text-white font-bold text-xs tracking-[0.1em] uppercase shadow-lg shadow-[#ff5e3a]/15 hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer text-center"
                >
                  Continue
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
