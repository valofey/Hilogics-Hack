import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Loader2, ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type ProductFormValues = {
  productName: string;
  tnVedCode: string;
};

type ProductFormProps = {
  loading?: boolean;
  onSubmit: (values: ProductFormValues) => void;
  error?: string | null;
};

export function ProductForm({ loading, onSubmit, error }: ProductFormProps) {
  const [values, setValues] = useState<ProductFormValues>({
    productName: '',
    tnVedCode: ''
  });

  const handleChange =
    (field: keyof ProductFormValues) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setValues((prev) => ({
        ...prev,
        [field]: event.target.value
      }));
    };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!values.productName.trim() || !values.tnVedCode.trim()) {
      return;
    }
    onSubmit({
      productName: values.productName.trim(),
      tnVedCode: values.tnVedCode.trim()
    });
  };

  return (
    <Card className="border border-slate-200 shadow-lg">
      <CardContent className="p-8">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="product-name" className="text-sm font-medium text-slate-700">
              Наименование товара
            </Label>
            <Input
              id="product-name"
              placeholder="Например, санитарно-гигиенические изделия"
              value={values.productName}
              onChange={handleChange('productName')}
              disabled={loading}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tn-ved" className="text-sm font-medium text-slate-700">
              Код ТН ВЭД
            </Label>
            <Input
              id="tn-ved"
              placeholder="Например, 8472.90.100.00"
              value={values.tnVedCode}
              onChange={handleChange('tnVedCode')}
              disabled={loading}
              required
            />
          </div>
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
          ) : null}
          <Button
            type="submit"
            disabled={loading}
            className="h-11 w-full gap-2 rounded-xl bg-sky-600 text-base font-semibold text-white shadow-lg transition hover:bg-sky-700"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Формируем отчёт…
              </>
            ) : (
              <>
                Сформировать отчёт
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
