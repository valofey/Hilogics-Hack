import type { ComponentProps } from 'react';
import { motion } from 'framer-motion';

import { ProductForm } from '@/components/landing/ProductForm';
import { Badge } from '@/components/ui/badge';

type LandingHeroProps = ComponentProps<typeof ProductForm>;

export function LandingHero(props: LandingHeroProps) {
  return (
    <div className="bg-[#141414] text-white">
      <div className="mx-auto flex min-h-[calc(100vh-120px)] w-full max-w-6xl flex-col justify-center px-6 py-16 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="grid gap-12 md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] md:items-start"
        >
          <div className="flex flex-col gap-6 text-white">
            <Badge className="w-fit border border-white bg-transparent text-xs uppercase tracking-wide text-white">
              Аналитика MOSPROM для экспорта
            </Badge>
            <h1 className="text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
              Точечная аналитика, которая помогает защитить потенциал продукта на внешних рынках
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-slate-200 md:text-lg">
              Введите код ТН ВЭД и получите готовую справку: динамику импорта, действующие тарифы, ключевые страны
              поставок и список мер поддержки. Всё в одном месте — без ручного свода данных.
            </p>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="w-full"
          >
            <ProductForm {...props} />
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
