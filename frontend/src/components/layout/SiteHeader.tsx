import { Button } from '@/components/ui/button';
import logo from '@/assets/mosprom_text.svg';

type SiteHeaderProps = {
  onLoginClick?: () => void;
};

export function SiteHeader({ onLoginClick }: SiteHeaderProps) {
  return (
    <header className="bg-[#141414] text-white">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 md:px-6">
        <div className="flex items-center gap-2">
          <img src={logo} alt="MOSPROM" className="h-5 w-auto" />
          <span className="text-sm font-semibold uppercase tracking-wide">МТП</span>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="border-white bg-transparent px-5 text-white hover:bg-white hover:text-black normal-case"
          onClick={onLoginClick}
        >
          Войти
        </Button>
      </div>
    </header>
  );
}
