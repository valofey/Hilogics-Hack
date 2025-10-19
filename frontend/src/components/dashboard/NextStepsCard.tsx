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
  const linkButtonLabel = organizationReady ? 'Скопировать публичную ссылку' : 'Получить ссылку после заполнения';

  return (
    <Card className="flex h-full flex-col border border-black bg-white">
      <CardHeader className="space-y-3">
        <CardTitle className="flex items-start justify-between text-lg font-semibold text-slate-900">
          <span>Возможные шаги</span>
          <Badge className="border border-black bg-white text-black">MOSPROM</Badge>
        </CardTitle>
        <p className="flex items-center gap-2 text-sm text-slate-600">
          <PhoneCall className="h-4 w-4 text-slate-900" />
          Эксперты MOSPROM помогут уточнить данные и подобрать инструменты поддержки. Подготовьте PDF или ссылку, прежде
          чем обращаться в команду.
        </p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-1">
          <Button className="h-12 gap-2 normal-case" onClick={() => onAction('pdf')} disabled={loading}>
            <FileText className="h-5 w-5" />
            Сформировать PDF-отчёт
          </Button>
          <Button
            variant="secondary"
            className="h-12 gap-2 normal-case"
            onClick={() => onAction('link')}
            disabled={loading}
          >
            <Share2 className="h-5 w-5" />
            {linkButtonLabel}
          </Button>
        </div>

        {shareLink ? (
          <div className="border border-black bg-white p-3 text-xs text-slate-600">
            <p className="mb-1 font-semibold text-slate-700">Готовая ссылка на дашборд</p>
            <p className="truncate">{shareLink}</p>
          </div>
        ) : null}

        <p className="mt-auto text-xs text-slate-500">
          Для окончательного отчёта уточните организацию и ИНН — эти данные попадут в документ и помогут ускорить
          обработку заявки на поддержку.
        </p>
      </CardContent>
    </Card>
  );
}
