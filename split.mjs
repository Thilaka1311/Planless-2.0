import fs from 'fs';
import path from 'path';

const file = fs.readFileSync('src/components/MainApp.tsx', 'utf8');

// Extract PlanReelCard
const planReelStart = file.indexOf('interface PlanReelCardProps {');
const planReelEndStr = '};\n\n// Premium, interactive participation progress bar';
const planReelEnd = file.indexOf(planReelEndStr) + 2;

const planReelCardCode = file.substring(planReelStart, planReelEnd);

// Extract CinematicProgressBar
const cBarStart = file.indexOf('// Premium, interactive participation progress bar');
const cBarEndStr = '};\n\nexport const MainApp ='; // Wait, I don't know what comes after CinematicProgressBar.
// Let's just extract PlanReelCard for now to see if it works.

fs.writeFileSync('src/shared/cards/PlanReelCard.tsx', `
import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft } from "lucide-react";
import { UserProfile, Plan, Transaction, DbTransaction } from "../../core/types";
import { SportsIcon, MoviesIcon, FoodIcon } from "../components/Icons";

${planReelCardCode}
`);

// Remove PlanReelCard from MainApp.tsx
const newMainApp = file.substring(0, planReelStart) + 
  `import { PlanReelCard } from "../shared/cards/PlanReelCard";\n\n` + 
  file.substring(planReelEnd);

fs.writeFileSync('src/components/MainApp.tsx', newMainApp);

console.log("PlanReelCard extracted successfully!");
