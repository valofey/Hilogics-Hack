import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { Loader2, ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import type { TnvedItem } from '@/types/dashboard';

let tnvedCache: TnvedItem[] | null = null;
let tnvedListPromise: Promise<TnvedItem[]> | null = null;
const DEFAULT_PRODUCT_NAME = 'Товар для проверки';

type ProductFormState = {
  productName: string;
  tnVedCode: string;
};

type ProductFormSubmitValues = {
  productName: string;
  tnVedCode: string;
  tnVedDisplayCode: string;
  tnVedDescription: string | null;
};

type ProductFormProps = {
  loading?: boolean;
  onSubmit: (values: ProductFormSubmitValues) => void;
  error?: string | null;
};

export function ProductForm({ loading, onSubmit, error }: ProductFormProps) {
  const [values, setValues] = useState<ProductFormState>({
    productName: '',
    tnVedCode: ''
  });
  const [tnvedItems, setTnvedItems] = useState<TnvedItem[]>(() => tnvedCache ?? []);
  const [tnvedLoading, setTnvedLoading] = useState(!tnvedCache);
  const [isCodeFocused, setIsCodeFocused] = useState(false);
  const [selectedDescription, setSelectedDescription] = useState<string>('');

  useEffect(() => {
    let isActive = true;

    if (tnvedCache) {
      setTnvedItems(tnvedCache);
      setTnvedLoading(false);
      return () => {
        isActive = false;
      };
    }

    setTnvedLoading(true);

    if (!tnvedListPromise) {
      tnvedListPromise = api
        .getTnvedList()
        .then((items) => {
          tnvedCache = items;
          return items;
        })
        .finally(() => {
          tnvedListPromise = null;
        });
    }

    tnvedListPromise
      ?.then((items) => {
        if (isActive) {
          setTnvedItems(items);
        }
      })
      .catch((fetchError) => {
        if (isActive) {
          console.error('Failed to load TN VED list', fetchError);
        }
      })
      .finally(() => {
        if (isActive) {
          setTnvedLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!values.tnVedCode) {
      return;
    }
    const normalizedValue = values.tnVedCode.replace(/[.\s]/g, '').toLowerCase();
    const matchedItem = tnvedItems.find(
      (item) => item.code.replace(/[.\s]/g, '').toLowerCase() === normalizedValue
    );
    if (matchedItem) {
      setSelectedDescription(matchedItem.description);
    }
  }, [tnvedItems, values.tnVedCode]);

  const tnvedQuery = values.tnVedCode.trim();
  const tnvedSuggestions = useMemo(() => {
    if (!tnvedQuery) {
      return [];
    }
    const normalizedQuery = tnvedQuery.replace(/[.\s]/g, '').toLowerCase();
    return tnvedItems
      .filter((item) => {
        const normalizedCode = item.code.replace(/[.\s]/g, '').toLowerCase();
        return (
          normalizedCode.includes(normalizedQuery) ||
          item.description.toLowerCase().includes(normalizedQuery)
        );
      })
      .slice(0, 8);
  }, [tnvedItems, tnvedQuery]);

  const showSuggestionDropdown = isCodeFocused && (tnvedLoading || tnvedSuggestions.length > 0);

  const handleSuggestionSelect = (item: TnvedItem) => {
    setValues((prev) => ({
      ...prev,
      tnVedCode: item.code
    }));
    setSelectedDescription(item.description);
    setIsCodeFocused(false);
  };

  const handleChange =
    (field: keyof ProductFormState) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setValues((prev) => ({
        ...prev,
        [field]: event.target.value
      }));
      if (field === 'tnVedCode') {
        const inputValue = event.target.value;
        const normalizedValue = inputValue.replace(/[.\s]/g, '').toLowerCase();
        const matchedItem = tnvedItems.find(
          (item) => item.code.replace(/[.\s]/g, '').toLowerCase() === normalizedValue
        );
        setSelectedDescription(matchedItem ? matchedItem.description : '');
      }
    };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const sanitizedCode = values.tnVedCode.replace(/\s+/g, '');
    if (!sanitizedCode) {
      return;
    }
    const productName = values.productName.trim() || DEFAULT_PRODUCT_NAME;
    onSubmit({
      productName,
      tnVedCode: sanitizedCode,
      tnVedDisplayCode: values.tnVedCode.trim(),
      tnVedDescription: selectedDescription ? selectedDescription : null
    });
  };

  return (
    <Card>
      <CardContent className="space-y-6 p-6">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="product-name" className="text-sm font-medium uppercase">
              Название продукта
            </Label>
            <Input
              id="product-name"
              placeholder="Например, промышленный преобразователь"
              value={values.productName}
              onChange={handleChange('productName')}
              disabled={loading}
              className=""
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tn-ved" className="text-sm font-medium uppercase">
              Код ТН ВЭД
            </Label>
            <div className="relative">
              <Input
                id="tn-ved"
                placeholder="Например, 8472.90.100.00"
                value={values.tnVedCode}
                onChange={handleChange('tnVedCode')}
                onFocus={() => setIsCodeFocused(true)}
                onBlur={() => setIsCodeFocused(false)}
                disabled={loading}
                required
                autoComplete="off"
                className=""
              />
              {showSuggestionDropdown ? (
                <div className="absolute left-0 right-0 z-20 mt-2 max-h-64 border border-black bg-white">
                  {tnvedLoading ? (
                    <div className="px-3 py-2 text-sm text-slate-300">Загружаем коды...</div>
                  ) : (
                    <ul className="max-h-64 overflow-y-auto py-1">
                      {tnvedSuggestions.map((item) => (
                        <li key={item.code}>
                          <button
                            type="button"
                            className="flex w-full flex-col items-start gap-1 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-black/5 focus:bg-black/5 focus:outline-none"
                            onMouseDown={(event) => {
                              event.preventDefault();
                              handleSuggestionSelect(item);
                            }}
                          >
                            <span className="font-medium text-black">{item.code}</span>
                            <span className="text-xs text-slate-500">{item.description}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
            </div>
          </div>
          {error ? (
            <div className="border border-red-500 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>
          ) : null}
          <Button
            type="submit"
            disabled={loading}
            className="w-full gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Формируем дашборд
              </>
            ) : (
              <>
                Посмотреть аналитику
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
