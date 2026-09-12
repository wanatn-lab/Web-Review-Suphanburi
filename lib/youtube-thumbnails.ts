const YOUTUBE_VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

/**
 * Returns YouTube's stable thumbnail endpoints from highest to lowest quality.
 * Some videos do not have a max-resolution image, so callers should handle
 * image errors and continue through the list.
 */
export function youtubeThumbnailCandidates(videoId: string): string[] {
  if (!YOUTUBE_VIDEO_ID.test(videoId)) return [];

  const encodedVideoId = encodeURIComponent(videoId);
  return [
    `https://i.ytimg.com/vi/${encodedVideoId}/maxresdefault.jpg`,
    `https://i.ytimg.com/vi/${encodedVideoId}/sddefault.jpg`,
    `https://i.ytimg.com/vi/${encodedVideoId}/hqdefault.jpg`,
    `https://i.ytimg.com/vi/${encodedVideoId}/mqdefault.jpg`,
    `https://i.ytimg.com/vi/${encodedVideoId}/default.jpg`,
  ];
}
