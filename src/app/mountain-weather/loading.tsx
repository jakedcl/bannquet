import PageWrapper from '@/components/ui/PageWrapper';

export default function MountainWeatherLoading() {
  return (
    <PageWrapper className="hub">
      <div className="mx-auto max-w-5xl space-y-6 px-4 pb-12 pt-6 md:pt-10" aria-busy="true" aria-label="Loading the forecast">
        <div className="h-10 w-64 animate-pulse rounded-xl bg-ui-fill" />
        <div className="h-36 animate-pulse rounded-[14px] bg-ui-fill" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-64 animate-pulse rounded-[14px] bg-ui-fill" />
          <div className="h-64 animate-pulse rounded-[14px] bg-ui-fill" />
        </div>
      </div>
    </PageWrapper>
  );
}
