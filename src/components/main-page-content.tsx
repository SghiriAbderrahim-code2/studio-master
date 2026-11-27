
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Episode } from '@/types';
import { CartoonForm } from '@/components/cartoon-form';
import { EpisodeList } from '@/components/episode-list';
import { ActionButtons } from '@/components/action-buttons';
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { fetchSingleEpisodeDetails } from '@/app/actions';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Square, TvMinimalPlay } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { MAX_EPISODES_PER_REQUEST } from '@/lib/utils';

export function MainPageContent() {
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [currentCartoonTitle, setCurrentCartoonTitle] = useState<string>('');
  const [currentStartEpisode, setCurrentStartEpisode] = useState<number>(0);
  const [currentEndEpisode, setCurrentEndEpisode] = useState<number>(0);
  const [isFetching, setIsFetching] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Ref mirror of isFetching so the fetch loop can react immediately to a stop request.
  const isFetchingRef = useRef(isFetching);
  useEffect(() => {
    isFetchingRef.current = isFetching;
  }, [isFetching]);

  // Always-fresh snapshot of episodes, so reload never works from a stale copy.
  const episodesRef = useRef<Episode[]>(episodes);
  useEffect(() => {
    episodesRef.current = episodes;
  }, [episodes]);

  const initializeEpisodes = (start: number, end: number): Episode[] => {
    const count = end - start + 1;
    return Array.from({ length: count }, (_, i) => ({
      episodeNumber: start + i,
      title: `الحلقة ${start + i}`,
      link: '#',
      duration: 0,
      thumbnail: `https://placehold.co/480x360.png?text=Pending+${start + i}`,
      dataAihint: "video placeholder",
      status: 'Pending' as const,
    }));
  };

  const handleStopFetching = useCallback(() => {
    isFetchingRef.current = false;
    setIsFetching(false);
    toast({ title: "تم إيقاف البحث", description: "سيتم إيقاف جلب الحلقات بعد انتهاء الطلب الحالي.", variant: "default" });
  }, [toast]);

  const handleFetchEpisodes = useCallback(async (title: string, startEp: number, endEp: number) => {
    const totalEpisodesToFetch = endEp - startEp + 1;
    if (totalEpisodesToFetch <= 0) {
      toast({ title: "نطاق غير صالح", description: "يجب أن يكون عدد الحلقات أكبر من صفر.", variant: "destructive" });
      return;
    }
    if (totalEpisodesToFetch > MAX_EPISODES_PER_REQUEST) {
      toast({
        title: "النطاق كبير جدًا",
        description: `الحد الأقصى ${MAX_EPISODES_PER_REQUEST} حلقة في العملية الواحدة. يرجى تقسيم الطلب.`,
        variant: "destructive",
      });
      return;
    }

    setIsFetching(true);
    isFetchingRef.current = true;
    setError(null);
    setOverallProgress(0);
    setCurrentCartoonTitle(title);
    setCurrentStartEpisode(startEp);
    setCurrentEndEpisode(endEp);

    const initialEpisodes = initializeEpisodes(startEp, endEp);
    setEpisodes(initialEpisodes);

    const updatedEpisodes: Episode[] = [...initialEpisodes];
    let stopped = false;
    let failedCount = 0;

    for (let i = 0; i < totalEpisodesToFetch; i++) {
      if (!isFetchingRef.current) {
        stopped = true;
        break;
      }

      const currentEpisodeNumber = startEp + i;
      const episodeIndex = updatedEpisodes.findIndex(ep => ep.episodeNumber === currentEpisodeNumber);
      if (episodeIndex === -1) continue;

      updatedEpisodes[episodeIndex] = { ...updatedEpisodes[episodeIndex], status: 'Searching...', dataAihint: "video placeholder" };
      setEpisodes([...updatedEpisodes]);

      try {
        const fetchedEpisode = await fetchSingleEpisodeDetails(title, currentEpisodeNumber);
        updatedEpisodes[episodeIndex] = fetchedEpisode;
        if (fetchedEpisode.status === 'Error') {
          failedCount++;
          toast({
            title: "خطأ في جلب حلقة",
            description: `الحلقة ${currentEpisodeNumber}: ${fetchedEpisode.title}`,
            variant: "destructive",
          });
        }
      } catch (e: any) {
        console.error(`Error processing episode ${currentEpisodeNumber} in MainPageContent:`, e);
        failedCount++;
        updatedEpisodes[episodeIndex] = {
          ...updatedEpisodes[episodeIndex],
          title: `الحلقة ${currentEpisodeNumber} - خطأ فادح في النظام`,
          status: 'Error',
          thumbnail: `https://placehold.co/480x360.png?text=Error+${currentEpisodeNumber}`,
          dataAihint: "error placeholder",
        };
        toast({
          title: "خطأ غير متوقع",
          description: `حدث خطأ فادح أثناء محاولة جلب الحلقة ${currentEpisodeNumber}.`,
          variant: "destructive",
        });
      }
      setEpisodes([...updatedEpisodes]);
      setOverallProgress(((i + 1) / totalEpisodesToFetch) * 100);
    }

    isFetchingRef.current = false;
    setIsFetching(false);

    if (stopped) {
      const foundCount = updatedEpisodes.filter(ep => ep.status === 'Found').length;
      toast({
        title: "تم إيقاف البحث",
        description: `تم العثور على ${foundCount} حلقة قبل الإيقاف.`,
      });
      return;
    }

    if (failedCount > 0) {
      setError(`تعذّر جلب ${failedCount} من أصل ${totalEpisodesToFetch} حلقة. يمكنك إعادة المحاولة لاحقًا.`);
    }

    const foundCount = updatedEpisodes.filter(ep => ep.status === 'Found').length;
    toast({
      title: "اكتمل البحث!",
      description: `تم العثور على ${foundCount} من أصل ${totalEpisodesToFetch} حلقة.`,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]);

  useEffect(() => {
    const titleFromQuery = searchParams.get('title');
    const startFromQuery = searchParams.get('startEpisode');
    const endFromQuery = searchParams.get('endEpisode');

    if (titleFromQuery && startFromQuery && endFromQuery && !isFetchingRef.current && episodes.length === 0) {
      const startEp = parseInt(startFromQuery);
      const endEp = parseInt(endFromQuery);
      if (startEp > 0 && endEp > 0 && endEp >= startEp) {
        handleFetchEpisodes(titleFromQuery, startEp, endEp);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, handleFetchEpisodes]);


  const handleReloadEpisode = useCallback(async (episodeNumber: number) => {
    const currentEpisodes = episodesRef.current;
    const originalEpisode = currentEpisodes.find(ep => ep.episodeNumber === episodeNumber);

    if (!originalEpisode || !currentCartoonTitle) {
      toast({ title: "خطأ", description: "لا يمكن إعادة تحميل الحلقة، معلومات غير كافية.", variant: "destructive" });
      return;
    }

    // Functional update: never clobber newer state from a stale copy.
    setEpisodes(prev => prev.map(ep =>
      ep.episodeNumber === episodeNumber
        ? {
            ...ep,
            status: 'Searching...' as const,
            thumbnail: `https://placehold.co/480x360.png?text=Reloading+${episodeNumber}`,
            dataAihint: "video placeholder reloading",
          }
        : ep
    ));

    try {
      const fetchedEpisode = await fetchSingleEpisodeDetails(currentCartoonTitle, episodeNumber);
      setEpisodes(prev => prev.map(ep =>
        ep.episodeNumber === episodeNumber ? fetchedEpisode : ep
      ));

      if (fetchedEpisode.status === 'Error') {
        toast({
          title: "خطأ في إعادة تحميل الحلقة",
          description: `الحلقة ${episodeNumber}: ${fetchedEpisode.title}`,
          variant: "destructive",
        });
      } else if (fetchedEpisode.status === 'Found') {
        toast({
          title: "اكتملت إعادة المحاولة",
          description: `تم العثور على الحلقة ${episodeNumber}.`,
        });
      } else {
        toast({
          title: "لم يتم العثور",
          description: `لم يتم العثور على فيديو مناسب للحلقة ${episodeNumber} بعد إعادة المحاولة.`,
          variant: "default",
        });
      }
    } catch (e: any) {
      console.error(`Error reloading episode ${episodeNumber} in MainPageContent:`, e);
      setEpisodes(prev => prev.map(ep =>
        ep.episodeNumber === episodeNumber
          ? {
              ...originalEpisode,
              status: 'Error' as const,
              title: `الحلقة ${episodeNumber} - خطأ فادح في النظام`,
              thumbnail: `https://placehold.co/480x360.png?text=Error+${episodeNumber}`,
              dataAihint: "error placeholder",
            }
          : ep
      ));
      toast({
        title: "خطأ غير متوقع",
        description: `حدث خطأ فادح أثناء محاولة إعادة تحميل الحلقة ${episodeNumber}.`,
        variant: "destructive",
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCartoonTitle, toast]);


  return (
    <div className="container mx-auto px-4 py-8 min-h-screen flex flex-col items-center">
      <header className="mb-12 text-center">
        <h1 className="text-5xl font-headline font-bold text-primary flex items-center justify-center">
          <TvMinimalPlay className="mr-3 h-12 w-12 text-accent" />
          Youtube Episodes Finder
        </h1>
        <p className="text-xl text-muted-foreground mt-2">
          أوجد حلقات كرتونك المفضلة بسهولة وسرعة!
        </p>
      </header>

      <CartoonForm onFetchEpisodes={handleFetchEpisodes} isFetching={isFetching} />

      {isFetching && (
        <div className="w-full max-w-2xl mt-8">
          <Progress value={overallProgress} className="w-full h-4 rounded-full" />
          <div className="flex items-center justify-between mt-2 gap-4">
            <p className="text-sm text-muted-foreground">
              جاري معالجة الحلقات... {Math.round(overallProgress)}%
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleStopFetching}
              className="shrink-0"
            >
              <Square className="mr-2 h-3 w-3 fill-current" />
              إيقاف البحث
            </Button>
          </div>
        </div>
      )}

      {error && !isFetching && (
        <Alert variant="destructive" className="mt-8 w-full max-w-2xl">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>خطأ عام</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {episodes.length > 0 && (
        <section className="mt-12 w-full">
          <h2 className="text-3xl font-headline font-semibold mb-6 text-center">نتائج البحث عن "{currentCartoonTitle}" (الحلقات {currentStartEpisode} - {currentEndEpisode})</h2>
          <EpisodeList episodes={episodes} onReloadEpisode={handleReloadEpisode} isFetching={isFetching} />
          <ActionButtons
            episodes={episodes}
            cartoonTitle={currentCartoonTitle}
            startEpisode={currentStartEpisode}
            endEpisode={currentEndEpisode}
            isFetching={isFetching}
          />
        </section>
      )}

      {!isFetching && episodes.length === 0 && !error && (
        <div className="mt-12 text-center text-muted-foreground">
          <TvMinimalPlay className="mx-auto h-16 w-16 mb-4 text-gray-400" />
          <p className="text-lg">أدخل اسم الكرتون ونطاق الحلقات لبدء البحث.</p>
          <p className="text-sm">يمكنك أيضًا استخدام رابط مشارَك للبدء مباشرة.</p>
        </div>
      )}
      <footer className="mt-16 pt-8 border-t w-full max-w-5xl text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Youtube Episodes Finder. جميع الحقوق محفوظة.</p>
        <p className="mt-1">تم التطوير بحب لمشاهدة الكرتون بدون انقطاع.</p>
      </footer>
    </div>
  );
}
