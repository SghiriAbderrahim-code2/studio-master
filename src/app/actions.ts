
"use server";

import { z } from 'zod';
import type { Episode } from '@/types';
import { searchYouTube } from '@/lib/youtube';
import { EXCLUDED_KEYWORDS, MINIMUM_DURATION_SECONDS } from '@/lib/utils';

// Strict validation for anything coming from the client.
const episodeRequestSchema = z.object({
  cartoonTitle: z.string().trim().min(1).max(200),
  episodeNumber: z.number().int().min(1).max(100000),
});

function notFoundEpisode(episodeNumber: number, title: string, thumbnailText: string): Episode {
  return {
    episodeNumber,
    title,
    link: '#',
    duration: 0,
    thumbnail: `https://placehold.co/480x360.png?text=${thumbnailText}`,
    status: 'Not Found',
  };
}

function isExcluded(title: string): boolean {
  const lower = title.toLowerCase();
  return EXCLUDED_KEYWORDS.some((keyword) => lower.includes(keyword.toLowerCase()));
}

export async function fetchSingleEpisodeDetails(
  cartoonTitle: string,
  episodeNumber: number
): Promise<Episode> {
  const parsed = episodeRequestSchema.safeParse({ cartoonTitle, episodeNumber });
  if (!parsed.success) {
    return {
      episodeNumber: Number.isFinite(episodeNumber) ? episodeNumber : 0,
      title: `الحلقة ${episodeNumber} - مدخلات غير صالحة`,
      link: '#',
      duration: 0,
      thumbnail: `https://placehold.co/480x360.png?text=Invalid+Input`,
      status: 'Error',
    };
  }

  const title = parsed.data.cartoonTitle;
  const ep = parsed.data.episodeNumber;

  try {
    // Deterministic search query: cartoon title + episode number.
    const searchQuery = `${title} الحلقة ${ep}`;
    const searchResults = await searchYouTube(searchQuery);

    if (searchResults.length === 0) {
      return notFoundEpisode(ep, `الحلقة ${ep} - لم يتم العثور على نتائج`, 'Not+Found');
    }

    // Local, deterministic filtering: minimum duration + excluded keywords.
    const candidates = searchResults.filter(
      (video) => video.duration >= MINIMUM_DURATION_SECONDS && !isExcluded(video.title)
    );

    if (candidates.length === 0) {
      return notFoundEpisode(ep, `الحلقة ${ep} - لم يتم العثور على فيديو مناسب`, 'No+Match');
    }

    // Prefer results whose title mentions the exact episode number.
    const episodePattern = new RegExp(`(^|[^0-9])${ep}([^0-9]|$)`);
    const chosen = candidates.find((video) => episodePattern.test(video.title)) ?? candidates[0];

    return {
      episodeNumber: ep,
      title: chosen.title,
      link: `https://www.youtube.com/watch?v=${chosen.videoId}`,
      duration: chosen.duration,
      thumbnail: chosen.thumbnail || `https://i.ytimg.com/vi/${chosen.videoId}/hqdefault.jpg`,
      status: 'Found',
      youtubeVideoId: chosen.videoId,
    };
  } catch (error: any) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error fetching episode ${ep} for ${title}:`, message);
    return {
      episodeNumber: ep,
      title: `الحلقة ${ep} - خطأ في البحث`,
      link: '#',
      duration: 0,
      thumbnail: `https://placehold.co/480x360.png?text=Error`,
      status: 'Error',
    };
  }
}
