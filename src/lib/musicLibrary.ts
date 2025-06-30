export interface Track {
  id: string;
  title: string;
  filename: string;
}

export const musicLibrary: Track[] = [
  {
    id: 'lofi-rain',
    title: 'Lofi Rain',
    filename: 'lofi-rain.mp3'
  },
  {
    id: 'night-lofi',
    title: 'Night Lofi',
    filename: 'night-lofi.mp3'
  }
];

export const getTrackUrl = (filename: string): string => {
  return `/music/${filename}`;
}; 