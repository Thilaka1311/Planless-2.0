import React, { useState, useEffect } from "react";
import { ArrowLeft, MapPin } from "lucide-react";
import { CreatePlanCTAButton } from "./active/CreatePlanCTAButton";
import { fetchLocationSuggestions, LocationSuggestion } from "../services/locationService";
import { PlanSummary } from "./active/PlanSummary";

interface CustomLocationStepProps {
  newPlanLocation: string;
  setNewPlanLocation: (val: string) => void;
  selectedLocation: {
    name: string;
    address: string;
    fullAddress: string;
    latitude: number;
    longitude: number;
    placeId: string;
  } | null;
  setSelectedLocation: (val: {
    name: string;
    address: string;
    fullAddress: string;
    latitude: number;
    longitude: number;
    placeId: string;
  } | null) => void;
  setCreateFlowStep: (step: any) => void;
  summary?: {
    title: string;
    location?: string;
    time?: string;
    invitedCount: number;
    cost: string;
    waitlistEnabled?: boolean;
    joinLimit?: number;
  };
}

const RECENT_LOCATIONS = [
  "Play Arena HSR",
  "Koramangala",
  "Toit Indiranagar",
  "Nexus Mall",
];

export const CustomLocationStep = ({
  newPlanLocation,
  setNewPlanLocation,
  selectedLocation,
  setSelectedLocation,
  setCreateFlowStep,
  summary,
}: CustomLocationStepProps) => {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  // Check browser geolocation permission / fetch current location to bias searches
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserCoords({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.log("Geolocation bias disabled or denied:", error.message);
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 600000 }
      );
    }
  }, []);

  useEffect(() => {
    if (newPlanLocation.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    // Do not search if the current input value matches the selected location's name exactly
    if (selectedLocation && selectedLocation.name === newPlanLocation.trim()) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    const delayDebounce = setTimeout(async () => {
      const results = await fetchLocationSuggestions(
        newPlanLocation,
        userCoords?.latitude,
        userCoords?.longitude
      );
      setSuggestions(results);
      setIsLoading(false);
    }, 300); // Requirements: "Debounce requests by 300ms."

    return () => clearTimeout(delayDebounce);
  }, [newPlanLocation, selectedLocation, userCoords]);

  const handleInputChange = (val: string) => {
    setNewPlanLocation(val);
    // Fallback: If user modifies the text, clear the selectedLocation mapping
    if (selectedLocation && selectedLocation.name !== val) {
      setSelectedLocation(null);
    }
  };

  const handleSelectSuggestion = (suggestion: LocationSuggestion) => {
    setNewPlanLocation(suggestion.name);
    setSelectedLocation(suggestion);
    setSuggestions([]);
  };

  return (
    <div className="space-y-6 animate-fade-in text-left flex flex-col justify-between min-h-[480px]">
      <div className="space-y-6">
        {/* Back Button */}
        <button
          type="button"
          onClick={() => setCreateFlowStep("WHAT")}
          className="text-xs font-mono font-medium text-zinc-550 hover:text-zinc-200 flex items-center gap-1.5 cursor-pointer py-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to activity</span>
        </button>

        {summary && (
          <PlanSummary
            title={summary.title}
            location={summary.location}
            time={summary.time}
            invitedCount={summary.invitedCount}
            cost={summary.cost}
            waitlistEnabled={summary.waitlistEnabled}
            joinLimit={summary.joinLimit}
          />
        )}

        <div className="space-y-2">
          <h2 className="text-3xl font-display font-black text-zinc-100 tracking-tight leading-tight">
            Where?
          </h2>
        </div>

        {/* Input & Autocomplete Dropdown */}
        <div className="space-y-4 pt-2 relative">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pointer-events-none">
              <MapPin className="w-5 h-5 text-brand-peach" />
            </span>
            <input
              type="text"
              placeholder="Enter a location"
              value={newPlanLocation}
              onChange={(e) => handleInputChange(e.target.value)}
              className="w-full bg-transparent border-b border-zinc-800 focus:border-brand-peach pl-7 pr-8 py-3 text-lg text-zinc-100 placeholder-zinc-700 focus:outline-none transition-colors"
              autoFocus
            />
            {isLoading && (
              <span className="absolute inset-y-0 right-0 flex items-center pr-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-brand-peach border-t-transparent"></div>
              </span>
            )}
          </div>

          {/* Recent Locations */}
          <div className="space-y-2 pt-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-550 block font-bold px-1">
              Recent Locations
            </span>
            <div className="flex flex-col gap-1">
              {RECENT_LOCATIONS.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => {
                    setNewPlanLocation(loc);
                    setSelectedLocation({
                      name: loc,
                      address: "Recent Location",
                      fullAddress: loc,
                      latitude: 12.9716,
                      longitude: 77.5946,
                      placeId: `mock_${loc}`
                    });
                  }}
                  className="w-full text-left py-2 px-3 hover:bg-zinc-900/40 rounded-xl transition-all text-xs text-zinc-400 hover:text-zinc-200 border border-transparent hover:border-zinc-900 flex items-center gap-2 cursor-pointer"
                >
                  <span className="text-brand-peach/80 text-xs">•</span>
                  <span>{loc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Autocomplete Dropdown List */}
          {suggestions.length > 0 && (
            <div className="absolute left-0 right-0 mt-1 bg-zinc-950/95 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl z-50 divide-y divide-zinc-900/60 max-h-60 overflow-y-auto">
              {suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectSuggestion(suggestion)}
                  className="w-full text-left px-4 py-3 hover:bg-zinc-900/50 transition-colors flex flex-col gap-0.5 cursor-pointer border-none"
                >
                  <span className="text-sm font-bold text-zinc-200">{suggestion.name}</span>
                  <span className="text-[10.5px] text-zinc-400 font-sans mt-0.5">{suggestion.address}</span>
                </button>
              ))}
            </div>
          )}

          {/* Selected Address Display */}
          {selectedLocation && (
            <div className="text-xs text-zinc-400 bg-zinc-950/40 border border-zinc-900/60 rounded-xl p-3.5 flex gap-2 items-start mt-2 animate-fade-in">
              <MapPin className="w-4 h-4 text-brand-peach shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-zinc-300 block">{selectedLocation.name}</span>
                <p className="font-sans text-[10.5px] leading-relaxed text-zinc-500">
                  {selectedLocation.fullAddress}
                </p>
                <p className="font-mono text-[9px] text-zinc-600 mt-1">
                  Lat: {selectedLocation.latitude.toFixed(4)}, Lon: {selectedLocation.longitude.toFixed(4)}
                </p>
              </div>
            </div>
          )}
          <div className="pt-6">
            <CreatePlanCTAButton
              text="Continue"
              disabled={newPlanLocation.trim().length === 0}
              onPress={() => setCreateFlowStep("DATETIME")}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
