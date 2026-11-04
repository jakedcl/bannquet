import PageWrapper from '@/components/ui/PageWrapper';

export default function MountainWeatherLoading() {
  return (
    <PageWrapper className="hub">
      <div className="mx-auto max-w-5xl space-y-5 px-4 pb-12 pt-6 md:pt-8" aria-busy="true" aria-label="Loading the forecast">
        <div className="h-10 w-64 animate-pulse bg-ui-fill" />
        <div className="h-28 animate-pulse bg-brand-green/40" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-64 animate-pulse bg-ui-fill" />
          <div className="h-64 animate-pulse bg-ui-fill" />
        </div>
      </div>
    </PageWrapper>
  );
}
