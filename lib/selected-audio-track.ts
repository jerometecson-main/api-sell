// utils/selectAudioTrack.ts

import { AudioTrackTypes } from "@/app/player/[...params]/useVideoPlayer";

/**
 * Select the best audio track for a given language.
 * Prioritizes tracks with "[Original]" in the name and excludes "Audio Description".
 * Returns the track index to use with HLS.
 */
export function selectAudioTrack(
  tracks: AudioTrackTypes[],
  language: string,
): number | null {
  const languageTracks = tracks
    .map((track, index) => ({ track, index }))
    .filter(({ track }) => track.lang === language);

  if (!languageTracks.length) return null;

  const originalTrack = languageTracks.find(
    ({ track }) =>
      (track.name.toLowerCase().includes("[original]") ||
        track.name.toLowerCase().includes("original")) &&
      !track.name.toLowerCase().includes("audio description"),
  );

  return originalTrack ? originalTrack.index : languageTracks[0].index;
}
