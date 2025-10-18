import { motion } from 'framer-motion';

import { ProductForm } from '@/components/landing/ProductForm';
import { Badge } from '@/components/ui/badge';

type LandingHeroProps = React.ComponentProps<typeof ProductForm>;

export function LandingHero(props: LandingHeroProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 py-16">
        <motion.header
          className="flex max-w-2xl flex-col items-center text-center"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Badge className="mb-4 bg-sky-100 text-sky-700">MOSPROM · Аналитический сервис</Badge>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Получите консолидированный отчёт по внешнеторговым данным
          </h1>
          <p className="mt-4 text-base text-slate-600 sm:text-lg">
            Введите наименование и код ТН ВЭД — и мы соберём ключевые показатели, структуру импорта и рекомендации по
            мерам поддержки в одном интерфейсе.
          </p>
        </motion.header>

        <motion.div
          className="mt-10 w-full max-w-xl"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
        >
          <ProductForm {...props} />
        </motion.div>
      </div>
    </div>
  );
}
