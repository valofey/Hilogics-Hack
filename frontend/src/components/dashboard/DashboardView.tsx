import { useEffect, useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { ArrowLeft, CalendarClock, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TariffCard } from '@/components/dashboard/TariffCard';
import { MetricTrendCard } from '@/components/dashboard/MetricTrendCard';
import { WorldMapCard } from '@/components/dashboard/WorldMapCard';
import { RecommendationsPanel } from '@/components/dashboard/RecommendationsPanel';
import { NextStepsCard } from '@/components/dashboard/NextStepsCard';
import { PdfReport } from '@/components/dashboard/PdfReport';
import type { DashboardData, OrganizationInfo } from '@/types/dashboard';

const PLACEHOLDER_ORGANIZATION_NAME = 'Организация не указана';

type DashboardViewProps = {
  data: DashboardData;
  onRequestOrganizationUpdate: (organization: OrganizationInfo) => Promise<DashboardData | null>;
  processing?: boolean;
  onReset: () => void;
};

type ShareMode = 'pdf' | 'link';

export function DashboardView({ data, onRequestOrganizationUpdate, processing, onReset }: DashboardViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [shareMode, setShareMode] = useState<ShareMode | null>(null);
  const [organization, setOrganization] = useState<OrganizationInfo>(data.organization);
  const [shareLink, setShareLink] = useState<string | null>(data.share_url ?? null);
  const [localLoading, setLocalLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [pdfData, setPdfData] = useState<DashboardData | null>(null);
  const [pdfTimestamp, setPdfTimestamp] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [viewTimestamp, setViewTimestamp] = useState(() => new Date());
  const pdfRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOrganization(data.organization);
    setShareLink(data.share_url ?? null);
    setViewTimestamp(new Date());
  }, [data]);

  const allMetricPoints = useMemo(() => {
    return [...data.metrics.import_data, ...data.metrics.production, ...data.metrics.consumption];
  }, [data.metrics]);

  const globalMetricDomain = useMemo(() => {
    if (!allMetricPoints.length) {
      return [0, 1] as const;
    }
    const values = allMetricPoints.map((point) => point.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (min === max) {
      return [min - 1, max + 1] as const;
    }
    const padding = (max - min) * 0.1;
    return [Math.max(0, min - padding), max + padding] as const;
  }, [allMetricPoints]);

  const metricsConfig = useMemo(
    () => [
      {
        title: 'Импорт',
        subtitle: 'Внешние поставки товара',
        data: data.metrics.import_data,
        color: { stroke: '#2563eb', fill: '#3b82f6', gradientId: 'import' }
      },
      {
        title: 'Производство',
        subtitle: 'Российский выпуск',
        data: data.metrics.production,
        color: { stroke: '#f97316', fill: '#fb923c', gradientId: 'production' }
      },
      {
        title: 'Потребление',
        subtitle: 'Спрос на рынке',
        data: data.metrics.consumption,
        color: { stroke: '#14b8a6', fill: '#2dd4bf', gradientId: 'consumption' }
      }
    ],
    [data.metrics]
  );

  const organizationIsProvided = useMemo(() => {
    const name = organization?.name?.trim() ?? '';
    return Boolean(name) && name !== PLACEHOLDER_ORGANIZATION_NAME;
  }, [organization?.name]);

  const formattedTimestamp = useMemo(
    () =>
      new Intl.DateTimeFormat('ru-RU', {
        dateStyle: 'long',
        timeStyle: 'short'
      }).format(viewTimestamp),
    [viewTimestamp]
  );

  const handleAction = async (mode: ShareMode) => {
    setNotification(null);

    if (!organizationIsProvided) {
      setShareMode(mode);
      setIsModalOpen(true);
      return;
    }

    if (mode === 'link') {
      await ensureShareLinkAndCopy();
      return;
    }

    await handleGeneratePdf(getDatasetForExport());
  };

  const ensureShareLinkAndCopy = async (initialLink?: string | null) => {
    try {
      let link = initialLink ?? shareLink ?? data.share_url ?? null;
      if (!link) {
        const updated = await onRequestOrganizationUpdate(organization);
        if (updated) {
          link = updated.share_url ?? null;
          setShareLink(link);
          setOrganization(updated.organization);
        }
      }
      if (link) {
        await navigator.clipboard.writeText(link);
        setNotification({
          type: 'success',
          message: 'Ссылка скопирована в буфер обмена'
        });
      } else {
        throw new Error('Не удалось получить ссылку');
      }
    } catch (error) {
      setNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Не удалось скопировать ссылку'
      });
    }
  };

  const getDatasetForExport = (): DashboardData => ({
    ...data,
    organization,
    share_url: shareLink ?? data.share_url
  });

  const preparePdf = async (dashboard: DashboardData, generatedAt: Date) => {
    setPdfData(dashboard);
    setPdfTimestamp(generatedAt.toISOString());
    if (dashboard.share_url) {
      const qr = await QRCode.toDataURL(dashboard.share_url, { width: 400, margin: 2 });
      setQrCode(qr);
    } else {
      setQrCode(null);
    }
    await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
  };

  const handleGeneratePdf = async (dataset: DashboardData) => {
    const generatedAt = new Date();
    await preparePdf(dataset, generatedAt);

    if (!pdfRef.current) {
      throw new Error('Не удалось подготовить PDF-отчёт');
    }

    await new Promise((resolve) => setTimeout(resolve, 120));
    const canvas = await html2canvas(pdfRef.current, { scale: 2, backgroundColor: '#ffffff' });
    const imageData = canvas.toDataURL('image/png', 1);
    const pdf = new jsPDF('portrait', 'pt', 'a4');
    const width = pdf.internal.pageSize.getWidth();
    const height = (canvas.height * width) / canvas.width;
    pdf.addImage(imageData, 'PNG', 0, 0, width, height);

    if (height > pdf.internal.pageSize.getHeight()) {
      const remainingHeight = height - pdf.internal.pageSize.getHeight();
      if (remainingHeight > 0) {
        const secondPageCanvas = document.createElement('canvas');
        secondPageCanvas.width = canvas.width;
        secondPageCanvas.height = remainingHeight;
        const context = secondPageCanvas.getContext('2d');
        if (context) {
          context.drawImage(
            canvas,
            0,
            canvas.height - remainingHeight,
            canvas.width,
            remainingHeight,
            0,
            0,
            canvas.width,
            remainingHeight
          );
          pdf.addPage();
          const secondImage = secondPageCanvas.toDataURL('image/png', 1);
          pdf.addImage(secondImage, 'PNG', 0, 0, width, (remainingHeight * width) / canvas.width);
        }
      }
    }

    pdf.save(`mosprom-report-${dataset.product.code}.pdf`);
  };

  const handleSubmitOrganization = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!shareMode) {
      return;
    }

    setLocalLoading(true);
    setNotification(null);

    try {
      const updated = await onRequestOrganizationUpdate(organization);
      const dataset = updated ?? getDatasetForExport();
      setShareLink(dataset.share_url ?? null);
      setIsModalOpen(false);

      if (updated) {
        setOrganization(updated.organization);
      }

      if (shareMode === 'link') {
        await ensureShareLinkAndCopy(dataset.share_url ?? null);
      } else {
        await handleGeneratePdf(dataset);
        setNotification({
          type: 'success',
          message: 'PDF-отчёт сохранён'
        });
      }
    } catch (error) {
      setNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Не удалось обновить данные организации'
      });
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-100 pb-16">
      <div className="mx-auto max-w-[1400px] px-6 py-10 lg:px-10">
        <header className="rounded-3xl border border-white/60 bg-white/80 p-8 shadow-xl backdrop-blur">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <Button variant="ghost" size="sm" className="h-9 w-fit gap-2 border border-slate-200" onClick={onReset}>
                <ArrowLeft className="h-4 w-4" />
                Новый отчёт
              </Button>
              <div>
                <p className="text-sm text-sky-600">Аналитический отчёт MOSPROM</p>
                <h1 className="mt-2 text-3xl font-semibold text-slate-900 sm:text-4xl">{data.product.name}</h1>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                <span className="rounded-full bg-sky-100 px-3 py-1 font-medium text-sky-700">
                  Код ТН ВЭД · {data.product.code}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1">
                  <CalendarClock className="h-4 w-4 text-slate-500" />
                  Обновлено {formattedTimestamp}
                </span>
              </div>
              <p className="max-w-2xl text-sm text-slate-600">
                В отчёт входят динамика импорта, производства и потребления, сравнение тарифов, география поставок и
                рекомендуемые меры поддержки.
              </p>
            </div>

            {organizationIsProvided ? (
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 text-left shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">Организация</p>
                <p className="mt-2 text-base font-semibold text-slate-900">{organization.name}</p>
                {organization.inn ? <p className="text-xs text-slate-500">ИНН: {organization.inn}</p> : null}
              </div>
            ) : null}
          </div>
        </header>

        <section className="mt-10 grid gap-6 lg:grid-cols-4">
          {metricsConfig.map((metric) => (
            <MetricTrendCard
              key={metric.title}
              title={metric.title}
              subtitle={metric.subtitle}
              data={metric.data}
              color={metric.color}
              domain={globalMetricDomain}
            />
          ))}
          <TariffCard tariffs={data.tariffs} />
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <WorldMapCard geography={data.geography} prices={data.prices} />
          <NextStepsCard
            loading={localLoading || processing}
            organizationReady={organizationIsProvided}
            shareLink={shareLink ?? data.share_url ?? null}
            onAction={handleAction}
          />
        </section>

        <section className="mt-10">
          <RecommendationsPanel recommendations={data.recommendations} />
        </section>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Контактные данные организации</DialogTitle>
            <DialogDescription>
              Укажите актуальное наименование и ИНН, чтобы поделиться отчётом с экспертом MOSPROM.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmitOrganization}>
            <div className="space-y-2">
              <Label htmlFor="org-name">Организация</Label>
              <Input
                id="org-name"
                placeholder="АО «Компания»"
                value={organization.name === PLACEHOLDER_ORGANIZATION_NAME ? '' : organization.name}
                onChange={(event) =>
                  setOrganization((prev) => ({
                    ...prev,
                    name: event.target.value
                  }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-inn">ИНН (при наличии)</Label>
              <Input
                id="org-inn"
                placeholder="1234567890"
                value={organization.inn ?? ''}
                onChange={(event) =>
                  setOrganization((prev) => ({
                    ...prev,
                    inn: event.target.value.trim() ? event.target.value : null
                  }))
                }
              />
            </div>
            <Button
              type="submit"
              className="h-11 w-full gap-2 rounded-xl bg-sky-600 text-white hover:bg-sky-700"
              disabled={localLoading}
            >
              {localLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Сохранить и продолжить
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <div
        ref={pdfRef}
        style={{
          position: 'absolute',
          left: '-10000px',
          top: 0
        }}
      >
        {pdfData ? <PdfReport data={pdfData} qrCode={qrCode} generatedAt={pdfTimestamp ?? undefined} /> : null}
      </div>

      {notification ? (
        <div className="fixed bottom-6 right-6 z-50">
          <div
            className={`rounded-2xl px-4 py-3 text-sm font-medium shadow-lg ${
              notification.type === 'success'
                ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border border-rose-200 bg-rose-50 text-rose-600'
            }`}
          >
            {notification.message}
          </div>
        </div>
      ) : null}
    </div>
  );
}
