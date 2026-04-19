/**
 * Commentary script catalog.
 *
 * Each line is tagged by context. At runtime we pick a line matching the
 * current hit pattern (e.g. "after_5_sweet", "high_force", etc.) and play
 * its pre-synthesized audio clip.
 *
 * Lines are written to be short (3-7 seconds of speech) so they don't
 * drag during fast play.
 */

export type CommentaryTag =
  | "mostly_sweet"       // 4-5 of last 5 in sweet zone
  | "mostly_off"         // 4-5 of last 5 off-spot
  | "mixed"              // 2-3 sweet
  | "first_sweet"        // just hit a sweet spot after a dry spell
  | "streak_sweet"       // 3+ sweet in a row
  | "high_force"         // latest hit force > 3000
  | "low_force"          // latest hit force < 1500
  | "milestone_10"       // reached 10 hits
  | "milestone_25"       // reached 25 hits
  | "milestone_50"       // reached 50 hits
  | "ambient";           // generic filler, fires on long gaps

export interface CommentaryLine {
  tag: CommentaryTag;
  text: string;
}

/**
 * The master list. Each tag has 2-4 variations so the commentary doesn't
 * feel repetitive. Written to sound like a real coach — casual, specific,
 * not overly enthusiastic.
 */
export const COMMENTARY_LINES: CommentaryLine[] = [
  // Mostly sweet (4-5 of last 5 in zone)
  { tag: "mostly_sweet", text: "That's the rhythm. Keep it there." },
  { tag: "mostly_sweet", text: "Nice. You're locked in on the sweet spot." },
  { tag: "mostly_sweet", text: "Clean contact, clean contact. That's the zone." },
  { tag: "mostly_sweet", text: "Four out of five in the pocket. Stay patient." },

  // Mostly off (4-5 miss the zone)
  { tag: "mostly_off", text: "Reset. You're drifting off the center." },
  { tag: "mostly_off", text: "Slow it down. Find the middle again." },
  { tag: "mostly_off", text: "Take a breath. You're hitting edges." },
  { tag: "mostly_off", text: "Ease up on the power. Accuracy first." },

  // Mixed bag
  { tag: "mixed", text: "Some in, some out. Keep working." },
  { tag: "mixed", text: "Not bad. Aim for more center hits next set." },
  { tag: "mixed", text: "You're close. Small adjustment on your follow-through." },

  // First sweet after a dry spell
  { tag: "first_sweet", text: "There it is. That's what it feels like." },
  { tag: "first_sweet", text: "Remember that swing. Repeat it." },
  { tag: "first_sweet", text: "Good. Build on that one." },

  // Streak
  { tag: "streak_sweet", text: "Three in a row. Don't think, just hit." },
  { tag: "streak_sweet", text: "You're in the zone. Stay there." },
  { tag: "streak_sweet", text: "Streak going. Keep the rhythm." },

  // High force
  { tag: "high_force", text: "Huge power on that one. Controlled." },
  { tag: "high_force", text: "Big smash. Watch your recovery." },
  { tag: "high_force", text: "Full send. Now stay balanced." },

  // Low force
  { tag: "low_force", text: "Easy swing. Commit a little more next time." },
  { tag: "low_force", text: "Soft contact. Snap your wrist through." },

  // Milestones
  { tag: "milestone_10", text: "Ten hits in. You're warming up." },
  { tag: "milestone_25", text: "Twenty-five hits. Hitting your stride." },
  { tag: "milestone_50", text: "Fifty hits. This is a real session." },

  // Ambient filler
  { tag: "ambient", text: "Stay loose. Breathe." },
  { tag: "ambient", text: "Feet first. Swing second." },
  { tag: "ambient", text: "Eyes on the shuttle." },
  { tag: "ambient", text: "Small adjustments. Stay focused." },
  { tag: "ambient", text: "Quality over power." },
];

/**
 * Default ElevenLabs voice ID. Swap this at runtime via the store if needed.
 * "Adam" = 21m00Tcm4TlvDq8ikWAM... no wait that's Rachel.
 * Adam's ID is: pNInz6obpgDQGcFmaJgB
 *
 * To change voice: update the store's `voiceId` or edit this constant.
 * Browse voices: https://elevenlabs.io/app/voice-library
 */
export const DEFAULT_VOICE_ID = "pNInz6obpgDQGcFmaJgB"; // "Adam"
