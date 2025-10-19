import type { FormEvent } from 'react';
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
import { RecommendationsPanel } from '@/components/dashboard/RecommendationsPanel2';
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
        subtitle: 'Объёмы поставок в Россию',
        data: data.metrics.import_data,
        color: { stroke: '#2563eb', fill: '#3b82f6', gradientId: 'import' }
      },
      {
        title: 'Производство',
        subtitle: 'Отечественный выпуск',
        data: data.metrics.production,
        color: { stroke: '#f97316', fill: '#fb923c', gradientId: 'production' }
      },
      {
        title: 'Потребление',
        subtitle: 'Спрос на внутреннем рынке',
        data: data.metrics.consumption,
        color: { stroke: '#14b8a6', fill: '#2dd4bf', gradientId: 'consumption' }
      }
    ],
    [data.metrics]
  );

  const organizationIsProvided = useMemo(() => {
    const name = organization?.name?.trim() ?? '';
    const inn = organization?.inn?.toString().trim() ?? '';
    // Ask for company name and INN before sharing or downloading
    return Boolean(name) && name !== PLACEHOLDER_ORGANIZATION_NAME && Boolean(inn);
  }, [organization?.name, organization?.inn]);

  const formattedTimestamp = useMemo(
    () =>
      new Intl.DateTimeFormat('ru-RU', {
        dateStyle: 'long',
        timeStyle: 'short'
      }).format(viewTimestamp),
    [viewTimestamp]
  );

  const productDescription = data.product.description?.trim() ?? '';

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
        setNotification({ type: 'success', message: 'Ссылка скопирована в буфер обмена' });
        return link;
      }
      throw new Error('Не удалось сформировать ссылку');
    } catch (error) {
      setNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Не удалось получить ссылку'
      });
      return null;
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
          context.drawImage(canvas, 0, canvas.height - remainingHeight, canvas.width, remainingHeight, 0, 0, canvas.width, remainingHeight);
          const secondImage = secondPageCanvas.toDataURL('image/png', 1);
          pdf.addPage();
          pdf.addImage(secondImage, 'PNG', 0, 0, width, (remainingHeight * width) / canvas.width);
        }
      }
    }

    const safeStamp = generatedAt
      .toISOString()
      .replaceAll(':', '-')
      .replaceAll('.', '-');
    pdf.save(`mosprom-report-${safeStamp}.pdf`);
    setNotification({ type: 'success', message: 'PDF-отчёт сохранён' });
  };

  const handleSubmitOrganization = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = (formData.get('org-name') as string).trim();
    const inn = (formData.get('org-inn') as string).trim();

    if (!name) {
      return;
    }

    setLocalLoading(true);
    setNotification(null);

    try {
      const updated = await onRequestOrganizationUpdate({ name, inn: inn || null });
      if (updated) {
        setOrganization(updated.organization);
        setShareLink(updated.share_url ?? null);
        if (shareMode === 'link') {
          await ensureShareLinkAndCopy(updated.share_url ?? null);
        } else if (shareMode === 'pdf') {
          await handleGeneratePdf(updated);
        }
      }
    } catch (error) {
      setNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Не удалось обновить данные организации'
      });
    } finally {
      setLocalLoading(false);
      setIsModalOpen(false);
      setShareMode(null);
    }
  };

  return (
    <div className="relative min-h-screen bg-white pb-16">
      <div className="mx-auto w-full max-w-6xl px-6 py-12">
        <header className="border border-black bg-white p-8">
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-fit gap-2 border border-black bg-white text-black"
                onClick={onReset}
              >
                <ArrowLeft className="h-4 w-4" />
                Новый запрос
              </Button>
              <span className="inline-flex items-center gap-2 border border-black bg-white px-3 py-1 text-xs font-medium uppercase tracking-wide">
                <CalendarClock className="h-4 w-4 text-slate-500" />
                Обновлено {formattedTimestamp}
              </span>
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
                {data.product.name}
              </h1>
              {productDescription ? (
                <p className="max-w-3xl text-sm text-slate-700 sm:text-base">
                  <strong>
                    {`Код ТН ВЭД ${data.product.display_code ?? data.product.code}`}
                  </strong>
                  {`: ${productDescription}`}
                </p>
              ) : null}
            </div>
          </div>
        </header>

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <TariffCard tariffs={data.tariffs} className="h-full" />
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
        </section>

        <section className="mt-8">
          <WorldMapCard geography={data.geography} prices={data.prices} />
        </section>

        <section className="mt-8">
          <RecommendationsPanel recommendations={data.recommendations} />
        </section>

        <section className="mt-8">
          <NextStepsCard
            loading={localLoading || processing}
            organizationReady={organizationIsProvided}
            shareLink={shareLink ?? data.share_url ?? null}
            onAction={handleAction}
          />
        </section>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Уточните организацию</DialogTitle>
            <DialogDescription>
              Укажите юридическое лицо и ИНН — эти данные попадут в отчёт и пригодятся для индивидуальных рекомендаций.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmitOrganization}>
            <div className="space-y-2">
              <Label htmlFor="org-name">Название компании</Label>
              <Input
                id="org-name"
                name="org-name"
                placeholder="Например, АО «Компания»"
                defaultValue={organization.name === PLACEHOLDER_ORGANIZATION_NAME ? '' : organization.name}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-inn">ИНН (опционально)</Label>
              <Input id="org-inn" name="org-inn" placeholder="1234567890" defaultValue={organization.inn ?? ''} />
            </div>
            <Button type="submit" className="w-full gap-2 normal-case" disabled={localLoading}>
              {localLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Сохранить данные и продолжить
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
          <div className="border border-black bg-white px-4 py-3 text-sm font-medium text-slate-900">
            {notification.message}
          </div>
        </div>
      ) : null}
    </div>
  );
}
