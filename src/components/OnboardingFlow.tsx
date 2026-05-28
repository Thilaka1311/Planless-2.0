import React, { useState, useEffect } from "react";
import { ArrowLeft, HelpCircle, Smartphone, User, Sparkles, Check, Clipboard } from "lucide-react";
import { UserProfile } from "../core/types";
import { getInitialsAvatar } from "../demo/seedData";

interface OnboardingFlowProps {
  onComplete: (profile: UserProfile) => void;
}

type OnboardingStep = "LANDING" | "PHONE_INPUT" | "OTP_VERIFY" | "PROFILE_SETUP";

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState<OnboardingStep>("LANDING");
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState<string[]>(["", "", "", ""]);
  const [timer, setTimer] = useState(45);
  const [profileName, setProfileName] = useState("");
  const [bio, setBio] = useState("Always spontaneous, never planless.");
  const [avatar, setAvatar] = useState("https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200");
  const [errorMessage, setErrorMessage] = useState("");
  const [matchedProfile, setMatchedProfile] = useState<any | null>(null);
  const [checkingUser, setCheckingUser] = useState(false);

  // Automatically update initials avatar dynamically when typing name
  useEffect(() => {
    if (profileName.trim() && (avatar === "" || avatar.includes("unsplash.com") || avatar.includes("api/placeholder"))) {
      setAvatar(getInitialsAvatar(profileName));
    }
  }, [profileName]);

  // Otp autofill from clipboard mockup
  const [isCodeDetected, setIsCodeDetected] = useState(false);

  useEffect(() => {
    let interval: any;
    if (step === "OTP_VERIFY" && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  // Handle number input
  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneNumber.trim().length < 8) {
      setErrorMessage("Enter a valid phone number");
      return;
    }
    setErrorMessage("");
    setCheckingUser(true);

    try {
      const res = await fetch("/api/db/fetch-all");
      if (res.ok) {
        const resJson = await res.json();
        if (resJson.configured && resJson.data && Array.isArray(resJson.data.users)) {
          const inputDigits = (countryCode + phoneNumber).replace(/[^0-9]/g, "");
          const match = resJson.data.users.find((u: any) => {
            if (!u.phone_number) return false;
            const uDigits = u.phone_number.replace(/[^0-9]/g, "");
            return uDigits === inputDigits;
          });
          if (match) {
            console.log("[Onboarding] Matching user profile found:", match);
            setMatchedProfile(match);
          } else {
            setMatchedProfile(null);
          }
        }
      }
    } catch (err) {
      console.warn("[Onboarding] Error searching Supabase users:", err);
    } finally {
      setCheckingUser(false);
      setStep("OTP_VERIFY");
      setTimer(45);
      setIsCodeDetected(false);
      setTimeout(() => {
        setIsCodeDetected(true);
      }, 1500);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return;
    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    // Auto-focus next field
    if (value && index < 3) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const autofillCode = () => {
    setOtp(["1", "3", "1", "1"]);
    setIsCodeDetected(false);
  };

  const handleVerifyOtp = () => {
    const fullOtp = otp.join("");
    if (fullOtp.length < 4) {
      setErrorMessage("Enter the complete 4-digit code");
      return;
    }
    setErrorMessage("");
    if (matchedProfile) {
      onComplete({
        name: matchedProfile.full_name,
        phone: matchedProfile.phone_number,
        bio: matchedProfile.bio || "Always spontaneous, never planless.",
        avatar: matchedProfile.profile_photo || getInitialsAvatar(matchedProfile.full_name),
        joined: true,
        college_or_work: matchedProfile.college_or_work || "SRM Chennai",
        user_id: matchedProfile.user_id,
      });
    } else {
      setStep("PROFILE_SETUP");
    }
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) {
      setErrorMessage("Please enter your name");
      return;
    }
    const cleanPhone = `${countryCode} ${phoneNumber || "90002 00001"}`;
    onComplete({
      name: profileName,
      phone: cleanPhone,
      bio: bio,
      avatar: avatar,
      joined: true,
      college_or_work: "SRM Chennai",
      user_id: "U001",
    });
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
              else if (step === "OTP_VERIFY") setStep("PHONE_INPUT");
              else if (step === "PROFILE_SETUP") setStep("OTP_VERIFY");
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
                id="btn_get_started"
                onClick={() => setStep("PHONE_INPUT")}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-brand-orange to-brand-peach text-white font-medium text-sm tracking-wide shadow-lg shadow-[#ff5e3a]/15 hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer text-center"
              >
                Get Started
              </button>
              
              <button
                id="btn_already_account"
                onClick={() => setStep("PHONE_INPUT")}
                className="w-full py-3 text-zinc-400 text-xs font-sans font-medium text-center hover:text-white transition-colors"
              >
                ALREADY HAVE AN ACCOUNT
              </button>
            </div>
          </div>
        )}

        {/* PHONE SIGN IN STEP */}
        {step === "PHONE_INPUT" && (
          <div id="step_phone" className="space-y-8">
            <div className="space-y-2">
              <h2 className="text-3xl font-display font-medium text-white tracking-tight">
                Join the<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-orange to-brand-peach font-bold">Action.</span>
              </h2>
              <p className="text-zinc-500 text-xs">Where plans happen.</p>
            </div>

            <form onSubmit={handlePhoneSubmit} className="space-y-6">
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
                      autoFocus
                    />
                  </div>
                </div>
                {errorMessage && (
                  <p className="text-xs text-brand-orange font-sans mt-1">{errorMessage}</p>
                )}
              </div>

              <div className="text-[11px] text-zinc-500 leading-relaxed">
                We'll send you a 4-digit code to verify your phone number. Your number is safe to connect plans.
              </div>

              <button
                id="phone_continue_btn"
                type="submit"
                className="w-full py-3.5 px-6 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 text-white font-medium text-xs tracking-wider uppercase transition-all duration-200 text-center cursor-pointer"
              >
                Continue
              </button>
            </form>

            <div className="text-[11px] text-zinc-600 text-center leading-relaxed">
              By continuing, you agree to our <span className="underline cursor-pointer">Terms of Service</span> and <span className="underline cursor-pointer">Privacy Policy</span>.
            </div>
          </div>
        )}

        {/* OTP VERIFICATION STEP */}
        {step === "OTP_VERIFY" && (
          <div id="step_otp" className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-3xl font-display font-medium text-white tracking-tight">
                Verify it's you
              </h2>
              <p className="text-zinc-500 text-xs">
                We sent a code to <span className="text-zinc-300 font-mono">{countryCode} {phoneNumber || "98765 43210"}</span>.{" "}
                <span onClick={() => setStep("PHONE_INPUT")} className="text-brand-peach underline cursor-pointer ml-1 select-none">
                  Wrong number?
                </span>
              </p>
            </div>

            {/* Simulated Live SMS Alert Clue Dashboard */}
            <div className="p-3.5 bg-[#ff5e3b]/10 border border-[#ff5e3b]/25 rounded-2xl text-[11px] text-[#ff8b66]/90 leading-relaxed font-sans space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-white text-xs">
                <Sparkles className="w-3.5 h-3.5 text-brand-orange" />
                <span>Simulated Sandbox Environment</span>
              </div>
              <p className="opacity-90">
                To login securely without real SMS gateway charges, enter code <strong className="font-mono text-zinc-100 bg-zinc-900 border border-zinc-800 px-1 rounded">1311</strong> or simply type <strong className="font-mono text-zinc-100">any 4 digits</strong> to complete authorization instantly!
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex justify-between gap-3 max-w-[280px]">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    className="w-12 h-14 bg-zinc-900/90 border border-zinc-800 rounded-xl text-center text-xl font-mono text-white focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange"
                  />
                ))}
              </div>

              {errorMessage && (
                <p className="text-xs text-brand-orange font-sans mt-0.5">{errorMessage}</p>
              )}

              {/* Paste notification trigger mimicking iOS autofill */}
              {isCodeDetected && (
                <div 
                  id="paste_from_messages"
                  onClick={autofillCode}
                  className="flex items-center gap-2 p-3 bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700/80 rounded-xl text-xs text-zinc-300 cursor-pointer animate-pulse select-none"
                >
                  <Clipboard className="w-4 h-4 text-brand-orange" />
                  <span>Paste code detected from Messages: <strong className="font-mono text-xs text-brand-peach">1311</strong></span>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-zinc-500 pt-2">
                <span>Didn't get the code?</span>
                {timer > 0 ? (
                  <span className="font-mono text-zinc-400">Resend code in 0:{timer < 10 ? `0${timer}` : timer}</span>
                ) : (
                  <button
                    onClick={() => {
                      setTimer(45);
                      setErrorMessage("");
                    }}
                    className="text-brand-peach font-medium underline"
                  >
                    Resend code
                  </button>
                )}
              </div>

              <div className="space-y-3">
                <button
                  id="verify_otp_btn"
                  onClick={handleVerifyOtp}
                  className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-brand-orange to-brand-peach text-white font-semibold text-xs tracking-wider uppercase transition-all text-center cursor-pointer shadow-md"
                >
                  Verify
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PROFILE PROFILE SETUP */}
        {step === "PROFILE_SETUP" && (
          <div id="step_profile" className="space-y-8">
            <div className="space-y-2">
              <h2 className="text-3xl font-display font-medium text-white tracking-tight">
                Set up your profile
              </h2>
              <p className="text-zinc-500 text-xs">This is how people will see you in plans.</p>
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-6">
              {/* Profile Avatar Selection Block */}
              <div className="flex flex-col items-center gap-3">
                <label className="relative group cursor-pointer block">
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileChange} 
                    className="hidden" 
                  />
                  <img
                    src={avatar}
                    alt="Current Avatar"
                    className="w-20 h-20 rounded-full object-cover border-2 border-brand-orange shadow-md bg-zinc-800 hover:scale-102 transition-transform duration-200"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 bg-brand-orange text-white rounded-full flex items-center justify-center text-xs border-2 border-[#0A0A0B]">
                    +
                  </div>
                </label>
                
                {/* Micro selector */}
                <div className="flex gap-2 mt-2">
                  {sampleAvatars.map((url, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setAvatar(url)}
                      className={`w-8 h-8 rounded-full overflow-hidden border-2 transition-all ${
                        avatar === url ? "border-brand-orange scale-105" : "border-zinc-800 opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img src={url} alt={`Avatar ${index}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-500 font-display font-semibold uppercase tracking-widest block">
                    Full Name
                  </label>
                  <input
                    id="profile_name_input"
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="Enter Your Name"
                    className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-brand-orange"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-500 font-display font-semibold uppercase tracking-widest block">
                    Bio / Catchphrase
                  </label>
                  <input
                    id="profile_bio_input"
                    type="text"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell circles what you are up to"
                    className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-brand-orange"
                  />
                </div>
              </div>

              <button
                id="complete_onboarding_btn"
                type="submit"
                className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-brand-orange to-brand-peach text-white font-semibold text-xs tracking-wider uppercase transition-all shadow-md text-center cursor-pointer"
              >
                Continue
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
