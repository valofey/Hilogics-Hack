import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Share2, FileText, PhoneCall } from 'lucide-react';

type NextStepsCardProps = {
  onAction: (mode: 'pdf' | 'link') => void;
  loading?: boolean;
  shareLink?: string | null;
  organizationReady: boolean;
};

export function NextStepsCard({ onAction, loading, shareLink, organizationReady }: NextStepsCardProps) {
  const linkButtonLabel = organizationReady ? 'Скопировать ссылку' : 'Получить ссылку';

  return (
    <Card className="flex h-full flex-col border border-slate-200 bg-white shadow-lg">
      <CardHeader className="space-y-3">
        <CardTitle className="flex items-start justify-between text-lg font-semibold text-slate-900">
          <span>Следующие шаги</span>
          <Badge className="bg-sky-100 text-sky-700">MOSPROM</Badge>
        </CardTitle>
        <p className="flex items-center gap-2 text-sm text-slate-600">
          <PhoneCall className="h-4 w-4 text-sky-500" />
          Свяжитесь с экспертом MOSPROM, чтобы обсудить меры поддержки и подготовить решение.
        </p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-1">
          <Button
            className="h-12 gap-2 rounded-xl bg-sky-600 text-base font-semibold text-white shadow-lg transition hover:bg-sky-700"
            onClick={() => onAction('pdf')}
            disabled={loading}
          >
            <FileText className="h-5 w-5" />
            Скачать PDF-отчёт
          </Button>
          <Button
            variant="secondary"
            className="h-12 gap-2 rounded-xl border border-slate-200 bg-white text-base font-semibold text-slate-700 shadow transition hover:bg-slate-50"
            onClick={() => onAction('link')}
            disabled={loading}
          >
            <Share2 className="h-5 w-5" />
            {linkButtonLabel}
          </Button>
        </div>

        {shareLink ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-xs text-slate-600">
            <p className="mb-1 font-semibold text-slate-700">Ссылка на веб-версию отчёта</p>
            <p className="truncate">{shareLink}</p>
          </div>
        ) : null}

        <p className="mt-auto text-xs text-slate-500">
          После отправки контактных данных для организации можно повторно скачивать PDF-отчёт и мгновенно копировать
          ссылку без повторного заполнения формы.
        </p>
      </CardContent>
    </Card>
  );
}
